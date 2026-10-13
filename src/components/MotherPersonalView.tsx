import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { 
  Heart, 
  Calendar, 
  QrCode, 
  Pill, 
  PhoneCall, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  User, 
  MapPin, 
  Activity, 
  Sparkles,
  Droplets,
  ChevronRight,
  Info,
  Camera,
  Lock
} from 'lucide-react';
import { generateHealthPassQrCode } from '../core/qrEngine';
import { createDefaultDPDPConsent } from '../core/dpdpCompliance';
import { sendDirectWhatsApp, sendDirectSMS } from '../core/freeAlertsService';
import { DevicePermissionsModal } from './DevicePermissionsModal';
import { PatientRecordConsentPortal } from './PatientRecordConsentPortal';
import { Beneficiary } from '../types';

interface MotherPersonalViewProps {
  language: Language;
  userName: string;
  userPhone: string;
  beneficiary?: Beneficiary;
}

export const MotherPersonalView: React.FC<MotherPersonalViewProps> = ({
  language,
  userName,
  userPhone,
  beneficiary
}) => {
  const [ifaTakenToday, setIfaTakenToday] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showConsentPortal, setShowConsentPortal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate real, scannable QR Code containing mother's clinical payload
    generateHealthPassQrCode({
      app: 'MAATRISAARTHI',
      type: 'MOTHER_HEALTH_PASS',
      beneficiaryId: beneficiary?.id || 'ben_001',
      rchId: beneficiary?.rchId || 'MH-PUN-2026-8819',
      timestamp: new Date().toISOString()
    }).then(url => {
      setQrCodeDataUrl(url);
    });
  }, [userName, beneficiary]);

  const t = {
    myPass: {
      mr: 'माझा डिजिटल मातृ सुरक्षा पास (Digital MCP Pass)',
      hi: 'मेरा डिजिटल मातृ सुरक्षा पास (Digital MCP Pass)',
      en: 'My Digital Safe Motherhood Pass (MCP)'
    },
    rchId: {
      mr: 'RCH क्रमांक: MH-PUN-2026-8819',
      hi: 'RCH नंबर: MH-PUN-2026-8819',
      en: 'RCH ID: MH-PUN-2026-8819'
    },
    gestationalAge: {
      mr: 'गर्भधारणेचा टप्पा: २६ आठवडे (दुसरा तिमाही)',
      hi: 'गर्भावस्था चरण: 26 सप्ताह (दूसरी तिमाही)',
      en: 'Gestational Stage: 26 Weeks (2nd Trimester)'
    },
    edd: {
      mr: 'अपेक्षित प्रसूती तारीख (EDD): १८ नोव्हेंबर २०२६',
      hi: 'अपेक्षित प्रसव तिथि (EDD): 18 नवंबर 2026',
      en: 'Estimated Due Date (EDD): 18 Nov 2026'
    },
    assignedAsha: {
      mr: 'तुमची आशा सेविका: सविता पाटील (+91 97654 32101)',
      hi: 'आपकी आशा कार्यकर्ता: सविता पाटील (+91 97654 32101)',
      en: 'Assigned ASHA Worker: Savita Patil (+91 97654 32101)'
    },
    nextAnc: {
      mr: 'पुढील ANC तपासणी: ९ सप्टेंबर २०२६ (PMSMA विशेष शिबिर)',
      hi: 'अगली ANC जांच: 9 सितंबर 2026 (PMSMA विशेष शिविर)',
      en: 'Next ANC Visit: 9th Sept 2026 (PMSMA Specialist Camp)'
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn font-sans">
      {/* Top Banner Card: Personal Mother Profile */}
      <div className="silky-glass rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-xl shadow-pink-600/30 shrink-0">
              <Heart className="w-8 h-8 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">{userName}</h2>
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>सक्रिय (Active)</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-1">{t.rchId[language]}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Koregaon Bhima PHC • Pune Rural</span>
              </p>
            </div>
          </div>

          {/* Quick Actions: Show Real QR Pass & Device Permissions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 cursor-pointer shadow-md"
              title="Device Permissions & Privacy"
            >
              <ShieldCheck className="w-4 h-4 text-teal-300" />
            </button>

            <button
              id="tour-mother-qr"
              onClick={() => setShowQrModal(true)}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer border border-white/20 transition hover:scale-105"
            >
              <QrCode className="w-4 h-4" />
              <span>{language === 'mr' ? 'माझा डिजिटल QR पास' : language === 'hi' ? 'मेरा डिजिटल QR पास' : 'View Real QR Pass'}</span>
            </button>
          </div>
        </div>

        {/* Gestational Progress & EDD Banner */}
        <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="silky-card p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 block">
              {language === 'mr' ? 'गर्भधारणा काळ:' : language === 'hi' ? 'गर्भावस्था चरण:' : 'Gestational Stage:'}
            </span>
            <span className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-1.5 mt-0.5">
              <Activity className="w-4 h-4 text-purple-500 dark:text-purple-300" />
              <span>{language === 'mr' ? '२६ आठवडे (२रा तिमाही)' : language === 'hi' ? '26 सप्ताह (दूसरी तिमाही)' : '26 Weeks (2nd Trimester)'}</span>
            </span>
          </div>

          <div className="silky-card p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 block">
              {language === 'mr' ? 'अपेक्षित प्रसूती:' : language === 'hi' ? 'अपेक्षित प्रसव तिथि:' : 'Estimated Due Date (EDD):'}
            </span>
            <span className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-4 h-4 text-rose-500 dark:text-rose-300" />
              <span>{language === 'mr' ? '१८ नोव्हेंबर २०२६' : language === 'hi' ? '18 नवंबर 2026' : '18 Nov 2026'}</span>
            </span>
          </div>

          <div className="silky-card p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 block">
              {language === 'mr' ? 'जोखीम श्रेणी:' : language === 'hi' ? 'जोखिम श्रेणी:' : 'Risk Triage:'}
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-300 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>{language === 'mr' ? 'सुरक्षित / सामान्य' : language === 'hi' ? 'सुरक्षित / सामान्य' : 'Low Risk / Normal'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 1. Daily Medicine + 2. Next Appointment + 3. Emergency SOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Medicine Tracker */}
        <div className="silky-glass rounded-3xl p-5 shadow-xl text-slate-900 dark:text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black text-slate-950 dark:text-white">
                {language === 'mr' ? 'दैनिक गोळ्या (Daily IFA)' : language === 'hi' ? 'दैनिक गोलियां (Daily IFA)' : 'Daily IFA Iron Supplement'}
              </h3>
            </div>
            <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-white/10">1 Tablet / Day</span>
          </div>

          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            {language === 'mr' ? 'लोह व फॉलिक अ‍ॅसिड (IFA) लाल गोळी जेवणानंतर घ्यावी.' : language === 'hi' ? 'आयरन व फोलिक एसिड (IFA) गोली भोजन के बाद लें।' : 'Take 1 Iron & Folic Acid (IFA) tablet after meals.'}
          </p>

          <button
            id="tour-mother-ifa"
            onClick={() => setIfaTakenToday(!ifaTakenToday)}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              ifaTakenToday
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 hover:bg-amber-600 hover:text-white dark:bg-white/10 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-white/15'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{ifaTakenToday ? (language === 'mr' ? 'आजची गोळी घेतली' : language === 'hi' ? 'आज की खुराक पूर्ण' : 'Taken Today') : (language === 'mr' ? 'मी आज गोळी घेतली' : language === 'hi' ? 'गोली ले ली है' : 'Mark Taken Today')}</span>
          </button>
        </div>

        {/* Next ANC Visit Camp */}
        <div className="silky-glass rounded-3xl p-5 shadow-xl text-slate-900 dark:text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black text-slate-950 dark:text-white">
                {language === 'mr' ? 'पुढील ANC तपासणी' : language === 'hi' ? 'अगली ANC जांच' : 'Next ANC Checkup'}
              </h3>
            </div>
            <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-blue-300 dark:border-blue-500/30">PMSMA 9th</span>
          </div>

          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            {t.nextAnc[language]}
          </p>

          <div className="silky-card p-2.5 rounded-xl flex items-center justify-between text-xs font-bold border border-slate-200 dark:border-white/10">
            <span className="text-slate-700 dark:text-slate-300">
              {language === 'mr' ? 'तपासणी बाकी:' : language === 'hi' ? 'समय शेष:' : 'Time Left:'}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-mono font-black">
              {language === 'mr' ? '२३ दिवस शिल्लक' : language === 'hi' ? '23 दिन शेष' : '23 Days Remaining'}
            </span>
          </div>
        </div>

        {/* Emergency SOS 108 & ASHA Hotline */}
        <div className="silky-glass rounded-3xl p-5 shadow-xl text-slate-900 dark:text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 dark:text-rose-300 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-950 dark:text-white">
                {language === 'mr' ? 'तातडीची मदत (Emergency)' : language === 'hi' ? 'आपातकालीन सहायता' : 'Emergency Assistance'}
              </h3>
            </div>
          </div>

          <a
            href="tel:108"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{language === 'mr' ? '१०८ रुग्णवाहिका' : language === 'hi' ? '108 एम्बुलेंस' : '108 Ambulance SOS'}</span>
          </a>

          <a
            href={`tel:${beneficiary?.assignedAsha.phone.replace(/[^\d+]/g, "") || ""}`}
            className="w-full bg-white/10 hover:bg-white/20 text-slate-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border border-white/10 transition"
          >
            <User className="w-3.5 h-3.5 text-teal-400" />
            <span>{language === 'mr' ? 'आशा सेविकेशी थेट कॉल' : language === 'hi' ? 'आशा कार्यकर्ता को कॉल करें' : 'Call Assigned ASHA'}</span>
          </a>

          {/* Real WhatsApp & SMS Buttons */}
          <div id="tour-mother-whatsapp" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const text = language === 'mr' 
                  ? `नमस्ते आशा ताई, मी ${userName || 'माता'} बोलत आहे (RCH: ${beneficiary?.rchId || '-'}). मला गर्भधारणा तपासणीबद्दल विचारणा करायची आहे.` 
                  : language === 'hi' 
                  ? `नमस्ते आशा दीदी, मैं ${userName || 'माता'} बात कर रही हूँ। मुझे ANC जांच के बारे में जानकारी चाहिए।` 
                  : `Hello ASHA Tai, I am ${userName || 'Registered Mother'} (RCH: ${beneficiary?.rchId || '-'}). I need guidance regarding my ANC checkup.`;
                if (!sendDirectWhatsApp(beneficiary?.assignedAsha.phone || '', text).success) alert('No valid ASHA phone number on record.');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <span>📱 WhatsApp ASHA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const text = language === 'mr' 
                  ? `नमस्ते आशा ताई, मी ${userName || 'माता'} बोलत आहे. मला ANC तपासणीबद्दल मदत हवी आहे.` 
                  : language === 'hi' 
                  ? `नमस्ते आशा दीदी, मैं ${userName || 'माता'}। मुझे स्वास्थ्य सहायता चाहिए।` 
                  : `Hello ASHA, I am ${userName || 'Registered Mother'}. Need assistance for ANC visit.`;
                if (!sendDirectSMS(beneficiary?.assignedAsha.phone || '', text).success) alert('No valid ASHA phone number on record.');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <span>💬 SMS ASHA</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8-Contact ANC Timeline Checklist */}
      <div id="tour-mother-schedule" className="silky-glass rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              {language === 'mr' ? '८-तपासणी अधिकृत वेळापत्रक (WHO 8-ANC Model)' : language === 'hi' ? '8-जांच आधिकारिक अनुसूची (WHO 8-ANC)' : 'WHO 8-Contact ANC Clinical Schedule'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {language === 'mr' ? 'नियमित तपासणीमुळे माता व बाळाचे आरोग्य सुरक्षित राहते.' : language === 'hi' ? 'नियमित जांच से मां और बच्चे का स्वास्थ्य सुरक्षित रहता है।' : 'Timely clinical checkups safeguard maternal & neonatal outcomes.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* ANC 1 */}
          <div className="silky-card p-3.5 rounded-2xl border-emerald-500/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-600 dark:text-emerald-300">ANC 1 (12 Wks)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              {language === 'mr' ? 'पहिली नोंदणी, हिमोग्लोबिन व प्राथमिक रक्तगट तपासणी.' : language === 'hi' ? 'प्रथम पंजीकरण, हीमोग्लोबिन व रक्त समूह जांच।' : 'Initial registration, hemoglobin & blood grouping.'}
            </p>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full inline-block font-bold">
              {language === 'mr' ? 'पूर्ण झाले' : language === 'hi' ? 'पूर्ण' : 'Completed'}
            </span>
          </div>

          {/* ANC 2 */}
          <div className="silky-card p-3.5 rounded-2xl border-emerald-500/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-600 dark:text-emerald-300">ANC 2 (20 Wks)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              {language === 'mr' ? 'USG सोनोग्राफी व TT/Td पहिला डोस पूर्ण.' : language === 'hi' ? 'USG सोनोग्राफी और TT/Td प्रथम खुराक।' : 'Anomaly USG Scan & Td dose 1.'}
            </p>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full inline-block font-bold">
              {language === 'mr' ? 'पूर्ण झाले' : language === 'hi' ? 'पूर्ण' : 'Completed'}
            </span>
          </div>

          {/* ANC 3 (Upcoming) */}
          <div className="silky-card p-3.5 rounded-2xl border-rose-500/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-600 dark:text-rose-300">ANC 3 (26 Wks)</span>
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-[11px] text-slate-800 dark:text-slate-200 font-bold">
              {language === 'mr' ? 'PMSMA ९ सप्टेंबर शिबिर: BP व वजन तपासणी.' : language === 'hi' ? 'PMSMA 9 सितंबर शिविर: BP व वजन जांच।' : 'PMSMA 9th Sept: Specialist BP & weight screening.'}
            </p>
            <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full inline-block font-bold">
              {language === 'mr' ? 'आगामी' : language === 'hi' ? 'आगामी' : 'Upcoming Due'}
            </span>
          </div>

          {/* ANC 4 */}
          <div className="silky-card p-3.5 rounded-2xl space-y-1.5 opacity-75">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 dark:text-slate-300">ANC 4 (30 Wks)</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'mr' ? 'तिसरा तिमाही रक्तदाब व गर्भवाढ देखरेख.' : language === 'hi' ? 'तीसरी तिमाही रक्तचाप व भ्रूण विकास निगरानी।' : '3rd Trimester BP & symphysio-fundal monitoring.'}
            </p>
            <span className="text-[10px] bg-black/10 dark:bg-white/10 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full inline-block font-bold">
              {language === 'mr' ? 'नियोजित' : language === 'hi' ? 'नियोजित' : 'Scheduled'}
            </span>
          </div>
        </div>
      </div>

      {/* REAL SCANNABLE QR MODAL OVERLAY */}
      {/* Mother's Unique Scannable QR Pass Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-white/20 shadow-2xl text-center space-y-3.5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/15 pb-2.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <QrCode className="w-5 h-5 text-rose-500 shrink-0" />
                <h3 className="text-sm sm:text-base font-black text-white truncate text-left">
                  {userName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center font-black text-xs cursor-pointer shrink-0 transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-snug">
              {language === 'mr' 
                ? 'डॉक्टर किंवा आशा सेविका हा QR थेट स्कॅन करून तुमची सर्व वैद्यकीय माहिती पाहू शकतात.' 
                : language === 'hi'
                ? 'डॉक्टर या आशा कार्यकर्ता यह QR सीधे स्कैन करके आपका सम्पूर्ण मेडिकल इतिहास देख सकते हैं।'
                : 'Doctor or ASHA worker scans this QR code to access your encrypted clinical history.'}
            </p>

            {/* Real Scannable High-Res QR Code Card */}
            <div className="bg-white p-3 sm:p-4 rounded-3xl inline-flex items-center justify-center shadow-2xl border-4 border-teal-500/40 max-w-full">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="Scannable Mother MCP QR Pass" 
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-500 font-bold">
                  Generating Real QR...
                </div>
              )}
            </div>

            {/* Unique Beneficiary Details */}
            <div className="bg-black/50 p-2.5 rounded-2xl border border-white/10 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-300">
                <span>RCH ID:</span>
                <span className="font-mono text-teal-400 font-black">{beneficiary?.rchId || 'MH-PUN-2026-8819'}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-300">
                <span>ऑफलाइन सुरक्षा पिन (PIN):</span>
                <span className="font-mono font-black text-rose-400 text-sm tracking-widest">{beneficiary?.accessPin || '----'}</span>
              </div>
            </div>

            {/* Test Consent Gate & Auto-Lock Action */}
            <button
              type="button"
              onClick={() => {
                setShowQrModal(false);
                setShowConsentPortal(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/25 transition hover:scale-[1.02]"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>{language === 'mr' ? '🛡️ रुग्ण संमती व ५-मि. ऑटो-लॉक तपासा' : '🛡️ Test DPDP Consent Gate'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-xl cursor-pointer transition border border-white/15"
            >
              {language === 'mr' ? 'बंद करा (Close)' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Patient Record Consent & Auto-Lock Portal */}
      {showConsentPortal && (
        <PatientRecordConsentPortal
          beneficiary={beneficiary || {
            id: 'ben_001',
            rchId: 'MH-PUN-2026-8819',
            name: userName,
            age: 24,
            phone: userPhone,
            husbandName: 'Rajesh Shinde',
            village: 'Koregaon Bhima',
            ward: 'Shirur Taluka Ward 4',
            district: 'Pune Rural',
            assignedAsha: {
              name: 'Savita Patil',
              phone: '+91 97654 32101'
            },
            lmp: '2026-03-01',
            edd: '2026-11-18',
            currentGestationalWeeks: 26,
            gravidity: 1,
            parity: 0,
            hasPrevCesarean: false,
            hasPastStillbirth: false,
            bloodGroup: 'B+',
            currentRiskTier: 'GREEN',
            mlRiskScore: 0.12,
            riskFactors: [],
            vitalsHistory: [
              {
                id: 'vit_001',
                date: '2026-08-10',
                gestationalWeek: 26,
                systolicBP: 120,
                diastolicBP: 80,
                hemoglobin: 11.2,
                bloodSugar: 95,
                weightKg: 54,
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
                recordedBy: 'Savita Patil (ASHA)',
                facility: 'Koregaon Bhima PHC',
                syncStatus: 'SYNCED'
              }
            ],
            ancSchedule: [],
            prescriptions: [],
            audioNotes: [],
            dpdpConsent: createDefaultDPDPConsent(language),
            qrAuthToken: 'PASS_8819',
            accessPin: '',
            registeredAt: new Date().toISOString(),
            lastSyncedAt: new Date().toISOString()
          }}
          language={language}
          onClose={() => setShowConsentPortal(false)}
        />
      )}

      {/* Device Permissions Modal */}
      {showPermissionsModal && (
        <DevicePermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          language={language}
        />
      )}
    </div>
  );
};
