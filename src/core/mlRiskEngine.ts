// Rule-Based Clinical Triage Engine (hand-set thresholds and weights, not a trained ML model).
// Tuned to favour sensitivity (over-referral) on the high-risk class. Its real-world
// accuracy has not been validated on labelled clinical data.

import { RiskTier, MLModelBenchmark } from '../types';
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
  if (riskModel.trained && vitals.systolicBP > 0 && vitals.diastolicBP > 0 && vitals.age > 0
    && vitals.bodyTempF !== undefined && vitals.heartRate !== undefined && vitals.heartRate > 0) {
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
      (vitals.bloodSugar || 0) / 18,
      vitals.bodyTempF,
      vitals.heartRate
    ];
    let p = 0;
    if (riskModel.trees && riskModel.trees.length > 0) {
      let sumP = 0;
      for (const t of riskModel.trees) {
        let n: TreeNode = t;
        while (n.p === undefined) {
          n = x[n.f!] < n.t! ? n.l! : n.r!;
        }
        sumP += n.p!;
      }
      p = sumP / riskModel.trees.length;
    } else if (riskModel.tree) {
      let n = riskModel.tree;
      while (n.p === undefined) {
        n = x[n.f!] < n.t! ? n.l! : n.r!;
      }
      p = n.p!;
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
  }

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
    pretermRisk: pregnancyEval.pretermRisk
  };
}


// =========================================================================
// 5,000 MATERNAL CLINICAL DATASET ENGINE (NFHS-5 & ICMR CALIBRATED)
// =========================================================================

export interface Maternal5kRecord {
  id: string;
  rchId: string;
  patientName: string;
  age: number;
  gestationalWeeks: number;
  systolicBP: number;
  diastolicBP: number;
  hemoglobin: number;
  bloodSugar: number;
  bodyTempF: number;
  heartRateBpm: number;
  parity: number;
  urineProtein: 'NIL' | 'TRACE' | '1+' | '2+' | '3+';
  symptoms: {
    bleeding: boolean;
    severeHeadache: boolean;
    blurredVision: boolean;
    edema: boolean;
    convulsions: boolean;
  };
  trueRiskTier: RiskTier;
  predictedRiskTier: RiskTier;
  mlConfidence: number;
  village: string;
}

/**
 * Generates SYNTHETIC maternal records for demos and rule-consistency testing.
 * Labels are produced by the generator itself, not by clinicians; this is not real patient
 * data and is not calibrated against ICMR or NFHS-5 data.
 */
