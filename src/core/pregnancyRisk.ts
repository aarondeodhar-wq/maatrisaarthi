// Pregnancy-specific risk factors: multiple pregnancy, fetal presentation, growth,
// past pregnancy complications, complications at conception, pre-existing diseases,
// and preterm-labour risk.
//
// IMPORTANT: every weight below is hand-set from clinical guidance (WHO / MoHFW India style
// antenatal risk lists). None of them was learned from data, and none is validated. They are
// added to the rule score in mlRiskEngine.ts. The trained tree only sees age, BP and sugar.

export interface ExplainItem {
  feature: string;
  value: string | number;
  contribution: 'HIGH_RISK' | 'MODERATE_RISK' | 'NORMAL';
  impactScore: number;
  reason: { mr: string; hi: string; en: string };
}

export interface PregnancyProfile {
  fetusCount: 1 | 2 | 3;                                   // 3 = triplets or more
  presentation: 'CEPHALIC' | 'BREECH' | 'TRANSVERSE' | 'UNKNOWN';
  growth: 'NORMAL' | 'SMALL_FOR_DATES' | 'LARGE_FOR_DATES' | 'UNKNOWN';
  conditions: string[];         // ids from PRE_EXISTING_CONDITIONS
  conceptionEvents: string[];   // ids from CONCEPTION_EVENTS
  priorComplications: string[]; // ids from PRIOR_COMPLICATIONS
  scanVisitId?: string;         // visit_logs id of the scan that opened the editing window (checked by firestore.rules)
}

export interface PregnancyInput {
  gestationalWeeks?: number;
  pregnancy?: Partial<PregnancyProfile>;
  hasRegularContractions?: boolean;
  hasLeakingFluid?: boolean;
  hasLowerAbdominalPain?: boolean;
  hasBleeding?: boolean;
}

export interface FactorDef {
  id: string;
  label: string;
  points: number;   // added to the rule score when present
  babyEffect: string;
}

export const PRE_EXISTING_CONDITIONS: FactorDef[] = [
  { id: 'hiv', label: 'HIV', points: 0.30, babyEffect: 'Mother-to-child transmission, low birth weight, preterm birth' },
  { id: 'syphilis', label: 'Syphilis', points: 0.35, babyEffect: 'Stillbirth, congenital syphilis, neonatal death' },
  { id: 'hep_b', label: 'Hepatitis B', points: 0.10, babyEffect: 'Transmission at birth (baby needs vaccine + HBIG)' },
  { id: 'hep_c', label: 'Hepatitis C', points: 0.10, babyEffect: 'Transmission to baby, chronic liver disease' },
  { id: 'sti_gc_ct', label: 'Gonorrhoea / Chlamydia', points: 0.15, babyEffect: 'Preterm birth, neonatal eye infection (ophthalmia)' },
  { id: 'hsv_genital', label: 'Genital Herpes (HSV-2)', points: 0.20, babyEffect: 'Severe neonatal herpes infection; C-section if active lesion' },
  { id: 'tb', label: 'Tuberculosis (TB)', points: 0.25, babyEffect: 'Low birth weight; congenital TB risk; treatment required' },
  { id: 'malaria', label: 'Malaria (current or recent)', points: 0.20, babyEffect: 'Maternal anemia, low birth weight, stillbirth' },
  { id: 'chronic_htn', label: 'Chronic hypertension', points: 0.35, babyEffect: 'Growth restriction (IUGR), preterm birth, pre-eclampsia' },
  { id: 'preex_diabetes', label: 'Pre-existing diabetes (Type 1/2)', points: 0.30, babyEffect: 'Congenital anomalies, macrosomia (large baby), stillbirth' },
  { id: 'thyroid', label: 'Thyroid disorder (Hypo/Hyper)', points: 0.10, babyEffect: 'Fetal neurodevelopment & IQ risk if untreated' },
  { id: 'heart', label: 'Heart disease', points: 0.35, babyEffect: 'Maternal heart failure, fetal hypoxia, growth restriction' },
  { id: 'kidney', label: 'Kidney disease', points: 0.30, babyEffect: 'Pre-eclampsia, preterm birth, growth restriction' },
  { id: 'epilepsy', label: 'Epilepsy / Seizure disorder', points: 0.15, babyEffect: 'Antiepileptic drug exposure; risk of hypoxia during seizures' },
  { id: 'sickle', label: 'Sickle cell disease / Thalassemia', points: 0.30, babyEffect: 'Vaso-occlusive pain crisis, severe anemia, preterm birth' }
];

