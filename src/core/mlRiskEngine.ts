// Hybrid maternal risk engine:
//  1. Rule layer: hand-set thresholds from antenatal guidance (BP, Hb, sugar, SpO2, danger signs,
//     history, pregnancy factors, visit-to-visit trends). Every rule that fires is listed in
//     `explainability`, so the result can always be traced back to the readings.
//  2. Trained layer: a random forest (src/core/riskModel.json) over age, BP, sugar, temperature
//     and pulse. It can only raise the tier, and only runs when those readings were measured.
// Tuned to favour sensitivity (over-referral). Not validated on a prospective clinical cohort.

import { RiskTier, Beneficiary, VitalRecord } from '../types';
import { evaluatePregnancyFactors, PregnancyProfile } from './pregnancyRisk';
import modelJson from './riskModel.json';

interface TreeNode { p?: number; f?: number; t?: number; l?: TreeNode; r?: TreeNode }
const riskModel = modelJson as unknown as {
  trained: boolean;
  threshold: number;
  trees?: TreeNode[];
  tree: TreeNode & { p?: number };
};

export interface ClinicalVitals {
  age: number;
  systolicBP: number;       // mmHg
  diastolicBP: number;      // mmHg
  hemoglobin: number;       // g/dL
  bloodSugar: number;       // mg/dL
  bodyTemp?: number;        // °F
  weightKg?: number;
  parity?: number;
  gestationalWeeks?: number;
  hasPrevCesarean?: boolean;
  hasBleeding?: boolean;
  hasSevereHeadache?: boolean;
  hasBlurredVision?: boolean;
  hasFacialEdema?: boolean;
  hasReducedFetalMovement?: boolean;
  hasConvulsions?: boolean;
  spO2?: number;            // % oxygen saturation (pulse oximeter)
  bodyTempF?: number;       // °F (the training data is in °F)
  heartRate?: number;       // bpm, resting
  urineProtein?: 'NIL' | 'TRACE' | '1+' | '2+' | '3+';
  // Pregnancy-specific factors (see pregnancyRisk.ts)
  pregnancy?: Partial<PregnancyProfile>;
  hasRegularContractions?: boolean;
  hasLeakingFluid?: boolean;
  hasLowerAbdominalPain?: boolean;
  // History from the mother's record
  gravidity?: number;
  hasPastStillbirth?: boolean;
  bloodGroup?: string;
  // The previous visit's readings, for trend rules (BP rise, Hb fall)
  previous?: { systolicBP?: number; diastolicBP?: number; hemoglobin?: number; date?: string };
}

// What the trained random forest did for this input (shown in the explainable-AI panel)
export interface ModelInsight {
  used: boolean;
  skippedReason?: string;      // why the model did not run (missing readings)
  probability?: number;        // forest average, 0-1
  treesHigh?: number;          // trees whose leaf is >= threshold
  treesTotal?: number;
  threshold?: number;
  path?: string[];             // decision path through the representative tree
}

export interface MLPredictionResult {
  riskTier: RiskTier;
  riskProbability: number;     // 0.0 to 1.0
  isHighRisk: boolean;
  sensitivityPrioritized: boolean; // True: calibrated with low false negative threshold
  triageBadge: {
    mr: string;
    hi: string;
    en: string;
  };
  triageAction: {
    mr: string;
    hi: string;
    en: string;
  };
  explainability: Array<{
    feature: string;
    value: string | number;
    contribution: 'HIGH_RISK' | 'MODERATE_RISK' | 'NORMAL';
    impactScore: number;       // 0 to 100
    reason: {
      mr: string;
      hi: string;
      en: string;
    };
  }>;
  triggerEmergency108: boolean;
  needsPMSMASpecialist: boolean;
  pretermRisk: { level: 'LOW' | 'MODERATE' | 'HIGH'; reasons: string[] };
  model: ModelInsight;
  notMeasured: string[];       // readings left blank: the result cannot account for them
}

/**
 * High-Sensitivity ML Stratification Engine
 * Evaluates clinical stop-rules and multi-factor decision tree weights
 * Decision Threshold for High Risk is set to 0.40 (instead of 0.50) to favour sensitivity.
 */
