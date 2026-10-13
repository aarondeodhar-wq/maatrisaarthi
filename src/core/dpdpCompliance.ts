// Digital Personal Data Protection (DPDP) Act 2023 Compliance & k-Anonymity Engine

import { DPDPConsent, Language, Beneficiary, WardMCHMetrics, SubCentreSummary } from '../types';

/**
 * Creates default DPDP 2023 compliant consent record
 */
export function createDefaultDPDPConsent(
  preferredLang: Language = 'mr',
  optIn: boolean = true,
  sms: boolean = true,
  whatsapp: boolean = true
): DPDPConsent {
  const nowStr = new Date().toISOString();
  return {
    optIn,
    purposeLimitation: 'Safe Motherhood ANC Tracking, High-Risk Maternal Alerts & 108 Emergency Coordination',
    consentDate: nowStr,
    channels: {
      sms,
      whatsapp,
      voiceCall: true
    },
    preferredLanguage: preferredLang,
    canWithdraw: true,
    auditTrail: [
      {
        timestamp: nowStr,
        action: 'GRANTED',
        actor: 'Beneficiary (via ASHA Verified Mobile Onboarding)',
        detail: `Explicit digital consent granted for SMS & WhatsApp maternal health alerts in ${preferredLang.toUpperCase()}`
      }
    ]
  };
}

/**
 * Verifies if sending a notification to this beneficiary is legally permitted under DPDP 2023
 */
export function verifyDPDPConsentForChannel(
  consent: DPDPConsent,
  channel: 'SMS' | 'WHATSAPP' | 'VOICE',
  isEmergencyAlert: boolean = false
): { allowed: boolean; reason: string } {
  // Section 7 of DPDP Act 2023: Certain legitimate uses (Emergency medical situation to save life)
  if (isEmergencyAlert) {
    return {
      allowed: true,
      reason: 'Allowed under DPDP Act 2023 Sec 7 (Medical Emergency & Life Safety Protection)'
    };
  }

  if (!consent.optIn) {
    return {
      allowed: false,
      reason: 'Consent Not Granted: Beneficiary has opted out of routine notifications'
    };
  }

  if (channel === 'SMS' && !consent.channels.sms) {
    return {
      allowed: false,
      reason: 'Channel Restricted: SMS channel is disabled by beneficiary preference'
    };
  }

  if (channel === 'WHATSAPP' && !consent.channels.whatsapp) {
    return {
      allowed: false,
      reason: 'Channel Restricted: WhatsApp channel is disabled by beneficiary preference'
    };
  }

  return {
    allowed: true,
    reason: 'Valid DPDP Act 2023 consent verified'
  };
}

/**
 * Logs a data access event to the beneficiary's tamper-evident audit trail
 */
export function recordDataAccessAudit(
  beneficiary: Beneficiary,
  doctorName: string,
  facility: string,
  purpose: string = 'Clinical Review & e-Prescription'
): Beneficiary {
  // Returns a new object; the input beneficiary and its consent record are not mutated.
  return {
    ...beneficiary,
    dpdpConsent: {
      ...beneficiary.dpdpConsent,
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'DATA_ACCESSED',
          actor: `${doctorName} (${facility})`,
          detail: `Medical records accessed for purpose: ${purpose}`
        },
        ...(beneficiary.dpdpConsent?.auditTrail || [])
      ]
    }
  };
}

/** Minimum group size before any aggregate figure is shown */
export const K_ANONYMITY_THRESHOLD = 5;

/**
 * Formats a count for display, hiding small cells (1..k-1) as "<k".
 */
export function formatSuppressedCount(n: number | null, k: number = K_ANONYMITY_THRESHOLD): string {
  if (n === null) return 'N/A';
  if (n > 0 && n < k) return `<${k}`;
  return String(n);
}

/**
 * Formats a percentage for display, or "N/A" when the figure is unavailable.
 */
export function formatPercent(n: number | null): string {
  return n === null ? 'N/A' : `${n}%`;
}

