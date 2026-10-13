// Multilingual DPDP-Compliant Reminder & Notification Engine
// Supports Marathi (मराठी), Hindi (हिंदी), and English with token replacement & consent audit

import { Language, NotificationTemplate, SentNotificationLog, Beneficiary } from '../types';
import { verifyDPDPConsentForChannel } from './dpdpCompliance';

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tpl_anc_due',
    type: 'ANC_DUE',
    title: 'ANC Contact Reminder (तपासणी आठवण)',
    category: 'Routine',
    templates: {
      mr: 'नमस्ते {NAME}, तुमची ANC {CONTACT_NO} तपासणी दिनांक {DATE} रोजी {FACILITY} येथे नियोजित आहे. कृपया वेळेवर उपस्थित राहा. आशा कार्यकर्ती: {ASHA_NAME} ({ASHA_PHONE}). मातृ-सुरक्षेसाठी १०८ रुग्णवाहिका मोफत उपलब्ध आहे.',
      hi: 'नमस्ते {NAME}, आपकी ANC {CONTACT_NO} जांच दिनांक {DATE} को {FACILITY} पर निर्धारित है। कृपया समय पर पहुंचें। आशा कार्यकर्ता: {ASHA_NAME} ({ASHA_PHONE})। आपातकाल में 108 पर संपर्क करें।',
      en: 'Namaste {NAME}, your scheduled ANC {CONTACT_NO} checkup is due on {DATE} at {FACILITY}. Please attend with your MCP card. ASHA: {ASHA_NAME} ({ASHA_PHONE}). Call 108 for free emergency ambulance.'
    }
  },
  {
    id: 'tpl_pmsma_camp',
    type: 'PMSMA_CAMP',
    title: 'PMSMA 9th Monthly Specialist Camp (९ तारीख तज्ज्ञ शिबिर)',
    category: 'Specialist',
    templates: {
      mr: 'प्रधानमंत्री सुरक्षित मातृत्व अभियान (PMSMA): {NAME}, दर महिन्याच्या ९ तारखेला मोफत स्त्रीरोग तज्ज्ञ तपासणी व सोनोग्राफी उपलब्ध आहे. दिनांक: {DATE} रोजी {FACILITY} येथे भेट द्या. अधिक माहितीसाठी आशा दीदी: {ASHA_NAME} शी संपर्क करा.',
      hi: 'प्रधानमंत्री सुरक्षित मातृत्व अभियान (PMSMA): {NAME}, हर माह की 9 तारीख को विशेषज्ञ डॉक्टर व सोनोग्राफी जांच मुफ्त है। दिनांक: {DATE} को {FACILITY} में पधारें। आशा: {ASHA_NAME}।',
      en: 'PMSMA Specialist Clinic: {NAME}, free specialist OB-GYN checkup & ultrasound scan is scheduled for 9th of this month ({DATE}) at {FACILITY}. Contact your ASHA: {ASHA_NAME} ({ASHA_PHONE}).'
    }
  },
  {
    id: 'tpl_high_risk_alert',
    type: 'HIGH_RISK_ALERT',
    title: 'High-Risk Red Alert (उच्च जोखीम तात्काळ सूचना)',
    category: 'Emergency',
    templates: {
      mr: '🚨 तातडीची वैद्यकीय सूचना: {NAME}, तुमच्या तपासणीत {REASONS} आढळले आहे. कृपया तात्काळ {FACILITY} येथे किंवा जवळच्या रुग्णालयात भेट द्या. रुग्णवाहिकेसाठी त्वरित १०८ वर कॉल करा. डॉ. दूरध्वनी: {DOCTOR_PHONE}.',
      hi: '🚨 तत्काल चिकित्सा सूचना: {NAME}, आपकी जांच में {REASONS} पाया गया है। कृपया तुरंत {FACILITY} या निकटतम अस्पताल पहुंचें। 108 एम्बुलेंस तुरंत बुलाएं। डॉक्टर संपर्क: {DOCTOR_PHONE}।',
      en: '🚨 URGENT MEDICAL ALERT: {NAME}, clinical triage identified {REASONS}. Please visit {FACILITY} or FRU hospital immediately. Call 108 for emergency ambulance transfer.'
    }
  },
  {
    id: 'tpl_ifa_nutrition',
    type: 'IFA_NUTRITION',
    title: 'IFA Iron & Calcium Pill Adherence (पोषण व लोहयुक्त गोळ्या)',
    category: 'Adherence',
    templates: {
      mr: 'मातृ पोषण स्मरणपत्र: {NAME}, आज जेवणानंतर १ लाल गोळी (IFA) आणि १ कॅल्शियमची गोळी घेतली का? रक्तवाढीसाठी हिरव्या पालेभाज्या व गूळ-शेंगदाणे खा. बाळ व आईच्या निरोगी आरोग्यासाठी नियमित गोळ्या घ्या.',
      hi: 'मातृ पोषण संदेश: {NAME}, क्या आपने आज दोपहर भोजन के बाद 1 आयरन (लाल गोली) और 1 कैल्शियम की गोली ली? हरी सब्जियां और पौष्टिक आहार लें।',
      en: 'Nutrition & Iron Adherence: {NAME}, have you taken your daily 1 red IFA tablet and Calcium tablet today? Regular iron intake prevents maternal anemia and protects your baby.'
    }
  },
  {
    id: 'tpl_emergency_sos',
    type: 'EMERGENCY_SOS',
    title: '108 Emergency Ambulance Alert (१०८ तात्काळ रुग्णवाहिका)',
    category: 'Emergency',
    templates: {
      mr: '१०८ आपत्कालीन सेवा: {NAME} यांच्यासाठी आपत्कालीन अलर्ट नोंदवला गेला आहे. जवळची १०८ रुग्णवाहिका संपर्क क्रमांक: {AMBULANCE_CONTACT}. आशा: {ASHA_NAME} यांना तात्काळ माहिती पाठवली आहे.',
      hi: '108 आपातकालीन सेवा: {NAME} के लिए आपातकाल अलर्ट दर्ज किया गया है। नजदीकी एम्बुलेंस: {AMBULANCE_CONTACT}। आशा कार्यकर्ता तुरंत सहायता के लिए रवाना हैं।',
      en: '108 Emergency SOS: Medical emergency triggered for {NAME}. Nearest 108 ambulance dispatch alerted ({AMBULANCE_CONTACT}). PHC Medical Officer notified.'
    }
  }
];

