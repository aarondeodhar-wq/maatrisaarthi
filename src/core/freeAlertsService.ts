// WhatsApp & SMS alert service for MaatriSaarthi.
//
// Messages are only sent when a real gateway endpoint is configured via
// VITE_ALERT_GATEWAY_URL (e.g. a Cloud Function wrapping an SMS/WhatsApp provider).
// Without one, every call reports NOT_SENT. Nothing here ever claims delivery
// that did not happen.

import { auth } from './firebaseAuth';

export type MaternalMessageType = 
  | 'ANC_DUE'
  | 'PMSMA_CAMP'
  | 'PMSMA_REMINDER' 
  | 'IFA_NUTRITION' 
  | 'HIGH_RISK_ALERT' 
  | 'EMERGENCY_SOS'
  | 'EMERGENCY_108' 
  | 'OTP_CODE' 
  | 'PRESCRIPTION_DISPATCH';

export interface FreeAlertPayload {
  recipientPhone: string;
  recipientName: string;
  messageType: MaternalMessageType;
  language: 'mr' | 'hi' | 'en';
  customText?: string;
  rchId?: string;
  village?: string;
  dangerSigns?: string[];
  prescriptionId?: string;
}

export type AlertDispatchStatus = 'SENT' | 'NOT_SENT' | 'FAILED';

export interface FreeAlertResponse {
  success: boolean;
  status: AlertDispatchStatus;
  channel: 'WHATSAPP' | 'SMS';
  ticketId: string | null;
  deliveryTimestamp: string;
  gateway: string;
  recipientPhone: string;
  statusMessage: string;
  previewText: string;
}

export interface DispatchedAlertRecord {
  id: string;
  ticketId: string | null;
  recipientName: string;
  recipientPhone: string;
  channel: 'WHATSAPP' | 'SMS';
  messageType: string;
  text: string;
  status: AlertDispatchStatus;
  sentAt: string;
  gateway: string;
}

// In-Memory & LocalStorage Persisted Server Alerts Log
const ALERTS_STORAGE_KEY = 'maatrisaarthi_server_dispatched_alerts';