export const CONCEPTION_EVENTS: FactorDef[] = [
  { id: 'ectopic', label: 'Ectopic pregnancy (this or earlier)', points: 0.35, babyEffect: 'Tubal rupture risk to mother; no viable baby' },
  { id: 'assisted', label: 'Conceived with IVF / IUI', points: 0.10, babyEffect: 'Higher chance of twins, preterm birth, placenta problems' },
  { id: 'threatened_miscarriage', label: 'Bleeding in early pregnancy (threatened miscarriage)', points: 0.30, babyEffect: 'Risk of miscarriage' },
  { id: 'recurrent_miscarriage', label: 'Recurrent miscarriage (2 or more)', points: 0.25, babyEffect: 'Repeat loss; needs cause investigation' },
  { id: 'hyperemesis', label: 'Severe vomiting (hyperemesis)', points: 0.15, babyEffect: 'Poor maternal nutrition, low birth weight' },
  { id: 'rh_neg', label: 'Rh-negative, not immunised (anti-D due)', points: 0.10, babyEffect: 'Rhesus haemolytic disease in later pregnancy' }
];

export const PRIOR_COMPLICATIONS: FactorDef[] = [
  { id: 'preterm', label: 'Previous preterm birth', points: 0.30, babyEffect: 'Strongest predictor of another preterm birth' },
  { id: 'stillbirth', label: 'Previous stillbirth', points: 0.35, babyEffect: 'Higher risk of stillbirth again' },
  { id: 'miscarriage', label: 'Previous miscarriage', points: 0.10, babyEffect: 'Slightly higher risk of early loss' },
  { id: 'preeclampsia', label: 'Previous pre-eclampsia / eclampsia', points: 0.35, babyEffect: 'Repeat pre-eclampsia, preterm birth' },
  { id: 'gdm', label: 'Previous gestational diabetes', points: 0.20, babyEffect: 'Repeat diabetes in pregnancy' },
  { id: 'pph', label: 'Previous postpartum haemorrhage', points: 0.25, babyEffect: 'Repeat bleeding after delivery' },
  { id: 'small_baby', label: 'Previous small baby (growth restriction)', points: 0.25, babyEffect: 'Repeat growth restriction' },
  { id: 'neonatal_death', label: 'Previous neonatal death', points: 0.35, babyEffect: 'Needs specialist review of cause' }
];

// Factors counted toward preterm-labour risk
const PRETERM_CONDITION_IDS = ['syphilis', 'sti_gc_ct', 'hsv_genital', 'chronic_htn', 'kidney', 'hiv', 'sickle'];
const PRETERM_PRIOR_IDS = ['preterm'];

export interface PregnancyEvaluation {
  points: number;
  explainability: ExplainItem[];
  hardRed: boolean;          // forces RED regardless of score
  emergency108: boolean;     // needs ambulance
  pretermRisk: { level: 'LOW' | 'MODERATE' | 'HIGH'; reasons: string[] };
}

const label = (defs: FactorDef[], id: string) => defs.find(d => d.id === id)?.label ?? id;

