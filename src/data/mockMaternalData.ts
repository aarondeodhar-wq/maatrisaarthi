// Sample mothers for the demo account only (App.tsx loads them for demo profiles).
// Fictional people: never shown to, cached for, or uploaded by a real account.

import { Beneficiary } from '../types';
import { generateANCSchedule, calculateGestationalWeeks, calculateEDD } from '../core/protocolEngine';
import { createDefaultDPDPConsent } from '../core/dpdpCompliance';

export const MOCK_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben_001',
    rchId: 'MH-2026-8941',
    abhaId: '91-4829-1029-4821',
    name: 'Sunita Rajesh Shinde',
    age: 24,
    phone: '+91 9179957555',
    husbandName: 'Rajesh Shinde',
    village: 'Koregaon Bhima',
    ward: 'Shirur Rural Ward 02',
    district: 'Pune',
    assignedAsha: {
      name: 'Savita Patil',
      phone: '+91 97654 32101'
    },
    lmp: '2026-02-01',
    edd: calculateEDD('2026-02-01'),
    currentGestationalWeeks: 28,
    gravidity: 2,
    parity: 1,
    hasPrevCesarean: false,
    hasPastStillbirth: false,
    bloodGroup: 'B+',
    currentRiskTier: 'RED',
    mlRiskScore: 0.88,
    riskFactors: [
      'Severe Anemia (Hb 6.4 g/dL)',
      'Gestational Hypertension (BP 148/94 mmHg)',
      'Facial & Pedal Edema reported'
    ],
    ancSchedule: generateANCSchedule('2026-02-01', 'PHC Shirur'),
    vitalsHistory: [
      {
        id: 'vit_101',
        date: '2026-08-12',
        gestationalWeek: 28,
        systolicBP: 148,
        diastolicBP: 94,
        hemoglobin: 6.4,
        bloodSugar: 112,
        weightKg: 52.5,
        fundalHeightCm: 27,
        fetalHeartRate: 144,
        urineProtein: '1+',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: true,
          hasBlurredVision: false,
          hasFacialEdema: true,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.88,
        riskTier: 'RED',
        riskReasons: ['Severe Anemia Hb 6.4 g/dL', 'High BP 148/94', 'Facial Edema'],
        recordedBy: 'Savita Patil (ASHA)',
        facility: 'Koregaon Anganwadi VHSND',
        syncStatus: 'SYNCED'
      },
      {
        id: 'vit_100',
        date: '2026-06-18',
        gestationalWeek: 20,
        systolicBP: 132,
        diastolicBP: 84,
        hemoglobin: 7.8,
        bloodSugar: 98,
        weightKg: 49.0,
        fundalHeightCm: 19,
        fetalHeartRate: 148,
        urineProtein: 'NIL',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: false,
          hasBlurredVision: false,
          hasFacialEdema: false,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.42,
        riskTier: 'YELLOW',
        riskReasons: ['Moderate Anemia Hb 7.8 g/dL'],
        recordedBy: 'Dr. R. Joshi',
        facility: 'PHC Shirur',
        syncStatus: 'SYNCED'
      }
    ],
    prescriptions: [
      {
        id: 'rx_501',
        date: '2026-08-13',
        doctorId: 'doc_101',
        doctorName: 'Dr. Rajesh Joshi (MBBS, DGO)',
        facility: 'PHC Shirur',
        diagnosis: 'Severe Nutritional Anemia + Gestational Hypertension (28 Weeks)',
        medications: [
          { name: 'IV Iron Sucrose 100mg in 100ml NS', dosage: 'Alternate days x 3 doses at Sub-District Hospital', durationDays: 6 },
          { name: 'Tab Labetalol 100mg', dosage: '1 tablet twice daily after food', durationDays: 14 },
          { name: 'Calcium Carbonate 500mg', dosage: '1 tablet daily after lunch', durationDays: 30 }
        ],
        specialInstructions: 'Emergency 108 referral to SDH Shirur if BP > 150/100 or severe headache occurs. Mandatory PMSMA attendance on 9th.',
        referral: {
          required: true,
          referralFacility: 'Sub-District Hospital Shirur (First Referral Unit)',
          reason: 'IV Iron Infusion & High-Risk Obstetric Monitoring',
          urgency: 'URGENT'
        },
        pmsmaNextSlotDate: '2026-09-09'
      }
    ],
    audioNotes: [
      {
        id: 'aud_301',
        timestamp: '2026-08-12T11:40:00Z',
        recordedBy: 'Savita Patil (ASHA)',
        durationSec: 8,
        title: 'High BP & Severe Pale Conjunctiva Alert',
        transcript: {
          mr: 'नमस्कार डॉक्टर साहेब, सुनिता शिंदे यांच्या पायावर खूप सूज आली आहे आणि बीपी १४८/९४ आहे. डोळे खूप पांढरे दिसत आहेत, हिमोग्लोबिन ६.४ आले आहे.',
          hi: 'नमस्ते डॉक्टर साहब, सुनिता शिंदे के पैरों में सूजन है और बीपी 148/94 है। हीमोग्लोबिन 6.4 आया है, तुरंत मार्गदर्शन दें।',
          en: 'Hello Doctor, Sunita Shinde has severe pedal edema, BP is 148/94 mmHg, and rapid Hb test is 6.4 g/dL. Requesting urgent guidance.'
        },
        resolved: true,
        doctorReply: 'Reviewed vitals. Issued IV Iron Sucrose referral and prescribed Tab Labetalol. Please coordinate hospital visit today.'
      }
    ],
    pregnancy: {
      fetusCount: 2,
      presentation: 'CEPHALIC',
      growth: 'SMALL_FOR_DATES',
      conditions: ['chronic_htn', 'syphilis'],
      conceptionEvents: ['assisted'],
      priorComplications: ['preterm']
    },
    dpdpConsent: createDefaultDPDPConsent('mr', true, true, true),
    qrAuthToken: 'MS-AUTH-MH8941-SECURE',
    accessPin: '4829',
    registeredAt: '2026-02-15',
    lastSyncedAt: '2026-08-17T10:15:00Z'
  },
  {
    id: 'ben_002',
    rchId: 'MH-2026-7215',
    abhaId: '91-3211-9874-5512',
    name: 'Pooja Vikas Gaikwad',
    age: 29,
    phone: '+91 94220 89102',
    husbandName: 'Vikas Gaikwad',
    village: 'Sanaswadi',
    ward: 'Shirur Rural Ward 01',
    district: 'Pune',
    assignedAsha: {
      name: 'Rekha Deshmukh',
      phone: '+91 98901 12345'
    },
    lmp: '2026-03-29',
    edd: calculateEDD('2026-03-29'),
    currentGestationalWeeks: 20,
    gravidity: 2,
    parity: 1,
    hasPrevCesarean: true,
    hasPastStillbirth: false,
    bloodGroup: 'O+',
    currentRiskTier: 'YELLOW',
    mlRiskScore: 0.48,
    riskFactors: [
      'Previous Cesarean Section (Scar Integrity monitoring)',
      'Moderate Anemia (Hb 9.2 g/dL)',
      'TIFFA / Anomaly Ultrasound Scan Due'
    ],
    ancSchedule: generateANCSchedule('2026-03-29', 'PHC Shirur'),
    vitalsHistory: [
      {
        id: 'vit_201',
        date: '2026-08-10',
        gestationalWeek: 20,
        systolicBP: 124,
        diastolicBP: 78,
        hemoglobin: 9.2,
        bloodSugar: 104,
        weightKg: 55.0,
        fundalHeightCm: 19,
        fetalHeartRate: 142,
        urineProtein: 'NIL',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: false,
          hasBlurredVision: false,
          hasFacialEdema: false,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.48,
        riskTier: 'YELLOW',
        riskReasons: ['Previous C-Section', 'Hb 9.2 g/dL'],
        recordedBy: 'Rekha Deshmukh (ASHA)',
        facility: 'Sanaswadi Sub-Centre',
        syncStatus: 'SYNCED'
      }
    ],
    prescriptions: [],
    audioNotes: [],
    pregnancy: {
      fetusCount: 1,
      presentation: 'UNKNOWN',
      growth: 'NORMAL',
      conditions: ['thyroid', 'hsv_genital'],
      conceptionEvents: ['recurrent_miscarriage'],
      priorComplications: ['miscarriage']
    },
    dpdpConsent: createDefaultDPDPConsent('mr', true, true, true),
    qrAuthToken: 'MS-AUTH-MH7215-SECURE',
    accessPin: '7391',
    registeredAt: '2026-04-10',
    lastSyncedAt: '2026-08-16T14:30:00Z'
  },
  {
    id: 'ben_003',
    rchId: 'MH-2026-4419',
    abhaId: '91-6623-1122-9901',
    name: 'Kavita Sachin Chavan',
    age: 22,
    phone: '+91 91588 33441',
    husbandName: 'Sachin Chavan',
    village: 'Pabal',
    ward: 'Junnar Rural Ward 04',
    district: 'Pune',
    assignedAsha: {
      name: 'Sunita Thorat',
      phone: '+91 97633 44556'
    },
    lmp: '2026-05-10',
    edd: calculateEDD('2026-05-10'),
    currentGestationalWeeks: 14,
    gravidity: 1,
    parity: 0,
    hasPrevCesarean: false,
    hasPastStillbirth: false,
    bloodGroup: 'A+',
    currentRiskTier: 'GREEN',
    mlRiskScore: 0.12,
    riskFactors: [],
    ancSchedule: generateANCSchedule('2026-05-10', 'PHC Pabal'),
    vitalsHistory: [
      {
        id: 'vit_301',
        date: '2026-07-28',
        gestationalWeek: 11,
        systolicBP: 116,
        diastolicBP: 74,
        hemoglobin: 11.8,
        bloodSugar: 88,
        weightKg: 48.0,
        fundalHeightCm: 11,
        fetalHeartRate: 152,
        urineProtein: 'NIL',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: false,
          hasBlurredVision: false,
          hasFacialEdema: false,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.12,
        riskTier: 'GREEN',
        riskReasons: [],
        recordedBy: 'Sunita Thorat (ASHA)',
        facility: 'PHC Pabal',
        syncStatus: 'SYNCED'
      }
    ],
    prescriptions: [],
    audioNotes: [],
    pregnancy: {
      fetusCount: 1,
      presentation: 'UNKNOWN',
      growth: 'NORMAL',
      conditions: [],
      conceptionEvents: [],
      priorComplications: []
    },
    dpdpConsent: createDefaultDPDPConsent('mr', true, true, true),
    qrAuthToken: 'MS-AUTH-MH4419-SECURE',
    accessPin: '1284',
    registeredAt: '2026-05-25',
    lastSyncedAt: '2026-08-15T09:00:00Z'
  },
  {
    id: 'ben_004',
    rchId: 'MH-2026-9032',
    abhaId: '91-8841-2940-1049',
    name: 'Meena Eknath Bhosale',
    age: 17, // Adolescent Pregnancy
    phone: '+91 93701 55662',
    husbandName: 'Eknath Bhosale',
    village: 'Talegaon Dhamdhere',
    ward: 'Shirur Rural Ward 03',
    district: 'Pune',
    assignedAsha: {
      name: 'Savita Patil',
      phone: '+91 97654 32101'
    },
    lmp: '2025-12-22',
    edd: calculateEDD('2025-12-22'),
    currentGestationalWeeks: 34,
    gravidity: 1,
    parity: 0,
    hasPrevCesarean: false,
    hasPastStillbirth: false,
    bloodGroup: 'AB+',
    currentRiskTier: 'RED',
    mlRiskScore: 0.94,
    riskFactors: [
      'Adolescent Pregnancy (Age 17 yrs)',
      'Severe Pre-eclampsia (BP 158/102 mmHg)',
      'Urine Protein 2+',
      'Severe Headache & Blurred Vision'
    ],
    ancSchedule: generateANCSchedule('2025-12-22', 'PHC Shirur'),
    vitalsHistory: [
      {
        id: 'vit_401',
        date: '2026-08-16',
        gestationalWeek: 34,
        systolicBP: 158,
        diastolicBP: 102,
        hemoglobin: 10.2,
        bloodSugar: 92,
        weightKg: 50.0,
        fundalHeightCm: 32,
        fetalHeartRate: 156,
        urineProtein: '2+',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: true,
          hasBlurredVision: true,
          hasFacialEdema: true,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.94,
        riskTier: 'RED',
        riskReasons: ['Age 17 yrs', 'BP 158/102', 'Urine Protein 2+', 'Severe Headache + Blurred Vision'],
        recordedBy: 'Savita Patil (ASHA)',
        facility: 'Talegaon Sub-Centre',
        syncStatus: 'SYNCED'
      }
    ],
    prescriptions: [
      {
        id: 'rx_502',
        date: '2026-08-16',
        doctorId: 'doc_101',
        doctorName: 'Dr. Rajesh Joshi',
        facility: 'PHC Shirur',
        diagnosis: 'Severe Pre-Eclampsia in Adolescent Primigravida (34 Weeks)',
        medications: [
          { name: 'Inj. Magnesium Sulfate (Pritchard Regimen)', dosage: 'Loading dose 4g IV + 10g IM', durationDays: 1 },
          { name: 'Tab Labetalol 200mg', dosage: '1 tab every 8 hours', durationDays: 7 }
        ],
        specialInstructions: 'IMMEDIATE 108 AMBULANCE DISPATCHED to District Hospital Pune (FRU/NICU ready).',
        referral: {
          required: true,
          referralFacility: 'Sassoon General Hospital / District Hospital Pune',
          reason: 'Impending Eclampsia & NICU preparedness for preterm delivery',
          urgency: 'EMERGENCY_108'
        }
      }
    ],
    audioNotes: [],
    pregnancy: {
      fetusCount: 1,
      presentation: 'BREECH',
      growth: 'NORMAL',
      conditions: ['hiv', 'hep_b'],
      conceptionEvents: ['threatened_miscarriage'],
      priorComplications: ['preeclampsia']
    },
    dpdpConsent: createDefaultDPDPConsent('mr', true, true, true),
    qrAuthToken: 'MS-AUTH-MH9032-SECURE',
    accessPin: '9421',
    registeredAt: '2026-01-12',
    lastSyncedAt: '2026-08-16T16:00:00Z'
  },
  {
    id: 'ben_005',
    rchId: 'MH-2026-6180',
    abhaId: '91-5509-3382-7714',
    name: 'Anjali Dnyaneshwar Waghmare',
    age: 26,
    phone: '+91 98602 11984',
    husbandName: 'Dnyaneshwar Waghmare',
    village: 'Narayangaon',
    ward: 'Junnar Rural Ward 02',
    district: 'Pune',
    assignedAsha: {
      name: 'Sunita Thorat',
      phone: '+91 97633 44556'
    },
    lmp: '2025-11-24',
    edd: calculateEDD('2025-11-24'),
    currentGestationalWeeks: 38,
    gravidity: 1,
    parity: 0,
    hasPrevCesarean: false,
    hasPastStillbirth: false,
    bloodGroup: 'B+',
    currentRiskTier: 'GREEN',
    mlRiskScore: 0.16,
    riskFactors: [
      'Term Delivery Preparation (38 Weeks)',
      'Institutional Delivery Bag Ready'
    ],
    ancSchedule: generateANCSchedule('2025-11-24', 'PHC Narayangaon'),
    vitalsHistory: [
      {
        id: 'vit_501',
        date: '2026-08-14',
        gestationalWeek: 38,
        systolicBP: 120,
        diastolicBP: 76,
        hemoglobin: 11.4,
        bloodSugar: 90,
        weightKg: 58.0,
        fundalHeightCm: 36,
        fetalHeartRate: 140,
        urineProtein: 'NIL',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: false,
          hasBlurredVision: false,
          hasFacialEdema: false,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.16,
        riskTier: 'GREEN',
        riskReasons: [],
        recordedBy: 'Sunita Thorat (ASHA)',
        facility: 'PHC Narayangaon',
        syncStatus: 'SYNCED'
      }
    ],
    prescriptions: [],
    audioNotes: [],
    pregnancy: {
      fetusCount: 1,
      presentation: 'CEPHALIC',
      growth: 'NORMAL',
      conditions: [],
      conceptionEvents: [],
      priorComplications: []
    },
    dpdpConsent: createDefaultDPDPConsent('mr', true, true, true),
    qrAuthToken: 'MS-AUTH-MH6180-SECURE',
    accessPin: '6180',
    registeredAt: '2025-12-10',
    lastSyncedAt: '2026-08-14T11:00:00Z'
  },
  {
    id: 'ben_006',
    rchId: 'MH-2026-1192',
    abhaId: '91-2291-7744-8833',
    name: 'Surekha Somnath Jadhav',
    age: 23,
    phone: '+91 97678 44120',
    husbandName: 'Somnath Jadhav',
    village: 'Chakan Rural',
    ward: 'Khed Rural Ward 01',
    district: 'Pune',
    assignedAsha: {
      name: 'Manjusha Shinde',
      phone: '+91 98223 99881'
    },
    lmp: '2026-06-20',
    edd: calculateEDD('2026-06-20'),
    currentGestationalWeeks: 8,
    gravidity: 1,
    parity: 0,
    hasPrevCesarean: false,
    hasPastStillbirth: false,
    bloodGroup: 'O+',
    currentRiskTier: 'GREEN',
    mlRiskScore: 0.08,
    riskFactors: [],
    ancSchedule: generateANCSchedule('2026-06-20', 'PHC Chakan'),
    vitalsHistory: [
      {
        id: 'vit_601',
        date: '2026-07-25',
        gestationalWeek: 5,
        systolicBP: 114,
        diastolicBP: 72,
        hemoglobin: 12.0,
        bloodSugar: 84,
        weightKg: 46.5,
        fundalHeightCm: 0,
        fetalHeartRate: 0,
        urineProtein: 'NIL',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: false,
          hasBlurredVision: false,
          hasFacialEdema: false,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.08,
        riskTier: 'GREEN',
        riskReasons: [],
        recordedBy: 'Manjusha Shinde (ASHA)',
        facility: 'PHC Chakan',
        syncStatus: 'SYNCED'
      }
    ],
    prescriptions: [],
    audioNotes: [],
    pregnancy: {
      fetusCount: 1,
      presentation: 'UNKNOWN',
      growth: 'NORMAL',
      conditions: ['malaria'],
      conceptionEvents: ['hyperemesis'],
      priorComplications: []
    },
    dpdpConsent: createDefaultDPDPConsent('mr', true, true, true),
    qrAuthToken: 'MS-AUTH-MH1192-SECURE',
    accessPin: '1192',
    registeredAt: '2026-07-15',
    lastSyncedAt: '2026-08-12T10:00:00Z'
  },
  {
    id: 'ben_007',
    rchId: 'MH-2026-3824',
    abhaId: '91-4411-9988-2233',
    name: 'Rukmini Balasaheb Kadam',
    age: 36, // Advanced Maternal Age
    phone: '+91 94235 66778',
    husbandName: 'Balasaheb Kadam',
    village: 'Malegaon Budruk',
    ward: 'Baramati Rural Ward 02',
    district: 'Pune',
    assignedAsha: {
      name: 'Alka Mane',
      phone: '+91 98902 44332'
    },
    lmp: '2026-02-15',
    edd: calculateEDD('2026-02-15'),
    currentGestationalWeeks: 26,
    gravidity: 5,
    parity: 4, // Grand Multiparity
    hasPrevCesarean: false,
    hasPastStillbirth: true,
    bloodGroup: 'A-',
    currentRiskTier: 'RED',
    mlRiskScore: 0.86,
    riskFactors: [
      'Advanced Maternal Age (36 yrs)',
      'Grand Multiparity (Gravida 5, Parity 4)',
      'Severe Gestational Diabetes (RBS 218 mg/dL)',
      'Rh Negative Blood Group (A-)',
      'Past Stillbirth History'
    ],
    ancSchedule: generateANCSchedule('2026-02-15', 'PHC Malegaon'),
    vitalsHistory: [
      {
        id: 'vit_701',
        date: '2026-08-11',
        gestationalWeek: 26,
        systolicBP: 136,
        diastolicBP: 88,
        hemoglobin: 9.8,
        bloodSugar: 218,
        weightKg: 64.0,
        fundalHeightCm: 26,
        fetalHeartRate: 146,
        urineProtein: 'TRACE',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: false,
          hasBlurredVision: false,
          hasFacialEdema: true,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.86,
        riskTier: 'RED',
        riskReasons: ['Age 36 yrs', 'RBS 218 mg/dL (Severe GDM)', 'Rh- Negative', 'Past Stillbirth'],
        recordedBy: 'Alka Mane (ASHA)',
        facility: 'PHC Malegaon',
        syncStatus: 'SYNCED'
      }
    ],
    prescriptions: [
      {
        id: 'rx_503',
        date: '2026-08-11',
        doctorId: 'doc_102',
        doctorName: 'Dr. Anita Pawar (MD OB-GYN)',
        facility: 'Sub-District Hospital Baramati',
        diagnosis: 'Gestational Diabetes Mellitus (Uncontrolled) + Rh Negative Pregnancy (26 wks)',
        medications: [
          { name: 'Inj. Human Mixtard Insulin 30/70 (10 units morning, 6 units night before food)', dosage: 'SC daily as prescribed', durationDays: 30 },
          { name: 'Inj. Anti-D Immunoglobulin 300 mcg', dosage: 'Single IM dose at 28 weeks', durationDays: 1 }
        ],
        specialInstructions: 'Daily fasting and post-prandial blood sugar monitoring. Mandatory ultrasound for fetal macrosomia on PMSMA 9th Sept.',
        referral: {
          required: true,
          referralFacility: 'Government Medical College & Hospital Baramati',
          reason: 'Glycemic stabilization and Anti-D administration',
          urgency: 'URGENT'
        },
        pmsmaNextSlotDate: '2026-09-09'
      }
    ],
    audioNotes: [],
    pregnancy: {
      fetusCount: 1,
      presentation: 'TRANSVERSE',
      growth: 'LARGE_FOR_DATES',
      conditions: ['preex_diabetes', 'heart'],
      conceptionEvents: ['rh_neg'],
      priorComplications: ['stillbirth', 'gdm']
    },
    dpdpConsent: createDefaultDPDPConsent('mr', true, true, true),
    qrAuthToken: 'MS-AUTH-MH3824-SECURE',
    accessPin: '3824',
    registeredAt: '2026-03-01',
    lastSyncedAt: '2026-08-14T15:00:00Z'
  },
  {
    id: 'ben_008',
    rchId: 'MH-2026-5571',
    abhaId: '91-7712-4499-1100',
    name: 'Varsha Santosh Tambe',
    age: 25,
    phone: '+91 98812 77334',
    husbandName: 'Santosh Tambe',
    village: 'Manchar Rural',
    ward: 'Ambegaon Rural Ward 01',
    district: 'Pune',
    assignedAsha: {
      name: 'Rupali Bhor',
      phone: '+91 97655 88990'
    },
    lmp: '2026-01-10',
    edd: calculateEDD('2026-01-10'),
    currentGestationalWeeks: 31,
    gravidity: 2,
    parity: 1,
    hasPrevCesarean: false,
    hasPastStillbirth: false,
    bloodGroup: 'B+',
    currentRiskTier: 'YELLOW',
    mlRiskScore: 0.38,
    riskFactors: [
      'Moderate Anemia (Hb 9.8 g/dL)',
      'Overdue for ANC 4 visit by 8 days'
    ],
    ancSchedule: generateANCSchedule('2026-01-10', 'PHC Manchar'),
    vitalsHistory: [
      {
        id: 'vit_801',
        date: '2026-07-15',
        gestationalWeek: 26,
        systolicBP: 122,
        diastolicBP: 78,
        hemoglobin: 9.8,
        bloodSugar: 106,
        weightKg: 53.0,
        fundalHeightCm: 25,
        fetalHeartRate: 142,
        urineProtein: 'NIL',
        symptoms: {
          hasVaginalBleeding: false,
          hasSevereHeadache: false,
          hasBlurredVision: false,
          hasFacialEdema: false,
          hasReducedFetalMovement: false,
          hasConvulsions: false,
          hasHighFever: false
        },
        mlRiskScore: 0.38,
        riskTier: 'YELLOW',
        riskReasons: ['Hb 9.8 g/dL', 'Overdue ANC visit'],
        recordedBy: 'Rupali Bhor (ASHA)',
        facility: 'PHC Manchar',
        syncStatus: 'SYNCED'
      }
    ],
    prescriptions: [],
    audioNotes: [],
    dpdpConsent: createDefaultDPDPConsent('mr', true, true, true),
    qrAuthToken: 'MS-AUTH-MH5571-SECURE',
    accessPin: '5571',
    registeredAt: '2026-02-05',
    lastSyncedAt: '2026-08-11T12:00:00Z'
  }
];