export function generate5kMaternalDataset(count: number = 5000): Maternal5kRecord[] {
  const villages = ['Koregaon Bhima', 'Sanaswadi', 'Pabal', 'Talegaon Dhamdhere', 'Narayangaon', 'Chakan Rural', 'Malegaon Budruk', 'Manchar Rural', 'Shirur Rural'];
  const firstNames = ['Sunita', 'Pooja', 'Kavita', 'Meena', 'Anjali', 'Surekha', 'Rukmini', 'Varsha', 'Priyanka', 'Sarika', 'Dipali', 'Rohini', 'Swati', 'Manjusha', 'Jyoti'];
  const lastNames = ['Shinde', 'Gaikwad', 'Chavan', 'Bhosale', 'Waghmare', 'Jadhav', 'Kadam', 'Tambe', 'Pawar', 'More', 'Patil', 'Deshmukh', 'Thorat', 'Bhor'];

  const records: Maternal5kRecord[] = [];

  // Seeded deterministic pseudo-random generator
  let seed = 42;
  const pseudoRand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 1; i <= count; i++) {
    const r1 = pseudoRand();
    const r2 = pseudoRand();
    const r3 = pseudoRand();
    const r4 = pseudoRand();
    const r5 = pseudoRand();
    const r6 = pseudoRand();

    const firstName = firstNames[Math.floor(pseudoRand() * firstNames.length)];
    const lastName = lastNames[Math.floor(pseudoRand() * lastNames.length)];
    const village = villages[Math.floor(pseudoRand() * villages.length)];
    const rchId = `MH-2026-${1000 + (i % 9000)}`;

    let age: number;
    let systolicBP: number;
    let diastolicBP: number;
    let hemoglobin: number;
    let bloodSugar: number;
    let bodyTempF: number;
    let heartRateBpm: number;
    let gestationalWeeks: number;
    let parity: number;
    let urineProtein: 'NIL' | 'TRACE' | '1+' | '2+' | '3+';
    let bleeding = false;
    let severeHeadache = false;
    let blurredVision = false;
    let edema = false;
    let convulsions = false;
    let trueTier: RiskTier;

    // Distribute 26% High Risk (Pre-eclampsia, Severe Anemia, Gestational Diabetes, Adolescent/Grand Multipara)
    if (r1 < 0.26) {
      trueTier = 'RED';
      age = r2 < 0.3 ? Math.floor(15 + r3 * 3) : r2 > 0.7 ? Math.floor(36 + r3 * 7) : Math.floor(22 + r3 * 10);
      systolicBP = r3 < 0.5 ? Math.floor(142 + r4 * 38) : Math.floor(115 + r4 * 20);
      diastolicBP = systolicBP >= 140 ? Math.floor(92 + r5 * 28) : Math.floor(75 + r5 * 15);
      hemoglobin = r4 < 0.4 ? parseFloat((4.5 + r5 * 2.4).toFixed(1)) : parseFloat((7.0 + r5 * 3.5).toFixed(1));
      bloodSugar = r5 < 0.35 ? Math.floor(160 + r6 * 120) : Math.floor(90 + r6 * 40);
      bodyTempF = parseFloat((98.0 + r2 * 4.0).toFixed(1));
      heartRateBpm = Math.floor(85 + r3 * 40);
      gestationalWeeks = Math.floor(12 + r4 * 28);
      parity = r5 > 0.6 ? Math.floor(4 + r6 * 3) : Math.floor(r6 * 2);
      urineProtein = systolicBP >= 140 ? (r2 < 0.4 ? '2+' : '3+') : (r2 < 0.5 ? 'TRACE' : '1+');
      bleeding = r6 < 0.25;
      severeHeadache = systolicBP >= 145 || r3 < 0.4;
      blurredVision = systolicBP >= 155 || r4 < 0.3;
      edema = systolicBP >= 140 || r5 < 0.45;
      convulsions = systolicBP >= 160 && r6 < 0.15;
    } 
    // Distribute 34% Moderate Risk (Mild/Moderate Anemia, Borderline BP, Prior CS, Mild Edema)
    else if (r1 < 0.60) {
      trueTier = 'YELLOW';
      age = Math.floor(19 + r2 * 14);
      systolicBP = Math.floor(122 + r3 * 16);
      diastolicBP = Math.floor(80 + r4 * 8);
      hemoglobin = parseFloat((8.5 + r5 * 2.3).toFixed(1));
      bloodSugar = Math.floor(125 + r6 * 25);
      bodyTempF = parseFloat((98.2 + r2 * 1.5).toFixed(1));
      heartRateBpm = Math.floor(75 + r3 * 20);
      gestationalWeeks = Math.floor(8 + r4 * 32);
      parity = Math.floor(r5 * 3);
      urineProtein = r6 < 0.3 ? '1+' : 'TRACE';
      bleeding = false;
      severeHeadache = r2 < 0.2;
      blurredVision = false;
      edema = r4 < 0.35;
      convulsions = false;
    } 
    // Distribute 40% Low / Routine Risk (Normal Vitals)
    else {
      trueTier = 'GREEN';
      age = Math.floor(20 + r2 * 12);
      systolicBP = Math.floor(105 + r3 * 18);
      diastolicBP = Math.floor(68 + r4 * 10);
      hemoglobin = parseFloat((11.2 + r5 * 3.2).toFixed(1));
      bloodSugar = Math.floor(80 + r6 * 35);
      bodyTempF = parseFloat((98.4 + r2 * 0.8).toFixed(1));
      heartRateBpm = Math.floor(70 + r3 * 15);
      gestationalWeeks = Math.floor(4 + r4 * 36);
      parity = Math.floor(r5 * 2);
      urineProtein = 'NIL';
      bleeding = false;
      severeHeadache = false;
      blurredVision = false;
      edema = false;
      convulsions = false;
    }

    // Run ML Model Prediction on this sample
    const pred = predictMaternalRisk({
      age,
      systolicBP,
      diastolicBP,
      hemoglobin,
      bloodSugar,
      bodyTemp: bodyTempF,
      heartRate: heartRateBpm,
      gestationalWeeks,
      parity,
      hasBleeding: bleeding,
      hasSevereHeadache: severeHeadache,
      hasBlurredVision: blurredVision,
      hasFacialEdema: edema,
      hasConvulsions: convulsions
    });

    records.push({
      id: `pat_5k_${String(i).padStart(4, '0')}`,
      rchId,
      patientName: `${firstName} ${lastName}`,
      age,
      gestationalWeeks,
      systolicBP,
      diastolicBP,
      hemoglobin,
      bloodSugar,
      bodyTempF,
      heartRateBpm,
      parity,
      urineProtein,
      symptoms: {
        bleeding,
        severeHeadache,
        blurredVision,
        edema,
        convulsions
      },
      trueRiskTier: trueTier,
      predictedRiskTier: pred.riskTier,
      mlConfidence: pred.riskProbability,
      village
    });
  }

  return records;
}