export function getDispatchedServerAlerts(): DispatchedAlertRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveDispatchedServerAlert(record: DispatchedAlertRecord) {
  if (typeof window === 'undefined') return;
  try {
    const current = getDispatchedServerAlerts();
    const updated = [record, ...current].slice(0, 50); // Keep latest 50
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
}

const ALERT_GATEWAY_URL: string = import.meta.env.VITE_ALERT_GATEWAY_URL || '';

export function isAlertGatewayConfigured(): boolean {
  return ALERT_GATEWAY_URL !== '';
}

/**
 * Clean phone number to 10 digits. Returns null when the number is not a valid Indian mobile.
 */
export function sanitizeIndianNumber(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/**
 * Generate standardized maternal health messages in Marathi, Hindi, and English
 */
export function generateMaternalAlertText(payload: FreeAlertPayload): string {
  const cleanPhone = sanitizeIndianNumber(payload.recipientPhone) || 'unknown';

  if (payload.customText) {
    return payload.customText;
  }

  if (payload.messageType === 'PMSMA_REMINDER' || payload.messageType === 'PMSMA_CAMP') {
    if (payload.language === 'mr') {
      return `🚩 मातृसारथी अधिकृत सूचना: नमस्कार ${payload.recipientName}, येत्या ९ तारखेला प्राथमिक आरोग्य केंद्रात 'PMSMA' विशेष तपासणी शिबिर आहे. कृपया सोनोग्राफी व तज्ज्ञ तपासणीसाठी उपस्थित राहा. - PHC आरोग्य पथक`;
    } else if (payload.language === 'hi') {
      return `🚩 मातृसारथी आधिकारिक सूचना: नमस्ते ${payload.recipientName}, आगामी 9 तारीख को PHC में 'PMSMA' विशेष स्वास्थ्य जांच शिविर है। कृपया समय पर उपस्थित रहें। - स्वास्थ्य विभाग`;
    }
    return `🚩 MaatriSaarthi Alert: Dear ${payload.recipientName}, PMSMA Specialist Camp is scheduled on 9th at PHC. Please attend for free doctor checkup and USG scan. - PHC Health Team`;
  }

  if (payload.messageType === 'ANC_DUE') {
    if (payload.language === 'mr') {
      return `🩺 मातृसारथी तपासणी आठवण: नमस्कार ${payload.recipientName}, आपल्या गर्भधारणेची नियमित तपासणी (ANC Checkup) नियोजित आहे. कृपया जवळच्या आरोग्य केंद्रास भेट द्या.`;
    }
    return `🩺 MaatriSaarthi ANC Due: Dear ${payload.recipientName}, your scheduled Antenatal Care checkup is due this week. Please visit your sub-center/PHC.`;
  }

  if (payload.messageType === 'IFA_NUTRITION') {
    if (payload.language === 'mr') {
      return `💊 मातृसारथी पोषण संदेश: ${payload.recipientName}, आजची १ लाल लोह (IFA) गोळी जेवणानंतर घ्यायला विसरू नका. यामुळे हिमोग्लोबिन वाढते व बाळ निरोगी राहते.`;
    } else if (payload.language === 'hi') {
      return `💊 मातृसारथी पोषण संदेश: ${payload.recipientName}, आज की लाल आयरन (IFA) गोली भोजन के बाद लेना न भूलें। इससे हीमोग्लोबिन बढ़ता है।`;
    }
    return `💊 MaatriSaarthi Nutrition: Dear ${payload.recipientName}, please take your daily red Iron Folic Acid (IFA) tablet after meals today for healthy fetal growth.`;
  }

  if (payload.messageType === 'HIGH_RISK_ALERT') {
    if (payload.language === 'mr') {
      return `⚠️ मातृसारथी उच्च जोखीम सूचना: ${payload.recipientName}, आपल्या आरोग्य तपासणीत उच्च जोखीम आढळली आहे (${payload.dangerSigns?.join(', ') || 'रक्तदाब/ॲनिमिया'}). कृपया त्वरित PHC ला भेट द्या.`;
    }
    return `⚠️ MaatriSaarthi High-Risk Alert: ${payload.recipientName}, clinical high risk detected (${payload.dangerSigns?.join(', ') || 'Hypertension/Anemia'}). Immediate PHC visit advised.`;
  }

  if (payload.messageType === 'PRESCRIPTION_DISPATCH') {
    if (payload.language === 'mr') {
      return `🩺 मातृसारथी ई-प्रिस्क्रिप्शन: ${payload.recipientName}, डॉ. कुलकर्णी यांनी आपली औषध चिठ्ठी जारी केली आहे. औषधांचा डोस व सूचना आपल्या डिजिटल पासवर उपलब्ध आहेत.`;
    }
    return `🩺 MaatriSaarthi e-Prescription: Dear ${payload.recipientName}, your digital prescription has been issued by PHC Medical Officer Dr. Kulkarni. View doses on your Digital Pass.`;
  }

  if (payload.messageType === 'EMERGENCY_108' || payload.messageType === 'EMERGENCY_SOS') {
    return `🚨 [108 AMBULANCE SOS DISPATCH] 🚨\nPatient: ${payload.recipientName} (RCH: ${payload.rchId || 'MH-2026-8819'})\nVillage: ${payload.village || 'Koregaon Bhima'}\nPhone: +91 ${cleanPhone}\nAlert: Critical maternal clinical risk detected (${payload.dangerSigns?.join(', ') || 'Severe Hypertension'}). Ambulance requested.`;
  }

  return `🔔 MaatriSaarthi Notification for ${payload.recipientName}: Please contact your assigned ASHA worker for maternal health follow-up.`;
}

async function dispatchAlert(payload: FreeAlertPayload, channel: 'WHATSAPP' | 'SMS'): Promise<FreeAlertResponse> {
  const cleanPhone = sanitizeIndianNumber(payload.recipientPhone);
  const text = generateMaternalAlertText(payload);
  const now = new Date().toISOString();
  const gateway = isAlertGatewayConfigured() ? 'Configured alert gateway' : 'No gateway configured';

  let status: AlertDispatchStatus;
  let ticketId: string | null = null;
  let statusMessage: string;

  if (!cleanPhone) {
    status = 'FAILED';
    statusMessage = `Not sent: "${payload.recipientPhone}" is not a valid mobile number.`;
  } else if (!isAlertGatewayConfigured()) {
    status = 'NOT_SENT';
    statusMessage = `Not sent: no ${channel === 'SMS' ? 'SMS' : 'WhatsApp'} gateway is configured. Use "send from my phone" instead.`;
  } else {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(ALERT_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          channel,
          to: `+91${cleanPhone}`,
          text,
          messageType: payload.messageType,
          rchId: payload.rchId
        })
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        status = 'SENT';
        ticketId = body.id || body.ticketId || null;
        statusMessage = `Accepted by gateway for +91 ${cleanPhone}${ticketId ? ` [${ticketId}]` : ''}.`;
      } else {
        status = 'FAILED';
        statusMessage = `Gateway rejected the message (HTTP ${res.status}).`;
      }
    } catch (err: any) {
      status = 'FAILED';
      statusMessage = `Gateway unreachable: ${err?.message || 'network error'}.`;
    }
  }

  saveDispatchedServerAlert({
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ticketId,
    recipientName: payload.recipientName,
    recipientPhone: cleanPhone ? `+91 ${cleanPhone}` : payload.recipientPhone,
    channel,
    messageType: payload.messageType,
    text,
    status,
    sentAt: now,
    gateway
  });

  return {
    success: status === 'SENT',
    status,
    channel,
    ticketId,
    deliveryTimestamp: now,
    gateway,
    recipientPhone: cleanPhone ? `+91 ${cleanPhone}` : payload.recipientPhone,
    statusMessage,
    previewText: text
  };
}