export function evaluatePregnancyFactors(input: PregnancyInput): PregnancyEvaluation {
  const p = input.pregnancy || {};
  const weeks = input.gestationalWeeks ?? 0;
  const items: ExplainItem[] = [];
  let points = 0;
  let hardRed = false;
  let emergency108 = false;
  const preterm: string[] = [];

  const add = (feature: string, value: string, pts: number, text: string, contribution: ExplainItem['contribution'] = 'HIGH_RISK') => {
    points += pts;
    items.push({
      feature,
      value,
      contribution,
      impactScore: Math.min(99, Math.round(pts * 100)),
      reason: { mr: text, hi: text, en: text }
    });
  };

  // Multiple pregnancy
  if (p.fetusCount === 2) {
    add('Multiple pregnancy', 'Twins', 0.35, 'Twin pregnancy: higher risk of preterm birth, pre-eclampsia and growth restriction');
    preterm.push('Twin pregnancy');
  } else if (p.fetusCount === 3) {
    add('Multiple pregnancy', 'Triplets or more', 0.60, 'Triplets or more: very high risk of preterm birth');
    preterm.push('Triplets or more');
  }

  // Fetal presentation (breech / transverse matters most from 36 weeks)
  if (p.presentation === 'BREECH' || p.presentation === 'TRANSVERSE') {
    const name = p.presentation === 'BREECH' ? 'Breech presentation' : 'Transverse lie';
    if (weeks >= 36) {
      add('Fetal placement', name, 0.30, `${name} at ${weeks} weeks: refer for delivery planning`);
    } else {
      add('Fetal placement', name, 0, `${name} before 36 weeks: often corrects; re-check at 36 weeks`, 'MODERATE_RISK');
    }
  }

  // Abnormal growth (from fundal height / ultrasound)
  if (p.growth === 'SMALL_FOR_DATES') {
    add('Fetal growth', 'Small for dates', 0.30, 'Suspected growth restriction: needs ultrasound and specialist review');
  } else if (p.growth === 'LARGE_FOR_DATES') {
    add('Fetal growth', 'Large for dates', 0.20, 'Suspected large baby: test for gestational diabetes', 'MODERATE_RISK');
  }

  // Pre-existing diseases
  for (const id of p.conditions || []) {
    const d = PRE_EXISTING_CONDITIONS.find(c => c.id === id);
    if (!d) continue;
    add('Pre-existing disease', d.label, d.points, `${d.label}: ${d.babyEffect}`);
    if (PRETERM_CONDITION_IDS.includes(id)) preterm.push(d.label);
  }

  // Complications at conception
  for (const id of p.conceptionEvents || []) {
    const d = CONCEPTION_EVENTS.find(c => c.id === id);
    if (!d) continue;
    add('Complication at conception', d.label, d.points, `${d.label}: ${d.babyEffect}`);
    if (id === 'assisted') preterm.push('Assisted conception');
  }

  // Past pregnancy complications
  for (const id of p.priorComplications || []) {
    const d = PRIOR_COMPLICATIONS.find(c => c.id === id);
    if (!d) continue;
    add('Past pregnancy complication', d.label, d.points, `${d.label}: ${d.babyEffect}`);
    if (PRETERM_PRIOR_IDS.includes(id)) preterm.push(d.label);
  }

  // Preterm labour: symptoms before 37 completed weeks
  const beforeTerm = weeks > 0 && weeks < 37;
  if (beforeTerm && (input.hasRegularContractions || input.hasLeakingFluid)) {
    hardRed = true;
    emergency108 = true;
    add('Preterm labour', 'Contractions / fluid leak', 0.80,
      `Possible preterm labour at ${weeks} weeks (before 37 completed weeks): emergency referral`, 'HIGH_RISK');
  } else if (beforeTerm && input.hasLowerAbdominalPain) {
    add('Preterm labour', 'Lower abdominal pain', 0.20,
      `Lower abdominal pain at ${weeks} weeks: check for early labour`, 'MODERATE_RISK');
  }

  // Preterm-labour risk level (counts factors that raise the chance of labour before 37 weeks)
  const level: 'LOW' | 'MODERATE' | 'HIGH' = preterm.length >= 2 ? 'HIGH' : preterm.length === 1 ? 'MODERATE' : 'LOW';
  const pretermRisk = { level, reasons: preterm };
  items.push({
    feature: 'Preterm-labour risk',
    value: level,
    contribution: level === 'HIGH' ? 'HIGH_RISK' : level === 'MODERATE' ? 'MODERATE_RISK' : 'NORMAL',
    impactScore: level === 'HIGH' ? 70 : level === 'MODERATE' ? 40 : 0,
    reason: {
      mr: preterm.length ? `अकाली प्रसूती धोका ${level}: ${preterm.join(', ')}` : 'अकाली प्रसूती धोका कमी',
      hi: preterm.length ? `समय से पहले प्रसव का जोखिम ${level}: ${preterm.join(', ')}` : 'समय से पहले प्रसव का जोखिम कम',
      en: preterm.length
        ? `Preterm-labour risk ${level} (before 37 weeks): ${preterm.join(', ')}`
        : 'Preterm-labour risk low: no preterm factors recorded'
    }
  });

  return { points, explainability: items, hardRed, emergency108, pretermRisk };
}