/**
 * Replaces dynamic variables in template string
 */
export function formatNotificationText(
  templateText: string,
  beneficiary: Beneficiary,
  extra: Record<string, string> = {}
): string {
  const defaults: Record<string, string> = {
    NAME: beneficiary.name,
    WEEKS: `${beneficiary.currentGestationalWeeks}`,
    DATE: extra.DATE || new Date().toLocaleDateString('en-GB'),
    CONTACT_NO: extra.CONTACT_NO || '१',
    FACILITY: extra.FACILITY || 'PHC Shirur',
    ASHA_NAME: beneficiary.assignedAsha.name,
    ASHA_PHONE: beneficiary.assignedAsha.phone,
    DOCTOR_PHONE: '02138-222108',
    AMBULANCE_CONTACT: '108 (Toll Free)',
    HOTLINE: '104 / 108',
    REASONS: extra.REASONS || beneficiary.riskFactors.join(', ') || 'उच्च रक्तदाब / कमी हिमोग्लोबिन'
  };

  const merged = { ...defaults, ...extra };

  let result = templateText;
  Object.keys(merged).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, merged[key]);
  });

  return result;
}

/**
 * Dispatches a simulated SMS or WhatsApp message with DPDP Act 2023 verification
 */
export function dispatchNotificationSandbox(
  beneficiary: Beneficiary,
  templateType: NotificationTemplate['type'],
  channel: 'SMS' | 'WHATSAPP',
  customLanguage?: Language,
  extraVariables: Record<string, string> = {}
): SentNotificationLog {
  const lang = customLanguage || beneficiary.dpdpConsent.preferredLanguage || 'mr';
  const isEmergency = templateType === 'HIGH_RISK_ALERT' || templateType === 'EMERGENCY_SOS';

  // DPDP Consent Check
  const consentCheck = verifyDPDPConsentForChannel(beneficiary.dpdpConsent, channel, isEmergency);

  const tpl = NOTIFICATION_TEMPLATES.find(t => t.type === templateType) || NOTIFICATION_TEMPLATES[0];
  const rawText = tpl.templates[lang] || tpl.templates.en;
  const messageContent = formatNotificationText(rawText, beneficiary, extraVariables);

  const log: SentNotificationLog = {
    id: 'msg_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    beneficiaryId: beneficiary.id,
    beneficiaryName: beneficiary.name,
    phone: beneficiary.phone,
    channel,
    language: lang,
    templateType,
    messageContent,
    status: consentCheck.allowed ? 'DELIVERED' : 'CONSENT_BLOCKED',
    dpdpConsentVerified: consentCheck.allowed
  };

  return log;
}