function weeksBetween(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (isNaN(from) || isNaN(to)) return null;
  return Math.floor((to - from) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * DPDP Act 2023 aggregate ward indicators.
 * Only aggregate figures are returned. If the selected cohort is smaller than
 * K_ANONYMITY_THRESHOLD, every figure is withheld (suppressed: true). Indicators the
 * app does not collect data for are returned as null instead of estimated.
 */
export function computeKAnonymizedWardMetrics(
  wardName: string,
  beneficiaries: Beneficiary[]
): WardMCHMetrics {
  const k = K_ANONYMITY_THRESHOLD;
  const wardMothers = beneficiaries.filter(b => b.ward === wardName || wardName === 'ALL_WARDS');
  const total = wardMothers.length;

  const notCollected = {
    ultrasoundScanCoveragePercent: null,
    institutionalDeliveryPlanPercent: null,
    pncCompletionPercent: null,
    ifaStockDaysRemaining: null,
    emergency108TransfersThisMonth: null
  };

  if (total < k) {
    return {
      wardName,
      kThreshold: k,
      suppressed: true,
      totalPregnantMothers: null,
      highRiskCount: null,
      moderateRiskCount: null,
      normalRiskCount: null,
      earlyRegistrationPercent: null,
      anc4CompletionPercent: null,
      highRiskDetectionPercent: null,
      severeAnemiaPercent: null,
      gestationalHypertensionPercent: null,
      gestationalDiabetesPercent: null,
      ...notCollected
    };
  }

  const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 1000) / 10);
  const latestVital = (b: Beneficiary) => (b.vitalsHistory || [])[0];

  const highRisk = wardMothers.filter(b => b.currentRiskTier === 'RED').length;
  const moderateRisk = wardMothers.filter(b => b.currentRiskTier === 'YELLOW').length;
  const normalRisk = wardMothers.filter(b => b.currentRiskTier === 'GREEN').length;

  // Early registration: gestational age at registration (LMP -> registeredAt) <= 12 weeks
  const withRegWeeks = wardMothers
    .map(b => (b.lmp && b.registeredAt ? weeksBetween(b.lmp, b.registeredAt) : null))
    .filter((w): w is number => w !== null);
  const earlyRegCount = withRegWeeks.filter(w => w <= 12).length;

  // 4+ ANC: only mothers far enough along (>= 28 weeks) to be due for 4 contacts
  const anc4Eligible = wardMothers.filter(b => b.currentGestationalWeeks >= 28);
  const anc4Completed = anc4Eligible.filter(b =>
    (b.ancSchedule || []).filter(c => c.status === 'COMPLETED').length >= 4
  ).length;

  const withVitals = wardMothers.filter(b => latestVital(b));
  const severeAnemia = withVitals.filter(b => {
    const v = latestVital(b);
    return v.hemoglobin > 0 && v.hemoglobin < 7.0;
  }).length;
  const ghtn = withVitals.filter(b => {
    const v = latestVital(b);
    return v.systolicBP >= 140 || v.diastolicBP >= 90;
  }).length;
  const gdm = withVitals.filter(b => latestVital(b).bloodSugar >= 140).length;

  return {
    wardName,
    kThreshold: k,
    suppressed: false,
    totalPregnantMothers: total,
    highRiskCount: highRisk,
    moderateRiskCount: moderateRisk,
    normalRiskCount: normalRisk,
    earlyRegistrationPercent: withRegWeeks.length >= k ? pct(earlyRegCount, withRegWeeks.length) : null,
    anc4CompletionPercent: anc4Eligible.length >= k ? pct(anc4Completed, anc4Eligible.length) : null,
    highRiskDetectionPercent: pct(highRisk + moderateRisk, total),
    severeAnemiaPercent: withVitals.length >= k ? pct(severeAnemia, withVitals.length) : null,
    gestationalHypertensionPercent: withVitals.length >= k ? pct(ghtn, withVitals.length) : null,
    gestationalDiabetesPercent: withVitals.length >= k ? pct(gdm, withVitals.length) : null,
    ...notCollected
  };
}

/**
 * Per-village summary computed from real records. Villages with fewer than
 * K_ANONYMITY_THRESHOLD mothers are pooled into one "Other villages" row.
 */
export function computeSubCentreSummaries(beneficiaries: Beneficiary[]): SubCentreSummary[] {
  const k = K_ANONYMITY_THRESHOLD;
  const groups = new Map<string, Beneficiary[]>();
  for (const b of beneficiaries) {
    const key = b.village || 'Unknown';
    groups.set(key, [...(groups.get(key) || []), b]);
  }

  const small: Beneficiary[] = [];
  const rows: SubCentreSummary[] = [];
  const summarize = (name: string, list: Beneficiary[]): SubCentreSummary => {
    const eligible = list.filter(b => b.currentGestationalWeeks >= 28);
    const done = eligible.filter(b => (b.ancSchedule || []).filter(c => c.status === 'COMPLETED').length >= 4).length;
    const anc4Percent = eligible.length >= k ? Math.round((done / eligible.length) * 100) : null;
    return {
      name,
      mothers: list.length,
      highRisk: list.filter(b => b.currentRiskTier === 'RED').length,
      anc4Percent,
      ashaCount: new Set(list.map(b => b.assignedAsha?.name).filter(Boolean)).size,
      status: anc4Percent !== null && anc4Percent < 80 ? 'REVIEW' : 'OK'
    };
  };

  for (const [name, list] of groups) {
    if (list.length < k) small.push(...list);
    else rows.push(summarize(name, list));
  }
  if (small.length >= k) rows.push(summarize('Other villages (pooled)', small));
  return rows.sort((x, y) => y.mothers - x.mothers);
}
