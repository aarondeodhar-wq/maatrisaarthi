// GoI RMNCH+A & WHO 2016 Antenatal Care (ANC) Protocol Engine + PMSMA Scheduler

import { ANCContact, ANCContactStatus } from '../types';

/**
 * Formats a Date as YYYY-MM-DD in the device's local timezone.
 * (toISOString() uses UTC, which gives the previous day before 05:30 IST.)
 */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD as a local calendar date (new Date('YYYY-MM-DD') parses as UTC).
 */
export function parseLocalDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(dateStr);
}


/**
 * Calculates Expected Date of Delivery (EDD) via Naegele's Rule:
 * EDD = LMP + 1 year - 3 months + 7 days (or LMP + 280 days)
 */
export function calculateEDD(lmpDateStr: string): string {
  const lmp = parseLocalDate(lmpDateStr);
  if (isNaN(lmp.getTime())) return '';
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 280); // 40 gestational weeks
  return toLocalDateString(edd);
}

/**
 * Calculates current gestational age in completed weeks
 */
export function calculateGestationalWeeks(lmpDateStr: string, referenceDateStr?: string): number {
  const lmp = parseLocalDate(lmpDateStr);
  const now = referenceDateStr ? parseLocalDate(referenceDateStr) : new Date();
  if (isNaN(lmp.getTime())) return 0;
  const diffTime = Math.max(0, now.getTime() - lmp.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.min(42, Math.floor(diffDays / 7));
}

/**
 * Finds the nearest upcoming PMSMA (Pradhan Mantri Surakshit Matritva Abhiyan)
 * Specialist Clinic on the 9th of the given/next month.
 */
export function getNextPMSMADate(fromDateStr: string): string {
  const date = parseLocalDate(fromDateStr);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  let pmsmaDate: Date;
  if (day < 9) {
    pmsmaDate = new Date(year, month, 9);
  } else {
    pmsmaDate = new Date(year, month + 1, 9);
  }
  return toLocalDateString(pmsmaDate);
}

/**
 * Standard WHO 2016 & GoI RMNCH+A 8-Contact ANC Protocol Template
 */
interface ProtocolContactDef {
  contactNo: number;
  targetWeek: number;
  windowWeeksMin: number;
  windowWeeksMax: number;
  isPMSMA: boolean;
  title: { mr: string; hi: string; en: string };
  checklist: { mr: string[]; hi: string[]; en: string[] };
}

const WHO_GOI_PROTOCOL_DEFINITIONS: ProtocolContactDef[] = [
  {
    contactNo: 1,
    targetWeek: 10,
    windowWeeksMin: 6,
    windowWeeksMax: 12,
    isPMSMA: false,
    title: {
      mr: 'ANC १: पहिली नोंदणी व प्राथमिक तपासणी (१२ आठवड्यांच्या आत)',
      hi: 'ANC 1: पहली जांच व पंजीकरण (12 सप्ताह के भीतर)',
      en: 'ANC 1: Early Registration & Baseline Screening (< 12 Weeks)'
    },
    checklist: {
      mr: [
        'RCH व MCP कार्ड नोंदणी',
        'रक्तगट, CBC व हिमोग्लोबिन (Hb) तपासणी',
        'रक्त शर्करा (OGTT) व लघवी तपासणी',
        'Td 1 (धनुर्वात) लस',
        'फॉलिक ॲसिड (Folic Acid) गोळ्या वाटप',
        'पहिला सोनोग्राफी (USG Dating Scan)'
      ],
      hi: [
        'RCH व MCP कार्ड पंजीकरण',
        'ब्लड ग्रुप, CBC व हीमोग्लोबिन जांच',
        'ब्लड शुगर व यूरिन टेस्ट',
        'Td 1 (टिटनेस) टीका',
        'फोलिक एसिड गोलियों का वितरण',
        'पहली सोनोग्राफी जांच'
      ],
      en: [
        'RCH & Digital MCP Card registration',
        'Blood Group, CBC & Hemoglobin check',
        'Blood Glucose (OGTT) & Urine Protein screening',
        'Td 1 (Tetanus-Diphtheria) immunization',
        'Folic Acid (400mcg) supplementation',
        'First Dating Ultrasound (USG)'
      ]
    }
  },
  {
    contactNo: 2,
    targetWeek: 20,
    windowWeeksMin: 18,
    windowWeeksMax: 22,
    isPMSMA: true, // Eligible for PMSMA specialist camp on 9th
    title: {
      mr: 'ANC २: दुसऱ्या तिमाहीची तपासणी व सोनोग्राफी (२० आठवडे)',
      hi: 'ANC 2: दूसरी तिमाही की जांच व सोनोग्राफी (20 सप्ताह)',
      en: 'ANC 2: Second Trimester Scan & Td Booster (20 Weeks)'
    },
    checklist: {
      mr: [
        'रक्तदाब व वजन तपासणी',
        'अ‍ॅनॉमली / TIFFA सोनोग्राफी स्कॅन (व्यंग तपासणी)',
        'Td 2 किंवा Td Booster लस',
        'IFA (आयर्न फॉलिक ॲसिड) १८० गोळ्या सुरू',
        'कॅल्शियम ३६० गोळ्या सुरू',
        'पोटाची तपासणी व गर्भाची वाढ'
      ],
      hi: [
        'रक्तचाप व वजन माप',
        'TIFFA सोनोग्राफी स्कैन (विकृति जांच)',
        'Td 2 या Td बूस्टर टीका',
        'IFA (आयरन) 180 गोलियां प्रारंभ',
        'कैल्शियम 360 गोलियां प्रारंभ',
        'पेट की जांच व भ्रूण का विकास'
      ],
      en: [
        'Blood Pressure & Maternal Weight check',
        'TIFFA / Anomaly Ultrasound Scan',
        'Td 2 or Td Booster injection',
        'Start IFA (Iron Folic Acid) 180 tablets course',
        'Start Calcium (500mg) 360 tablets course',
        'Fundal height & fetal growth assessment'
      ]
    }
  },
  {
    contactNo: 3,
    targetWeek: 26,
    windowWeeksMin: 24,
    windowWeeksMax: 28,
    isPMSMA: true,
    title: {
      mr: 'ANC ३: मधुमेह व प्री-एक्लॅम्पसिया तपासणी (२६ आठवडे)',
      hi: 'ANC 3: डायबिटीज व उच्च रक्तचाप जांच (26 सप्ताह)',
      en: 'ANC 3: Gestational Diabetes & Pre-eclampsia Screen (26 Weeks)'
    },
    checklist: {
      mr: [
        'पुनः हिमोग्लोबिन तपासणी (ॲनिमिया नियंत्रण)',
        '७५ ग्रॅम ग्लुकोज टेस्ट (Gestational Diabetes OGTT)',
        'रक्तदाब व पायांवरील सूज (Edema) तपासणी',
        'जंतनाशक गोळी (Albendazole 400mg) एकल मात्रा',
        'IFA व कॅल्शियम गोळ्यांचा आढावा'
      ],
      hi: [
        'पुनः हीमोग्लोबिन जांच',
        '75 ग्राम ग्लूकोज टेस्ट (GDM)',
        'रक्तचाप व सूजन (Edema) जांच',
        'कृमिनाशक एल्बेंडाजोल (Albendazole) खुराक',
        'आयरन-कैल्शियम सेवन समीक्षा'
      ],
      en: [
        'Repeat Hemoglobin check for anemia monitoring',
        '75g Oral Glucose Tolerance Test (OGTT)',
        'Blood Pressure & Facial/Pedal Edema screening',
        'Deworming: Single dose Albendazole (400mg)',
        'IFA & Calcium compliance counseling'
      ]
    }
  },
  {
    contactNo: 4,
    targetWeek: 30,
    windowWeeksMin: 29,
    windowWeeksMax: 32,
    isPMSMA: true,
    title: {
      mr: 'ANC ४: तिसऱ्या तिमाहीची तपासणी व वाढ (३० आठवडे)',
      hi: 'ANC 4: तीसरी तिमाही की जांच व शिशु वृद्धि (30 सप्ताह)',
      en: 'ANC 4: Third Trimester Growth & Anemia Monitoring (30 Weeks)'
    },
    checklist: {
      mr: [
        'रक्तदाब व वजनातील बदल',
        'गर्भाचे ठोके (Fetal Heart Sound Doppler)',
        'IFA व कॅल्शियम गोळ्यांचा पुढील साठा',
        'धोक्याच्या लक्षणांचे समुपदेशन (डोकेदुखी, रक्तस्राव)',
        '९ तारखेचे PMSMA शिबिर उपस्थिती'
      ],
      hi: [
        'रक्तचाप व वजन माप',
        'भ्रूण के दिल की धड़कन (FHS)',
        'IFA व कैल्शियम गोलियों का अगला स्टॉक',
        'खतरे के लक्षणों की जानकारी',
        'PMSMA 9 तारीख शिविर'
      ],
      en: [
        'Blood Pressure & maternal weight trajectory',
        'Fetal Heart Sound (Doppler/Stethoscope)',
        'IFA & Calcium refill distribution',
        'Danger sign counseling (headache, bleeding, convulsions)',
        'PMSMA 9th monthly specialist camp attendance'
      ]
    }
  },
  {
    contactNo: 5,
    targetWeek: 34,
    windowWeeksMin: 33,
    windowWeeksMax: 35,
    isPMSMA: false,
    title: {
      mr: 'ANC ५: गर्भाची स्थिती व प्री-एक्लॅम्पसिया फेरतपासणी (३४ आठवडे)',
      hi: 'ANC 5: शिशु की स्थिति व प्री-एक्लेम्पसिया जांच (34 सप्ताह)',
      en: 'ANC 5: Fetal Presentation & Pre-eclampsia Screen (34 Weeks)'
    },
    checklist: {
      mr: [
        'गर्भाचे डोके खाली आहे का तपासणी (Cephalic Presentation)',
        'लघवीमध्ये प्रोटीन तपासणी (Urine Albumin)',
        'रक्तदाब मोजमाप',
        'बाळाच्या हालचाली मोजण्याचे प्रशिक्षण (Kick Counter)'
      ],
      hi: [
        'शिशु की स्थिति (सिर नीचे है या नहीं)',
        'यूरिन प्रोटीन जांच',
        'रक्तचाप माप',
        'शिशु की हलचल गिनने की जानकारी'
      ],
      en: [
        'Fetal presentation & lie assessment (Cephalic check)',
        'Urine Albumin test (Dipstick for proteinuria)',
        'Blood pressure monitoring',
        'Fetal movement (Kick count) awareness'
      ]
    }
  },
  {
    contactNo: 6,
    targetWeek: 36,
    windowWeeksMin: 36,
    windowWeeksMax: 37,
    isPMSMA: true,
    title: {
      mr: 'ANC ६: प्रसूती पूर्वतयारी व १०८ रुग्णवाहिका जोडणी (३६ आठवडे)',
      hi: 'ANC 6: प्रसव पूर्व तैयारी व 108 एम्बुलेंस जुड़ाव (36 सप्ताह)',
      en: 'ANC 6: Birth Preparedness & 108 Ambulance Tagging (36 Weeks)'
    },
    checklist: {
      mr: [
        'प्रसूतीसाठी रुग्णालय निश्चिती (PHC / उप-जिल्हा रुग्णालय)',
        '१०८ व १०२ रुग्णवाहिका संपर्क क्रमांक नोंदणी',
        'रक्तदाते तयार ठेवणे (Blood Donor arrangement for High-Risk)',
        'आर्थिक योजना (JSSK व PMMVY) लाभ खात्री',
        'प्रसूती पिशवी (Baby & Mother kit) तयारी'
      ],
      hi: [
        'संस्थागत प्रसव हेतु अस्पताल का चयन',
        '108 व 102 एम्बुलेंस संपर्क',
        'रक्तदाता की पूर्व व्यवस्था',
        'मातृत्व लाभ योजना (PMMVY) सहायता',
        'प्रसव किट तैयार करना'
      ],
      en: [
        'Institutional Delivery Birth Plan finalization',
        '108 / 102 Emergency Ambulance driver contact tagging',
        'Blood donor identification (mandatory for high-risk)',
        'Janani Shishu Suraksha Karyakram (JSSK) entitlement check',
        'Hospital bag preparation review'
      ]
    }
  },
  {
    contactNo: 7,
    targetWeek: 38,
    windowWeeksMin: 38,
    windowWeeksMax: 39,
    isPMSMA: false,
    title: {
      mr: 'ANC ७: प्रसूती कळ तपासणी व तात्काळ संपर्क (३८ आठवडे)',
      hi: 'ANC 7: प्रसव पीड़ा जांच व आपातकालीन तैयारी (38 सप्ताह)',
      en: 'ANC 7: Labor Onset Assessment & Active Danger Checks (38 Weeks)'
    },
    checklist: {
      mr: [
        'प्रसूती कळांची चिन्हे ओळखणे (Labor Pains / Water Break)',
        'गर्भाचे ठोके व पोटाचा घेर',
        'रक्तदाब व लघवी तपासणी',
        'ASHA कार्यकर्तीला तात्काळ संपर्क सूचना'
      ],
      hi: [
        'प्रसव दर्द के लक्षण पहचानना',
        'शिशु के दिल की धड़कन',
        'रक्तचाप माप',
        'आशा दीदी को तुरंत सूचना निर्देश'
      ],
      en: [
        'True labor signs vs false pain identification',
        'Fetal Heart Rate & maternal vitals check',
        'Membrane rupture (water break) emergency briefing',
        'Direct ASHA & ANM 24x7 phone confirmation'
      ]
    }
  },
  {
    contactNo: 8,
    targetWeek: 40,
    windowWeeksMin: 40,
    windowWeeksMax: 41,
    isPMSMA: false,
    title: {
      mr: 'ANC ८: पूर्ण मुदत व प्रसूती संदर्भ (४० आठवडे)',
      hi: 'ANC 8: पूर्ण अवधि व प्रसव रेफरल (40 सप्ताह)',
      en: 'ANC 8: Term Delivery & Post-Dates Referral (40 Weeks)'
    },
    checklist: {
      mr: [
        'EDD तारीख पूर्ण झाली असल्यास त्वरित रुग्णालयात भरती',
        'गर्भाशयातील द्रवाची तपासणी (Amniotic Fluid / USG)',
        'तज्ज्ञ डॉक्टरांकडून प्रसूती नियोजन'
      ],
      hi: [
        'EDD तिथि पूर्ण होने पर तुरंत अस्पताल भर्ती',
        'सोनोग्राफी व शिशु निगरानी',
        'डॉक्टर द्वारा प्रसव योजना'
      ],
      en: [
        'Immediate hospital admission if EDD crossed',
        'Amniotic fluid & biophysical profile check',
        'Specialist induction / delivery execution'
      ]
    }
  }
];

/**
 * Generates the full 8-Contact ANC Schedule automatically from the LMP date
 */
export function generateANCSchedule(lmpDateStr: string, facility: string = 'PHC Shirur'): ANCContact[] {
  const lmp = parseLocalDate(lmpDateStr);
  if (isNaN(lmp.getTime())) return [];

  const currentWeeks = calculateGestationalWeeks(lmpDateStr);

  return WHO_GOI_PROTOCOL_DEFINITIONS.map(def => {
    // Target date = LMP + (targetWeek * 7 days)
    const targetDateObj = new Date(lmp);
    targetDateObj.setDate(targetDateObj.getDate() + (def.targetWeek * 7));
    const targetDateStr = toLocalDateString(targetDateObj);

    // If PMSMA eligible (2nd & 3rd trimester), align to nearest 9th of that month
    let effectiveDueDateStr = targetDateStr;
    if (def.isPMSMA) {
      effectiveDueDateStr = getNextPMSMADate(targetDateStr);
    }

    // Determine initial status based on current gestational age
    let status: ANCContactStatus = 'PENDING';
    if (currentWeeks > def.windowWeeksMax) {
      status = 'OVERDUE';
    }

    return {
      contactNo: def.contactNo,
      title: def.title,
      targetWeek: def.targetWeek,
      windowWeeksMin: def.windowWeeksMin,
      windowWeeksMax: def.windowWeeksMax,
      targetDate: targetDateStr,
      dueDate: effectiveDueDateStr,
      status,
      isPMSMA: def.isPMSMA,
      coreChecklist: def.checklist,
      assignedFacility: facility
    };
  });
}

/**
 * Categorizes beneficiary contacts for field workers into actionable cohorts
 */
export function categorizeDueList(schedule: ANCContact[], currentWeeks: number) {
  const overdue: ANCContact[] = [];
  const todayDue: ANCContact[] = [];
  const upcoming7Days: ANCContact[] = [];
  const pmsmaCohort: ANCContact[] = [];

  const now = new Date();
  const todayStr = toLocalDateString(now);
  
  const next7DaysObj = new Date(now);
  next7DaysObj.setDate(next7DaysObj.getDate() + 7);
  const next7DaysStr = toLocalDateString(next7DaysObj);

  schedule.forEach(c => {
    if (c.status === 'COMPLETED') return;

    if (c.dueDate < todayStr || currentWeeks > c.windowWeeksMax) {
      overdue.push({ ...c, status: 'OVERDUE' });
    } else if (c.dueDate === todayStr) {
      todayDue.push(c);
    } else if (c.dueDate <= next7DaysStr) {
      upcoming7Days.push(c);
    }

    if (c.isPMSMA) {
      pmsmaCohort.push(c);
    }
  });

  return { overdue, todayDue, upcoming7Days, pmsmaCohort };
}

/** Days until the next PMSMA specialist camp (held on the 9th of every month); 0 = today. */
export function daysUntilNextPmsma(now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(today.getFullYear(), today.getMonth(), 9);
  if (next < today) next.setMonth(next.getMonth() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}