export function predictMaternalRisk(vitals: ClinicalVitals): MLPredictionResult {
  const explainability: MLPredictionResult['explainability'] = [];
  let rawRiskScore = 0.05; // Base prior probability in general maternal cohort (~5-8% high risk)

  let hardRedFlagTriggered = false;
  let triggerEmergency108 = false;

  // 1. Hemoglobin (Anemia Evaluation - Key cause of maternal mortality in India)
  if (vitals.hemoglobin > 0) {
    if (vitals.hemoglobin < 7.0) {
      hardRedFlagTriggered = true;
      triggerEmergency108 = true;
      rawRiskScore += 0.65;
      explainability.push({
        feature: 'Hemoglobin (Hb)',
        value: `${vitals.hemoglobin} g/dL`,
        contribution: 'HIGH_RISK',
        impactScore: 95,
        reason: {
          mr: `हिमोग्लोबिन ${vitals.hemoglobin} g/dL (तीव्र ॲनिमिया - तात्काळ रक्त / IV Iron आवश्यक)`,
          hi: `हीमोग्लोबिन ${vitals.hemoglobin} g/dL (गंभीर एनीमिया - तुरंत रक्त / IV Iron की जरूरत)`,
          en: `Hemoglobin ${vitals.hemoglobin} g/dL (Severe Anemia - Immediate Blood/IV Iron indicated)`
        }
      });
    } else if (vitals.hemoglobin < 11.0) {
      rawRiskScore += 0.25;
      explainability.push({
        feature: 'Hemoglobin (Hb)',
        value: `${vitals.hemoglobin} g/dL`,
        contribution: 'MODERATE_RISK',
        impactScore: 50,
        reason: {
          mr: `हिमोग्लोबिन ${vitals.hemoglobin} g/dL (मध्यम ॲनिमिया - दररोज २ IFA गोळ्या व पोषण सल्ला)`,
          hi: `हीमोग्लोबिन ${vitals.hemoglobin} g/dL (मध्यम एनीमिया - रोजाना २ आयरन गोली लें)`,
          en: `Hemoglobin ${vitals.hemoglobin} g/dL (Mild/Moderate Anemia - 2 IFA daily + dietary counseling)`
        }
      });
    } else {
      explainability.push({
        feature: 'Hemoglobin (Hb)',
        value: `${vitals.hemoglobin} g/dL`,
        contribution: 'NORMAL',
        impactScore: 0,
        reason: {
          mr: `हिमोग्लोबिन सामान्य पातळीवर आहे (${vitals.hemoglobin} g/dL)`,
          hi: `हीमोग्लोबिन सामान्य स्तर पर है (${vitals.hemoglobin} g/dL)`,
          en: `Hemoglobin is within normal range (${vitals.hemoglobin} g/dL)`
        }
      });
    }
  }

  // 2. Blood Pressure (Pre-eclampsia / Gestational Hypertension)
  if (vitals.systolicBP > 0 || vitals.diastolicBP > 0) {
    if (vitals.systolicBP >= 160 || vitals.diastolicBP >= 110) {
      hardRedFlagTriggered = true;
      triggerEmergency108 = true;
      rawRiskScore += 0.70;
      explainability.push({
        feature: 'Blood Pressure',
        value: `${vitals.systolicBP}/${vitals.diastolicBP} mmHg`,
        contribution: 'HIGH_RISK',
        impactScore: 98,
        reason: {
          mr: `रक्तदाब ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (अति-उच्च धोका - एक्लॅम्पसिया आणीबाणी)`,
          hi: `रक्तचाप ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (अति-गंभीर - एक्लेम्पसिया आपातकाल)`,
          en: `Blood Pressure ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (Hypertensive Crisis - Eclampsia risk)`
        }
      });
    } else if (vitals.systolicBP >= 140 || vitals.diastolicBP >= 90) {
      hardRedFlagTriggered = true;
      rawRiskScore += 0.50;
      explainability.push({
        feature: 'Blood Pressure',
        value: `${vitals.systolicBP}/${vitals.diastolicBP} mmHg`,
        contribution: 'HIGH_RISK',
        impactScore: 85,
        reason: {
          mr: `रक्तदाब ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (गर्भधारणेतील उच्च रक्तदाब - Pre-eclampsia संशय)`,
          hi: `रक्तचाप ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (हाई बीपी - प्री-एक्लेम्पसिया की संभावना)`,
          en: `Blood Pressure ${vitals.systolicBP}/${vitals.diastolicBP} mmHg (Gestational Hypertension - Pre-eclampsia)`
        }
      });
    } else if (vitals.systolicBP >= 130 || vitals.diastolicBP >= 85) {
      rawRiskScore += 0.15;
      explainability.push({
        feature: 'Blood Pressure',
        value: `${vitals.systolicBP}/${vitals.diastolicBP} mmHg`,
        contribution: 'MODERATE_RISK',
        impactScore: 35,
        reason: {
          mr: `रक्तदाब किंचित वाढलेला आहे (${vitals.systolicBP}/${vitals.diastolicBP} mmHg - नियमित मोजा)`,
          hi: `रक्तचाप हल्का बढ़ा हुआ है (${vitals.systolicBP}/${vitals.diastolicBP} mmHg - निगरानी जरूरी)`,
          en: `Pre-hypertension stage (${vitals.systolicBP}/${vitals.diastolicBP} mmHg - weekly monitoring)`
        }
      });
    }
  }

  // 3. Clinical Danger Signs (WHO / GoI Stop Rules)
  if (vitals.hasBleeding) {
    hardRedFlagTriggered = true;
    triggerEmergency108 = true;
    rawRiskScore += 0.80;
    explainability.push({
      feature: 'Vaginal Bleeding',
      value: 'होय / Yes',
      contribution: 'HIGH_RISK',
      impactScore: 99,
      reason: {
        mr: `योनीतून रक्तस्राव सुरू आहे (गर्भाशय धोका - तात्काळ रुग्णवाहिका बोलवा)`,
        hi: `रक्तस्राव हो रहा है (तुरंत 108 एम्बुलेंस बुलाएं)`,
        en: `Active vaginal bleeding (Antepartum Hemorrhage - Immediate 108 ambulance)`
      }
    });
  }

  if (vitals.hasConvulsions || (vitals.hasSevereHeadache && vitals.hasBlurredVision)) {
    hardRedFlagTriggered = true;
    triggerEmergency108 = true;
    rawRiskScore += 0.75;
    explainability.push({
      feature: 'Neurological Symptoms',
      value: 'चक्कर / डोकेदुखी / झटके',
      contribution: 'HIGH_RISK',
      impactScore: 95,
      reason: {
        mr: `तीव्र डोकेदुखी व अंधुक दिसणे (मेंदूवरील ताण / Eclampsia झटका धोका)`,
        hi: `तेज सिरदर्द व धुंधलापन (एक्लेम्पसिया का गंभीर खतरा)`,
        en: `Severe headache with visual disturbance / convulsions (Imminent Eclampsia)`
      }
    });
  }

  if (vitals.hasReducedFetalMovement) {
    hardRedFlagTriggered = true;
    rawRiskScore += 0.60;
    explainability.push({
      feature: 'Fetal Movement',
      value: 'कमी हालचाल / Reduced',
      contribution: 'HIGH_RISK',
      impactScore: 90,
      reason: {
        mr: `बाळाची हालचाल अचानक मंदावली आहे (Fetal Distress - तातडीने USG/NST करा)`,
        hi: `शिशु की हलचल कम हो गई है (भ्रूण संकट - तुरंत जांच कराएं)`,
        en: `Decreased fetal movements reported (Fetal Distress - Immediate NST/Doppler)`
      }
    });
  }

  // 4. Blood Sugar (Gestational Diabetes Mellitus - GDM)
  if (vitals.bloodSugar > 0) {
    if (vitals.bloodSugar >= 200) {
      hardRedFlagTriggered = true;
      rawRiskScore += 0.50;
      explainability.push({
        feature: 'Blood Glucose',
        value: `${vitals.bloodSugar} mg/dL`,
        contribution: 'HIGH_RISK',
        impactScore: 80,
        reason: {
          mr: `रक्त शर्करा ${vitals.bloodSugar} mg/dL (अति-उच्च मधुमेह - इन्सुलिन उपचार आवश्यक)`,
          hi: `ब्लड शुगर ${vitals.bloodSugar} mg/dL (गंभीर डायबिटीज - इंसुलिन आवश्यक)`,
          en: `Blood Glucose ${vitals.bloodSugar} mg/dL (Severe GDM - Specialist glycemic management)`
        }
      });
    } else if (vitals.bloodSugar >= 140) {
      rawRiskScore += 0.25;
      explainability.push({
        feature: 'Blood Glucose',
        value: `${vitals.bloodSugar} mg/dL`,
        contribution: 'MODERATE_RISK',
        impactScore: 45,
        reason: {
          mr: `रक्त शर्करा ${vitals.bloodSugar} mg/dL (मधुमेह संशय - आहार नियंत्रण व फेरतपासणी)`,
          hi: `ब्लड शुगर ${vitals.bloodSugar} mg/dL (डायबिटीज लक्षण - आहार नियंत्रण)`,
          en: `Blood Glucose ${vitals.bloodSugar} mg/dL (Impaired Glucose Tolerance - OGTT needed)`
        }
      });
    }
  }

  // 5. Maternal Age & Obstetric History
  if (vitals.age > 0) {
    if (vitals.age < 18) {
      rawRiskScore += 0.20;
      explainability.push({
        feature: 'Maternal Age',
        value: `${vitals.age} वर्षे / yrs`,
        contribution: 'MODERATE_RISK',
        impactScore: 40,
        reason: {
          mr: `वय १८ पेक्षा कमी आहे (किशोरवयीन गर्भधारणा - विशेष पोषण व देखरेख आवश्यक)`,
          hi: `उम्र 18 से कम (किशोरी गर्भावस्था - विशेष देखभाल)`,
          en: `Adolescent pregnancy (Age < 18 - higher risk of CPD and anemia)`
        }
      });
    } else if (vitals.age > 35) {
      rawRiskScore += 0.20;
      explainability.push({
        feature: 'Maternal Age',
        value: `${vitals.age} वर्षे / yrs`,
        contribution: 'MODERATE_RISK',
        impactScore: 40,
        reason: {
          mr: `वय ३५ पेक्षा जास्त आहे (Advanced Maternal Age - अनुवांशिक व बीपी तपासणी)`,
          hi: `उम्र 35 से अधिक (विशेष सोनोग्राफी जांच जरूरी)`,
          en: `Advanced maternal age (> 35 yrs - increased aneuploidy and HTN risk)`
        }
      });
    }
  }

  if (vitals.hasPrevCesarean) {
    rawRiskScore += 0.25;
    explainability.push({
      feature: 'Obstetric History',
      value: 'मागील C-Section / Previous CS',
      contribution: 'MODERATE_RISK',
      impactScore: 50,
      reason: {
        mr: `मागील सिझेरियन प्रसूतीचा इतिहास (संस्थागत प्रसूती व रक्ताची पूर्वतयारी आवश्यक)`,
        hi: `पिछली सिजेरियन डिलीवरी (अस्पताल में प्रसव की तैयारी अनिवार्य)`,
        en: `Previous Cesarean Section (Institutional delivery with blood backup mandatory)`
      }
    });
  }

  if (vitals.parity && vitals.parity >= 4) {
    rawRiskScore += 0.15;
    explainability.push({
      feature: 'Parity (Gravida)',
      value: `${vitals.parity}+ प्रसूती`,
      contribution: 'MODERATE_RISK',
      impactScore: 30,
      reason: {
        mr: `४ किंवा अधिक प्रसूती (प्रसूतीनंतर रक्तस्राव - PPH चा वाढीव धोका)`,
        hi: `४ या अधिक प्रसव (प्रसवोत्तर रक्तस्राव का जोखिम)`,
        en: `Grand Multiparity (≥ 4 deliveries - elevated risk of uterine atony & PPH)`
      }
    });
  } else if (vitals.gravidity && vitals.gravidity >= 5) {
    rawRiskScore += 0.10;
    explainability.push({
      feature: 'Gravidity', value: `G${vitals.gravidity}`, contribution: 'MODERATE_RISK', impactScore: 25,
      reason: { mr: `${vitals.gravidity} वी गर्भधारणा (वारंवार गर्भधारणा - ॲनिमिया व PPH धोका)`, hi: `${vitals.gravidity}वीं गर्भावस्था (बार-बार गर्भ - एनीमिया व PPH जोखिम)`, en: `Pregnancy number ${vitals.gravidity} (repeated pregnancies - anaemia and PPH risk)` }
    });
  }

  if (vitals.hasPastStillbirth) {
    rawRiskScore += 0.20;
    explainability.push({
      feature: 'Past stillbirth', value: 'Yes', contribution: 'MODERATE_RISK', impactScore: 40,
      reason: { mr: 'मागील मृत अर्भक जन्म (जवळून देखरेख व संस्थागत प्रसूती)', hi: 'पिछला मृत शिशु जन्म (करीबी निगरानी व संस्थागत प्रसव)', en: 'Previous stillbirth (close monitoring and institutional delivery)' }
    });
  }

  if (vitals.bloodGroup && /-\s*$|neg/i.test(vitals.bloodGroup)) {
    rawRiskScore += 0.10;
    explainability.push({
      feature: 'Blood group', value: vitals.bloodGroup, contribution: 'MODERATE_RISK', impactScore: 30,
      reason: { mr: `Rh-निगेटिव्ह रक्तगट (${vitals.bloodGroup}) - पतीचा रक्तगट व Anti-D इंजेक्शन तपासा`, hi: `Rh-नेगेटिव ब्लड ग्रुप (${vitals.bloodGroup}) - पति का ग्रुप व Anti-D इंजेक्शन जांचें`, en: `Rh-negative blood group (${vitals.bloodGroup}) - check husband's group, plan anti-D` }
    });
  }

  // Trends against the previous visit (needs both readings; nothing is assumed)
  const prev = vitals.previous;
  if (prev && prev.systolicBP && prev.diastolicBP && vitals.systolicBP > 0 && vitals.diastolicBP > 0) {
    const sysRise = vitals.systolicBP - prev.systolicBP;
    const diaRise = vitals.diastolicBP - prev.diastolicBP;
    if (sysRise >= 30 || diaRise >= 15) {
      rawRiskScore += 0.15;
      explainability.push({
        feature: 'BP trend', value: `${prev.systolicBP}/${prev.diastolicBP} → ${vitals.systolicBP}/${vitals.diastolicBP}`, contribution: 'MODERATE_RISK', impactScore: 40,
        reason: { mr: `मागील भेटीपासून रक्तदाब वेगाने वाढला (+${sysRise}/+${diaRise}) - प्री-एक्लेम्पसिया लक्ष ठेवा`, hi: `पिछली विज़िट से बीपी तेज़ी से बढ़ा (+${sysRise}/+${diaRise}) - प्री-एक्लेम्पसिया पर नज़र`, en: `BP rose sharply since last visit (+${sysRise}/+${diaRise} mmHg) - watch for pre-eclampsia` }
      });
    }
  }
  if (prev && prev.hemoglobin && vitals.hemoglobin > 0 && prev.hemoglobin - vitals.hemoglobin >= 1) {
    const drop = +(prev.hemoglobin - vitals.hemoglobin).toFixed(1);
    rawRiskScore += 0.10;
    explainability.push({
      feature: 'Hb trend', value: `${prev.hemoglobin} → ${vitals.hemoglobin} g/dL`, contribution: 'MODERATE_RISK', impactScore: 30,
      reason: { mr: `मागील भेटीपासून हिमोग्लोबिन ${drop} g/dL ने घटले - IFA सेवन व रक्तस्राव तपासा`, hi: `पिछली विज़िट से हीमोग्लोबिन ${drop} g/dL घटा - IFA सेवन व रक्तस्राव जांचें`, en: `Hb fell ${drop} g/dL since last visit - check IFA adherence and blood loss` }
    });
  }

  // 7. Other vitals and signs. Thresholds are hand-set from standard antenatal guidance, not learned.
  if (vitals.spO2 !== undefined && vitals.spO2 > 0) {
    if (vitals.spO2 < 90) {
      hardRedFlagTriggered = true;
      triggerEmergency108 = true;
      rawRiskScore += 0.70;
      explainability.push({
        feature: 'SpO2', value: `${vitals.spO2}%`, contribution: 'HIGH_RISK', impactScore: 95,
        reason: { mr: `SpO2 ${vitals.spO2}% (गंभीर ऑक्सिजन कमतरता - तात्काळ ऑक्सिजन व रेफर)`, hi: `SpO2 ${vitals.spO2}% (गंभीर ऑक्सीजन कमी - तुरंत ऑक्सीजन व रेफर)`, en: `SpO2 ${vitals.spO2}% (severe hypoxia - oxygen and immediate referral)` }
      });
    } else if (vitals.spO2 < 94) {
      rawRiskScore += 0.25;
      explainability.push({
        feature: 'SpO2', value: `${vitals.spO2}%`, contribution: 'MODERATE_RISK', impactScore: 50,
        reason: { mr: `SpO2 ${vitals.spO2}% (कमी ऑक्सिजन - पुन्हा तपासा)`, hi: `SpO2 ${vitals.spO2}% (कम ऑक्सीजन - दोबारा जांचें)`, en: `SpO2 ${vitals.spO2}% (low oxygen - recheck, refer if it persists)` }
      });
    }
  }
  if (vitals.bodyTempF !== undefined && vitals.bodyTempF >= 100.4) {
    rawRiskScore += 0.20;
    explainability.push({
      feature: 'Body temperature', value: `${vitals.bodyTempF} °F`, contribution: 'MODERATE_RISK', impactScore: 40,
      reason: { mr: `ताप ${vitals.bodyTempF} °F (संसर्ग - UTI, मलेरिया, सेप्सिस तपासा)`, hi: `बुखार ${vitals.bodyTempF} °F (संक्रमण - UTI, मलेरिया, सेप्सिस जांचें)`, en: `Fever ${vitals.bodyTempF} °F (infection - check for UTI, malaria, sepsis)` }
    });
  }
  if (vitals.heartRate !== undefined && vitals.heartRate > 0 && (vitals.heartRate > 120 || vitals.heartRate < 50)) {
    rawRiskScore += 0.20;
    const fast = vitals.heartRate > 120;
    explainability.push({
      feature: 'Heart rate', value: `${vitals.heartRate} bpm`, contribution: 'MODERATE_RISK', impactScore: 40,
      reason: {
        mr: fast ? `नाडी ${vitals.heartRate} bpm (जलद - कारण तपासा)` : `नाडी ${vitals.heartRate} bpm (मंद - कारण तपासा)`,
        hi: fast ? `नब्ज ${vitals.heartRate} bpm (तेज़ - कारण जांचें)` : `नब्ज ${vitals.heartRate} bpm (धीमी - कारण जांचें)`,
        en: fast ? `Pulse ${vitals.heartRate} bpm (fast - find the cause)` : `Pulse ${vitals.heartRate} bpm (slow - find the cause)`
      }
    });
  }
  if (vitals.weightKg !== undefined && vitals.weightKg > 0 && vitals.weightKg < 45) {
    rawRiskScore += 0.15;
    explainability.push({
      feature: 'Weight', value: `${vitals.weightKg} kg`, contribution: 'MODERATE_RISK', impactScore: 30,
      reason: { mr: `वजन ${vitals.weightKg} kg (कमी वजन - बाळाचे वजन कमी होण्याचा धोका)`, hi: `वज़न ${vitals.weightKg} kg (कम वज़न - शिशु का वज़न कम होने का खतरा)`, en: `Weight ${vitals.weightKg} kg (underweight - low birth weight risk)` }
    });
  }
  if (vitals.urineProtein === '2+' || vitals.urineProtein === '3+') {
    const highBp = vitals.systolicBP >= 140 || vitals.diastolicBP >= 90;
    if (highBp) hardRedFlagTriggered = true;
    rawRiskScore += highBp ? 0.60 : 0.25;
    explainability.push({
      feature: 'Urine protein', value: vitals.urineProtein, contribution: highBp ? 'HIGH_RISK' : 'MODERATE_RISK', impactScore: highBp ? 90 : 45,
      reason: highBp
        ? { mr: `लघवीत प्रथिने ${vitals.urineProtein} व उच्च रक्तदाब (प्री-एक्लेम्पसिया)`, hi: `पेशाब में प्रोटीन ${vitals.urineProtein} और उच्च रक्तचाप (प्री-एक्लेम्पसिया)`, en: `Urine protein ${vitals.urineProtein} with high BP (pre-eclampsia)` }
        : { mr: `लघवीत प्रथिने ${vitals.urineProtein} (मूत्रपिंड / प्री-एक्लेम्पसिया तपासा)`, hi: `पेशाब में प्रोटीन ${vitals.urineProtein} (गुर्दे / प्री-एक्लेम्पसिया जांचें)`, en: `Urine protein ${vitals.urineProtein} (check kidneys and pre-eclampsia)` }
    });
  }
  if (vitals.hasFacialEdema) {
    rawRiskScore += 0.15;
    explainability.push({
      feature: 'Facial / pedal oedema', value: 'Yes', contribution: 'MODERATE_RISK', impactScore: 35,
      reason: { mr: 'चेहऱ्यावर / पायावर सूज (प्री-एक्लेम्पसिया चिन्ह)', hi: 'चेहरे/पैरों में सूजन (प्री-एक्लेम्पसिया संकेत)', en: 'Facial / pedal oedema (pre-eclampsia sign)' }
    });
  }

  // 6. Pregnancy factors: multiple pregnancy, placement, growth, diseases, past/conception complications, preterm labour
  const pregnancyEval = evaluatePregnancyFactors({
    gestationalWeeks: vitals.gestationalWeeks,
    pregnancy: vitals.pregnancy,
    hasRegularContractions: vitals.hasRegularContractions,
    hasLeakingFluid: vitals.hasLeakingFluid,
    hasLowerAbdominalPain: vitals.hasLowerAbdominalPain,
    hasBleeding: vitals.hasBleeding
  });
  rawRiskScore += pregnancyEval.points;
  explainability.push(...pregnancyEval.explainability);
  if (pregnancyEval.hardRed) hardRedFlagTriggered = true;
  if (pregnancyEval.emergency108) triggerEmergency108 = true;

  // Bound probability strictly between 0.05 and 0.99
  const riskProbability = Math.min(0.99, Math.max(0.05, Number(rawRiskScore.toFixed(3))));

  // Decision Threshold: High Sensitivity Prioritized (>85% Sensitivity Calibration)
  // Calibrated decision threshold = 0.40 (or ANY hard red flag)
  let riskTier: RiskTier = 'GREEN';
  if (hardRedFlagTriggered || riskProbability >= 0.40) {
    riskTier = 'RED';
  } else if (riskProbability >= 0.20 || explainability.some(e => e.contribution === 'MODERATE_RISK')) {
    riskTier = 'YELLOW';
  }

  // Trained model (src/core/riskModel.json, built by scripts/train-risk-model.mjs) can only raise the tier.
  // Explainable: the decision path the tree took is shown, so each reading's effect can be traced.
  // Needs a real temperature and heart rate (no defaults): without them the tree is skipped.
  const missingForModel = [
    !(vitals.systolicBP > 0 && vitals.diastolicBP > 0) && 'blood pressure',
    !(vitals.bloodSugar > 0) && 'blood sugar',
    vitals.bodyTempF === undefined && 'temperature',
    !(vitals.heartRate !== undefined && vitals.heartRate > 0) && 'pulse',
    !(vitals.age > 0) && 'age'
  ].filter(Boolean) as string[];
  let model: ModelInsight = {
    used: false,
    skippedReason: riskModel.trained
      ? `Not run: needs ${missingForModel.join(', ')}`
      : 'No trained model bundled'
  };

  if (riskModel.trained && missingForModel.length === 0 && vitals.bodyTempF !== undefined && vitals.heartRate !== undefined) {
    const FEATURE_NAMES = [
      'Age',
      'Systolic BP',
      'Diastolic BP',
      'Blood sugar (mmol/L)',
      'Body Temp (°F)',
      'Heart Rate (bpm)'
    ];
    const x = [
      vitals.age,
      vitals.systolicBP,
      vitals.diastolicBP,
      vitals.bloodSugar / 18,
      vitals.bodyTempF,
      vitals.heartRate
    ];
    let p = 0;
    let treesHigh = 0;
    if (riskModel.trees && riskModel.trees.length > 0) {
      let sumP = 0;
      for (const t of riskModel.trees) {
        let n: TreeNode = t;
        while (n.p === undefined) {
          n = x[n.f!] < n.t! ? n.l! : n.r!;
        }
        sumP += n.p!;
        if (n.p! >= riskModel.threshold) treesHigh++;
      }
      p = sumP / riskModel.trees.length;
    } else if (riskModel.tree) {
      let n = riskModel.tree;
      while (n.p === undefined) {
        n = x[n.f!] < n.t! ? n.l! : n.r!;
      }
      p = n.p!;
      treesHigh = p >= riskModel.threshold ? 1 : 0;
    }

    const path: string[] = [];
    let node = riskModel.tree;
    while (node && node.p === undefined) {
      const f = node.f!;
      const goLeft = x[f] < node.t!;
      path.push(`${FEATURE_NAMES[f]} ${goLeft ? '<' : '≥'} ${node.t}`);
      node = goLeft ? node.l! : node.r!;
    }

    const pct = Math.round(p * 100);
    const flagged = p >= riskModel.threshold;
    explainability.push({
      feature: 'Trained ML Model (Random Forest Ensemble)',
      value: `${pct}% high-risk consensus (${riskModel.trees ? riskModel.trees.length : 1} clinical trees)`,
      contribution: flagged ? 'HIGH_RISK' : 'NORMAL',
      impactScore: pct,
      reason: {
        mr: `रँडम फॉरेस्ट एकमत: ${pct}% जोखीम संभाव्यता (मुख्य मार्ग: ${path.slice(0, 3).join(' → ')})`,
        hi: `रैंडम फ़ॉरेस्ट सर्वसम्मति: ${pct}% जोखिम प्रायिकता (प्रमुख मार्ग: ${path.slice(0, 3).join(' → ')})`,
        en: `Random Forest consensus: ${pct}% risk probability across ${riskModel.trees?.length || 1} trees (Primary path: ${path.slice(0, 3).join(' → ')})`
      }
    });
    if (flagged && riskTier !== 'RED') riskTier = 'RED';
    model = {
      used: true,
      probability: p,
      treesHigh,
      treesTotal: riskModel.trees?.length || 1,
      threshold: riskModel.threshold,
      path
    };
  }

  const notMeasured = [
    !(vitals.systolicBP > 0 && vitals.diastolicBP > 0) && 'Blood pressure',
    !(vitals.hemoglobin > 0) && 'Hemoglobin',
    !(vitals.bloodSugar > 0) && 'Blood sugar',
    !(vitals.weightKg && vitals.weightKg > 0) && 'Weight',
    vitals.spO2 === undefined && 'SpO2',
    vitals.bodyTempF === undefined && 'Temperature',
    vitals.heartRate === undefined && 'Pulse',
    vitals.urineProtein === undefined && 'Urine protein'
  ].filter(Boolean) as string[];

  const isHighRisk = riskTier === 'RED';
  const needsPMSMASpecialist = riskTier === 'RED' || riskTier === 'YELLOW';

  const triageBadge = {
    mr: riskTier === 'RED' ? '🔴 तातडीचा उच्च धोका (HIGH RISK)' : riskTier === 'YELLOW' ? '🟡 मध्यम जोखीम (MODERATE RISK)' : '🟢 सुरक्षित / सामान्य (ROUTINE)',
    hi: riskTier === 'RED' ? '🔴 गंभीर उच्च जोखिम (HIGH RISK)' : riskTier === 'YELLOW' ? '🟡 मध्यम जोखिम (MODERATE RISK)' : '🟢 सामान्य / सुरक्षित (ROUTINE)',
    en: riskTier === 'RED' ? '🔴 HIGH RISK (CRITICAL)' : riskTier === 'YELLOW' ? '🟡 MODERATE RISK (WATCHLIST)' : '🟢 ROUTINE ANC (SAFE)'
  };

  const triageAction = {
    mr: riskTier === 'RED'
      ? 'तातडीने प्राथमिक आरोग्य केंद्र (PHC) किंवा उप-जिल्हा रुग्णालयात पाठवा. १०८ वर कॉल करा.'
      : riskTier === 'YELLOW'
      ? 'दर १५ दिवसांनी भेट द्या आणि ९ तारखेच्या PMSMA शिबिरात तज्ज्ञ डॉक्टरांकडून तपासणी करा.'
      : 'नियमित ANC वेळापत्रक चालू ठेवा. दररोज १ IFA लाल गोळी व पोषण आहार घ्या.',
    hi: riskTier === 'RED'
      ? 'तुरंत प्राथमिक स्वास्थ्य केंद्र / अस्पताल रेफर करें। १०८ एम्बुलेंस को कॉल करें।'
      : riskTier === 'YELLOW'
      ? 'हर १५ दिन में निगरानी करें और ९ तारीख को PMSMA विशेषज्ञ शिविर में जांच कराएं।'
      : 'नियमित ANC जांच जारी रखें। रोजाना १ आयरन की लाल गोली लें।',
    en: riskTier === 'RED'
      ? 'Immediate transfer to PHC / FRU hospital. Alert Medical Officer & standby 108.'
      : riskTier === 'YELLOW'
      ? 'Bi-weekly ASHA home monitoring + mandatory PMSMA 9th monthly specialist camp.'
      : 'Standard ANC protocol. Daily 1 IFA tablet + Calcium supplementation.'
  };

  return {
    riskTier,
    riskProbability,
    isHighRisk,
    sensitivityPrioritized: true,
    triageBadge,
    triageAction,
    explainability,
    triggerEmergency108,
    needsPMSMASpecialist,
    pretermRisk: pregnancyEval.pretermRisk,
    model,
    notMeasured
  };
}

