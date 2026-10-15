// Core Data Models for MaatriSaarthi Safe Motherhood Platform

export type Language = 'mr' | 'hi' | 'en';

export type UserRole = 'ASHA_WORKER' | 'PHC_DOCTOR' | 'WARD_OFFICER' | 'MOTHER';

export type RiskTier = 'RED' | 'YELLOW' | 'GREEN';

export type ANCContactStatus = 'COMPLETED' | 'PENDING' | 'OVERDUE' | 'MISSED';

export interface DPDPConsent {
  optIn: boolean;
  purposeLimitation: string; // e.g. "Safe Motherhood Tracking & Clinical Emergency Alerts"
  consentDate: string;
  channels: {
    sms: boolean;
    whatsapp: boolean;
    voiceCall: boolean;
  };
  preferredLanguage: Language;
  canWithdraw: boolean;
  withdrawalDate?: string;
  auditTrail: Array<{
    timestamp: string;
    action: 'GRANTED' | 'MODIFIED' | 'REVOKED' | 'DATA_ACCESSED';
    actor: string;
    detail: string;
  }>;
}

import type { PregnancyProfile } from '../core/pregnancyRisk';

export interface VitalRecord {
  id: string;
  date: string;
  gestationalWeek: number;
  systolicBP: number;       // mmHg
  diastolicBP: number;      // mmHg
  hemoglobin: number;       // g/dL
  bloodSugar: number;       // mg/dL (Random / Fasting)
  weightKg: number;
  fundalHeightCm?: number;
  fetalHeartRate?: number;  // bpm (120-160 normal)
  spO2?: number;            // % oxygen saturation (pulse oximeter), used by the triage rules
  bodyTempF?: number;       // °F, used by the triage rules and the trained tree
  heartRate?: number;       // bpm (resting), used by the triage rules and the trained tree
  scanVisitId?: string;     // visit_logs id of the QR scan / PIN unlock that opened the editing window
  urineProtein: 'NIL' | 'TRACE' | '1+' | '2+' | '3+';
  symptoms: {
    hasVaginalBleeding: boolean;
    hasSevereHeadache: boolean;
    hasBlurredVision: boolean;
    hasFacialEdema: boolean;
    hasReducedFetalMovement: boolean;
    hasConvulsions: boolean;
    hasHighFever: boolean;
    hasRegularContractions?: boolean;   // preterm-labour signs (only meaningful before 37 weeks)
    hasLeakingFluid?: boolean;
    hasLowerAbdominalPain?: boolean;
  };
  mlRiskScore: number;      // 0.0 to 1.0 probability
  riskTier: RiskTier;
  riskReasons: string[];
  recordedBy: string;       // ASHA name or Doctor (display only)
  recordedByUid?: string;   // Firebase uid of the signed-in staff member who recorded it (enforced by firestore.rules)
  recordedAt?: string;      // ISO timestamp of when it was recorded on the device
  facility: string;
  syncStatus: 'LOCAL' | 'SYNCED' | 'CONFLICT';
}

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy: number;         // metres
}

// How a visit was recorded. QR and PIN actions open a mother's record; the others write to it.
export type VisitAction = 'SCAN_QR' | 'PIN_UNLOCK' | 'RECORD_VITALS' | 'REGISTER_MOTHER' | 'VISIT_CONFIRMED';

// One row of visit_logs/{id}: written once, never edited. ashaUid is checked against
// request.auth.uid by firestore.rules, and syncedAt is the server's own clock.
export interface VisitLog {
  id: string;
  ashaUid: string;
  ashaName: string;
  beneficiaryId: string;
  action: VisitAction;
  verified: boolean;        // true when the mother's consent PIN was entered at the visit
  motherConfirmed?: boolean; // true when the mother confirmed this visit with the ASHA's one-time code (checked by firestore.rules)
  clientAt: string;         // device time of the visit (ISO)
  geo?: GeoPoint;           // absent when location was denied or unavailable
}

export interface ANCContact {
  contactNo: number;        // 1 to 8
  title: {
    mr: string;
    hi: string;
    en: string;
  };
  targetWeek: number;
  windowWeeksMin: number;
  windowWeeksMax: number;
  targetDate: string;
  dueDate: string;
  status: ANCContactStatus;
  completedDate?: string;
  isPMSMA: boolean;          // Pradhan Mantri Surakshit Matritva Abhiyan (9th of month)
  coreChecklist: {
    mr: string[];
    hi: string[];
    en: string[];
  };
  assignedFacility: string;
  notes?: string;
}

export interface DoctorPrescription {
  id: string;
  date: string;
  recordedByUid?: string;   // set when a field worker (not a doctor) records a medicine
  scanVisitId?: string;     // visit_logs id of the QR scan / PIN unlock that opened the editing window
  doctorId: string;
  doctorName: string;
  facility: string;
  diagnosis: string;
  medications: Array<{
    name: string;           // e.g. "IFA (Iron Folic Acid) 100mg", "Calcium Carbonate 500mg"
    dosage: string;         // e.g. "1 tablet daily after food"
    durationDays: number;
  }>;
  specialInstructions: string;
  referral?: {
    required: boolean;
    referralFacility: string; // e.g. "Sub-District Hospital Shirur (FRU)"
    reason: string;
    urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY_108';
  };
  pmsmaNextSlotDate?: string;
}