/**
 * Sends a WhatsApp alert through the configured gateway (reports NOT_SENT if none)
 */
export function sendFreeWhatsAppAlert(payload: FreeAlertPayload): Promise<FreeAlertResponse> {
  return dispatchAlert(payload, 'WHATSAPP');
}

/**
 * Sends an SMS alert through the configured gateway (reports NOT_SENT if none)
 */
export function sendFreeSmsAlert(payload: FreeAlertPayload): Promise<FreeAlertResponse> {
  return dispatchAlert(payload, 'SMS');
}

/**
 * Opens the user's own WhatsApp with the message prefilled (the user presses send)
 */
export function sendDirectWhatsApp(phone: string, text: string): { success: boolean; url: string } {
  const cleanPhone = sanitizeIndianNumber(phone);
  if (!cleanPhone) return { success: false, url: '' };
  const fullPhone = `91${cleanPhone}`;
  const encodedText = encodeURIComponent(text);
  const directWhatsappUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;

  if (typeof window !== 'undefined') {
    window.open(directWhatsappUrl, '_blank');
  }

  return { success: true, url: directWhatsappUrl };
}

/**
 * Opens the user's own SMS app with the message prefilled (the user presses send)
 */
export function sendDirectSMS(phone: string, text: string): { success: boolean; url: string } {
  const cleanPhone = sanitizeIndianNumber(phone);
  if (!cleanPhone) return { success: false, url: '' };
  const encodedText = encodeURIComponent(text);
  const smsIntentUrl = `sms:+91${cleanPhone}?body=${encodedText}`;

  if (typeof window !== 'undefined') {
    window.open(smsIntentUrl, '_blank');
  }

  return { success: true, url: smsIntentUrl };
}

/**
 * Optional Manual Direct WhatsApp URL
 */
export function openPersonalWhatsApp(phone: string, text: string) {
  sendDirectWhatsApp(phone, text);
}

/**
 * Opens the phone dialer for the 108 ambulance service. There is no automatic
 * 108 dispatch integration; a person must place the call.
 */
export function openEmergency108Dialer() {
  if (typeof window !== 'undefined') {
    window.location.href = 'tel:108';
  }
}

/**
 * One-line, honest UI summary of a dispatch result
 */
export function describeAlertOutcome(res: FreeAlertResponse, recipientName: string): string {
  if (res.status === 'SENT') return `✅ Sent to ${recipientName}: ${res.statusMessage}`;
  return `⚠️ ${recipientName}: ${res.statusMessage}`;
}