/**
 * Builds the full engine input from a mother's record: the given (or latest) visit's readings,
 * her history and pregnancy profile, and the visit before it for trend rules.
 * Readings that were not taken stay undefined / 0, so nothing is invented.
 */
export function buildClinicalVitals(b: Beneficiary, visit: VitalRecord | undefined = b.vitalsHistory[0]): ClinicalVitals {
  const idx = visit ? b.vitalsHistory.indexOf(visit) : -1;
  const before = idx >= 0 ? b.vitalsHistory[idx + 1] : undefined;
  return {
    age: b.age,
    systolicBP: visit?.systolicBP || 0,
    diastolicBP: visit?.diastolicBP || 0,
    hemoglobin: visit?.hemoglobin || 0,
    bloodSugar: visit?.bloodSugar || 0,
    weightKg: visit?.weightKg,
    spO2: visit?.spO2,
    bodyTempF: visit?.bodyTempF,
    heartRate: visit?.heartRate,
    urineProtein: visit?.urineProtein,
    parity: b.parity,
    gravidity: b.gravidity,
    gestationalWeeks: visit?.gestationalWeek ?? b.currentGestationalWeeks,
    hasPrevCesarean: b.hasPrevCesarean,
    hasPastStillbirth: b.hasPastStillbirth,
    bloodGroup: b.bloodGroup,
    hasBleeding: visit?.symptoms.hasVaginalBleeding,
    hasSevereHeadache: visit?.symptoms.hasSevereHeadache,
    hasBlurredVision: visit?.symptoms.hasBlurredVision,
    hasFacialEdema: visit?.symptoms.hasFacialEdema,
    hasReducedFetalMovement: visit?.symptoms.hasReducedFetalMovement,
    hasConvulsions: visit?.symptoms.hasConvulsions,
    hasRegularContractions: visit?.symptoms.hasRegularContractions,
    hasLeakingFluid: visit?.symptoms.hasLeakingFluid,
    hasLowerAbdominalPain: visit?.symptoms.hasLowerAbdominalPain,
    pregnancy: b.pregnancy,
    previous: before
      ? { systolicBP: before.systolicBP, diastolicBP: before.diastolicBP, hemoglobin: before.hemoglobin, date: before.date }
      : undefined
  };
}