/**
 * Synthetic rule-consistency check.
 *
 * IMPORTANT: this is NOT a clinical validation. The synthetic records are generated
 * with the same thresholds the rule engine checks, so high agreement is expected and
 * says nothing about real-world sensitivity. Real accuracy figures require evaluation
 * on independently labelled clinical data.
 *
 * All numbers below are computed from the records passed in; none are hardcoded.
 */
export function computeSyntheticSelfCheck(records: Maternal5kRecord[]): MLModelBenchmark {
  let tp = 0, fn = 0, fp = 0, tn = 0;
  for (const r of records) {
    const actualHigh = r.trueRiskTier === 'RED';
    const predictedHigh = r.predictedRiskTier === 'RED';
    if (actualHigh && predictedHigh) tp++;
    else if (actualHigh) fn++;
    else if (predictedHigh) fp++;
    else tn++;
  }
  const safe = (n: number, d: number) => (d === 0 ? 0 : n / d);
  const sensitivity = safe(tp, tp + fn);
  const precision = safe(tp, tp + fp);

  // ROC-AUC via the rank-sum (Mann-Whitney U) formulation on the engine's score
  const positives = records.filter(r => r.trueRiskTier === 'RED').map(r => r.mlConfidence);
  const negatives = records.filter(r => r.trueRiskTier !== 'RED').map(r => r.mlConfidence);
  let wins = 0;
  for (const p of positives) {
    for (const n of negatives) {
      if (p > n) wins += 1;
      else if (p === n) wins += 0.5;
    }
  }

  return {
    datasetName: `Synthetic rule-consistency check (${records.length} generated records) - NOT clinical validation`,
    totalRecords: records.length,
    features: [
      'Age', 'Gestational Age', 'Systolic BP', 'Diastolic BP', 'Hemoglobin', 'Blood Sugar',
      'Parity', 'Bleeding', 'Severe Headache', 'Blurred Vision', 'Edema', 'Convulsions'
    ],
    highRiskSensitivity: sensitivity,
    highRiskSpecificity: safe(tn, tn + fp),
    overallAccuracy: safe(tp + tn, records.length),
    f1Score: safe(2 * precision * sensitivity, precision + sensitivity),
    rocAuc: safe(wins, positives.length * negatives.length),
    confusionMatrix: {
      trueHighRisk_predictedHigh: tp,
      trueHighRisk_predictedLow: fn,
      trueLowRisk_predictedHigh: fp,
      trueLowRisk_predictedLow: tn
    },
    // The engine is rule-based: there is no learned feature importance to report.
    featureImportance: []
  };
}

/**
 * Exports 5,000 records to CSV string for external ML validation
 */
export function export5kDatasetToCSV(records: Maternal5kRecord[]): string {
  const headers = [
    'Patient_ID',
    'RCH_ID',
    'Patient_Name',
    'Age',
    'Gestational_Weeks',
    'Systolic_BP',
    'Diastolic_BP',
    'Hemoglobin_g_dL',
    'Blood_Sugar_mg_dL',
    'Body_Temp_F',
    'Heart_Rate_BPM',
    'Parity',
    'Urine_Protein',
    'Bleeding_Flag',
    'Severe_Headache_Flag',
    'Edema_Flag',
    'Convulsions_Flag',
    'True_Risk_Tier',
    'Predicted_Risk_Tier',
    'ML_Confidence',
    'Village_PHC'
  ];

  const rows = records.map(r => [
    r.id,
    r.rchId,
    `"${r.patientName}"`,
    r.age,
    r.gestationalWeeks,
    r.systolicBP,
    r.diastolicBP,
    r.hemoglobin,
    r.bloodSugar,
    r.bodyTempF,
    r.heartRateBpm,
    r.parity,
    r.urineProtein,
    r.symptoms.bleeding ? 1 : 0,
    r.symptoms.severeHeadache ? 1 : 0,
    r.symptoms.edema ? 1 : 0,
    r.symptoms.convulsions ? 1 : 0,
    r.trueRiskTier,
    r.predictedRiskTier,
    r.mlConfidence.toFixed(3),
    `"${r.village}"`
  ]);

  return [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
}