export interface AudioNote {
  id: string;
  timestamp: string;
  recordedBy: string;       // e.g. "ASHA Savita Patil"
  durationSec: number;
  title: string;
  transcript: {
    mr: string;
    hi: string;
    en: string;
  };
  resolved: boolean;
  doctorReply?: string;
}

export interface Beneficiary {
  id: string;
  rchId: string;            // Reproductive Child Health ID (e.g. "MH-2026-8941")
  abhaId?: string;          // Ayushman Bharat Health Account (e.g. "91-4829-1029-4821")
  name: string;
  age: number;
  phone: string;
  husbandName: string;
  village: string;
  ward: string;
  district: string;
  assignedAsha: {
    name: string;
    phone: string;
  };
  lmp: string;              // Last Menstrual Period (YYYY-MM-DD)
  edd: string;              // Expected Delivery Date (YYYY-MM-DD)
  currentGestationalWeeks: number;
  gravidity: number;        // Total pregnancies
  parity: number;           // Deliveries
  hasPrevCesarean: boolean;
  hasPastStillbirth: boolean;
  bloodGroup: string;       // e.g. "B+", "O-", "AB+"
  currentRiskTier: RiskTier;
  mlRiskScore: number;
  riskFactors: string[];
  ancSchedule: ANCContact[];
  vitalsHistory: VitalRecord[];
  prescriptions: DoctorPrescription[];
  pregnancy?: PregnancyProfile;   // multiple pregnancy, placement, growth, diseases, complications (see core/pregnancyRisk.ts)
  audioNotes: AudioNote[];
  dpdpConsent: DPDPConsent;
  qrAuthToken: string;      // Cryptographic QR token for instant doctor scanning
  accessPin: string;        // 4-digit offline consent unlock PIN (e.g. "4829")
  ownerUid?: string;        // Firebase uid of the mother's own account, if she self-registered
  assignedAshaUid?: string; // Firebase uid of the ASHA worker responsible for this mother
  homeLocation?: GeoPoint;  // GPS fix taken at registration; visit distances are measured from here
  registeredAt: string;
  lastSyncedAt: string;
}

// Aggregate ward indicators. null means "not available": either the app does not
// collect the underlying data, or the figure is withheld because the cohort is
// smaller than kThreshold (suppressed === true).
export interface WardMCHMetrics {
  wardName: string;
  kThreshold: number;
  suppressed: boolean;
  totalPregnantMothers: number | null;
  highRiskCount: number | null;
  moderateRiskCount: number | null;
  normalRiskCount: number | null;
  earlyRegistrationPercent: number | null;      // registered at <= 12 weeks gestation
  anc4CompletionPercent: number | null;
  highRiskDetectionPercent: number | null;       // RED + YELLOW share of cohort
  severeAnemiaPercent: number | null;            // latest Hb < 7 g/dL
  gestationalHypertensionPercent: number | null; // latest BP >= 140/90
  gestationalDiabetesPercent: number | null;     // latest random blood sugar >= 140 mg/dL
  ultrasoundScanCoveragePercent: number | null;  // not collected by the app
  institutionalDeliveryPlanPercent: number | null; // not collected by the app
  pncCompletionPercent: number | null;           // not collected by the app
  ifaStockDaysRemaining: number | null;          // no stock feed connected
  emergency108TransfersThisMonth: number | null; // no 108 integration
}

export interface SubCentreSummary {
  name: string;
  mothers: number;
  highRisk: number;
  anc4Percent: number | null;
  ashaCount: number;
  status: 'OK' | 'REVIEW';
}

export interface MLModelBenchmark {
  datasetName: string;
  totalRecords: number;
  features: string[];
  highRiskSensitivity: number; // >= 85% target
  highRiskSpecificity: number;
  overallAccuracy: number;
  f1Score: number;
  rocAuc: number;
  confusionMatrix: {
    trueHighRisk_predictedHigh: number;
    trueHighRisk_predictedLow: number;
    trueLowRisk_predictedHigh: number;
    trueLowRisk_predictedLow: number;
  };
  featureImportance: Array<{
    feature: string;
    weight: number;
    description: string;
  }>;
}

export interface NotificationTemplate {
  id: string;
  type: 'ANC_DUE' | 'PMSMA_CAMP' | 'HIGH_RISK_ALERT' | 'IFA_NUTRITION' | 'EMERGENCY_SOS';
  title: string;
  category: 'Routine' | 'Specialist' | 'Emergency' | 'Adherence';
  templates: {
    mr: string;
    hi: string;
    en: string;
  };
}

export interface SentNotificationLog {
  id: string;
  timestamp: string;
  beneficiaryId: string;
  beneficiaryName: string;
  phone: string;
  channel: 'SMS' | 'WHATSAPP';
  language: Language;
  templateType: string;
  messageContent: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CONSENT_BLOCKED';
  dpdpConsentVerified: boolean;
}

// One-time visit code an ASHA worker issues for a mother. Stored at visit_codes/{beneficiaryId},
// so issuing a new code replaces (and so invalidates) the previous one.
export interface VisitCode {
  id: string;               // = beneficiaryId
  ashaUid: string;
  ashaName: string;
  code: string;             // 6 digits
  createdAt: number;        // epoch ms
  expiresAt: number;        // epoch ms
  confirmedAt: number | null;
  confirmedByUid?: string;
}
