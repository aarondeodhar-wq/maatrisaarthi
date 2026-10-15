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
  Lock,
  Baby,
  HeartPulse
} from 'lucide-react';
import { HealthPassQr } from './HealthPassQr';
import { createDefaultDPDPConsent } from '../core/dpdpCompliance';
import { sendDirectWhatsApp, sendDirectSMS } from '../core/freeAlertsService';
import { DevicePermissionsModal } from './DevicePermissionsModal';
import { PatientRecordConsentPortal } from './PatientRecordConsentPortal';
import { Beneficiary } from '../types';
import { UserProfile } from '../core/firebaseAuth';
import { confirmVisitCode } from '../core/visitCodes';
import { predictMaternalRisk, buildClinicalVitals } from '../core/mlRiskEngine';
import { daysUntilNextPmsma } from '../core/protocolEngine';
import { ExplainableAiPanel } from './ExplainableAiPanel';

interface MotherPersonalViewProps {
  profile?: UserProfile | null;
  prefillConfirm?: string | null; // "<beneficiaryId>.<code>" from a scanned visit-confirmation QR
  language: Language;
  userName: string;
  userPhone: string;
  beneficiary?: Beneficiary;
}

export const MotherPersonalView: React.FC<MotherPersonalViewProps> = ({
  language,
  userName,
  userPhone,
  beneficiary,
  profile,
  prefillConfirm
}) => {
  const [confirmCode, setConfirmCode] = useState<string>(() => (prefillConfirm ? prefillConfirm.split('.')[1] || '' : ''));
  const [confirmState, setConfirmState] = useState<'IDLE' | 'BUSY' | 'DONE' | 'FAILED'>('IDLE');

  const handleConfirmVisit = async () => {
    if (!profile || !beneficiary) return;
    setConfirmState('BUSY');
    try {
      const result = await confirmVisitCode(profile, beneficiary.id, confirmCode);
      setConfirmState(result === 'CONFIRMED' ? 'DONE' : 'FAILED');
    } catch (e) {
      setConfirmState('FAILED');
    }
  };

  const [ifaTakenToday, setIfaTakenToday] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showConsentPortal, setShowConsentPortal] = useState(false);
  // Everything shown comes from her own record; nothing is filled in when it is missing
  const analysis = beneficiary ? predictMaternalRisk(buildClinicalVitals(beneficiary)) : null;
  const weeks = beneficiary?.currentGestationalWeeks;
  const trimester = weeks === undefined ? null : weeks < 14 ? 1 : weeks < 28 ? 2 : 3;
  const pmsmaDays = daysUntilNextPmsma();
  const nextAnc = beneficiary?.ancSchedule.find(c => c.status !== 'COMPLETED');
  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(language === 'en' ? 'en-IN' : language === 'hi' ? 'hi-IN' : 'mr-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const tier = beneficiary?.currentRiskTier;
  const tierLabel = !beneficiary
    ? (language === 'mr' ? 'नोंद नाही' : language === 'hi' ? 'रिकॉर्ड नहीं' : 'No record yet')
    : tier === 'RED'
    ? (language === 'mr' ? 'उच्च धोका - त्वरित तपासणी' : language === 'hi' ? 'उच्च जोखिम - तुरंत जांच' : 'High risk - see doctor now')
    : tier === 'YELLOW'
    ? (language === 'mr' ? 'मध्यम धोका - जवळून देखरेख' : language === 'hi' ? 'मध्यम जोखिम - निगरानी' : 'Moderate risk - close follow-up')
    : (language === 'mr' ? 'सुरक्षित / सामान्य' : language === 'hi' ? 'सुरक्षित / सामान्य' : 'Low risk / normal');
  const tierColor = tier === 'RED' ? 'text-rose-700' : tier === 'YELLOW' ? 'text-amber-700' : 'text-emerald-700';

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn font-sans">
      {/* Top Banner Card: Personal Mother Profile */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
              <Heart className="w-7 h-7 fill-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{userName}</h2>
                <span className="bg-white text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>सक्रिय (Active)</span>
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium mt-1">RCH: {beneficiary?.rchId || (language === 'en' ? 'not linked yet' : '-')}</p>
              {(beneficiary?.village || beneficiary?.district) && (
                <p className="text-xs text-rose-100 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-white" />
                  <span>{[beneficiary?.village, beneficiary?.district].filter(Boolean).join(' • ')}</span>
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions: Show Real QR Pass & Device Permissions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white cursor-pointer"
              title="Device Permissions & Privacy"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <button
              id="tour-mother-qr"
              onClick={() => setShowQrModal(true)}
              className="bg-white text-rose-700 hover:bg-rose-50 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition"
            >
              <QrCode className="w-4 h-4" />
              <span>{language === 'mr' ? 'माझा डिजिटल QR पास' : language === 'hi' ? 'मेरा डिजिटल QR पास' : 'View Real QR Pass'}</span>
            </button>
          </div>
        </div>

        {/* Gestational Progress & EDD Banner */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/95 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 block">
              {language === 'mr' ? 'गर्भधारणा काळ:' : language === 'hi' ? 'गर्भावस्था चरण:' : 'Gestational Stage:'}
            </span>
            <span className="text-sm font-black text-slate-950 flex items-center gap-1.5 mt-0.5">
              <Activity className="w-4 h-4 text-purple-500" />
              <span>{weeks === undefined ? '-' : language === 'mr' ? `${weeks} आठवडे (${trimester} रा तिमाही)` : language === 'hi' ? `${weeks} सप्ताह (तिमाही ${trimester})` : `${weeks} Weeks (Trimester ${trimester})`}</span>
            </span>
          </div>

          <div className="bg-white/95 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 block">
              {language === 'mr' ? 'अपेक्षित प्रसूती:' : language === 'hi' ? 'अपेक्षित प्रसव तिथि:' : 'Estimated Due Date (EDD):'}
            </span>
            <span className="text-sm font-black text-slate-950 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-4 h-4 text-rose-500" />
              <span>{formatDate(beneficiary?.edd)}</span>
            </span>
          </div>

          <div className="bg-white/95 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 block">
              {language === 'mr' ? 'जोखीम श्रेणी:' : language === 'hi' ? 'जोखिम श्रेणी:' : 'Risk Triage:'}
            </span>
            <span className={`text-sm font-black flex items-center gap-1.5 mt-0.5 ${tierColor}`}>
              <ShieldCheck className="w-4 h-4" />
              <span>{tierLabel}</span>
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
            {nextAnc
              ? `ANC ${nextAnc.contactNo}: ${nextAnc.title[language] || nextAnc.title.en} • ${formatDate(nextAnc.dueDate)}`
              : (language === 'mr' ? 'पुढील तपासणी आशा सेविका ठरवतील.' : language === 'hi' ? 'अगली जांच आशा कार्यकर्ता तय करेंगी।' : 'Your ASHA worker will schedule the next checkup.')}
          </p>

          <div className="silky-card p-2.5 rounded-xl flex items-center justify-between text-xs font-bold border border-slate-200 dark:border-white/10">
            <span className="text-slate-700 dark:text-slate-300">
              {language === 'mr' ? 'तपासणी बाकी:' : language === 'hi' ? 'समय शेष:' : 'Time Left:'}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-mono font-black">
              {pmsmaDays === 0
                ? (language === 'mr' ? 'आज PMSMA' : language === 'hi' ? 'आज PMSMA' : 'PMSMA today')
                : language === 'mr' ? `PMSMA: ${pmsmaDays} दिवस` : language === 'hi' ? `PMSMA: ${pmsmaDays} दिन` : `PMSMA in ${pmsmaDays} ${pmsmaDays === 1 ? 'day' : 'days'}`}
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

      {/* Confirm an ASHA visit: second factor, with the one-time code the ASHA shows */}
      {profile && beneficiary && (
        <div id="mother-confirm-visit" className="silky-glass rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-white space-y-3">
          <h3 className="text-sm font-black flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            {language === 'mr' ? 'आशा सेविकेची भेट निश्चित करा' : language === 'hi' ? 'आशा की विज़िट की पुष्टि करें' : 'Confirm your ASHA visit'}
          </h3>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            {language === 'mr'
              ? 'आशा सेविकेने दाखवलेला ६-अंकी कोड येथे टाका. कोड १५ मिनिटे वैध असतो.'
              : language === 'hi'
              ? 'आशा द्वारा दिखाया गया 6 अंकों का कोड यहाँ डालें। कोड 15 मिनट मान्य है।'
              : 'Enter the 6-digit code your ASHA worker shows you. It is valid for 15 minutes and works once.'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={confirmCode}
              onChange={e => { setConfirmCode(e.target.value.replace(/\D/g, '')); setConfirmState('IDLE'); }}
              placeholder="------"
              className="flex-1 text-center tracking-[0.3em] font-mono text-lg font-black border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={handleConfirmVisit}
              disabled={confirmCode.length !== 6 || confirmState === 'BUSY' || confirmState === 'DONE'}
              className="btn-pill-primary px-5 text-xs font-black cursor-pointer disabled:opacity-50"
            >
              {language === 'mr' ? 'निश्चित करा' : language === 'hi' ? 'पुष्टि करें' : 'Confirm'}
            </button>
          </div>
          {confirmState === 'DONE' && (
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">Visit confirmed. Thank you.</p>
          )}
          {confirmState === 'FAILED' && (
            <p className="text-xs font-black text-rose-600 dark:text-rose-400">That code is wrong, already used, or expired. Ask your ASHA worker for a new code.</p>
          )}
        </div>
      )}

      {/* Preterm Labor Awareness & Baby Health Card */}
      <div className="silky-glass rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 border border-rose-200/60 dark:border-rose-500/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center">
              <Baby className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                <span>{language === 'mr' ? 'अकाली प्रसूती माहिती व बाळाचे आरोग्य' : language === 'hi' ? 'समय पूर्व प्रसव जानकारी एवं शिशु स्वास्थ्य' : 'Preterm Labor Awareness & Baby Health'}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {language === 'mr' ? '३७ आठवड्यांपूर्वी प्रसूतीची लक्षणे ओळखणे व काळजी घेणे' : language === 'hi' ? '37 सप्ताह से पूर्व प्रसव के लक्षण पहचानना' : 'Recognizing early labor signs before 37 completed weeks'}
              </p>
            </div>
          </div>
          {beneficiary?.currentGestationalWeeks && (
            <span className="font-mono text-xs font-black px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
              {beneficiary.currentGestationalWeeks} Weeks Gestation
            </span>
          )}
        </div>

        {/* Clear Clinical Definitions in Plain Language */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 to-pink-50/80 dark:from-rose-950/30 dark:to-pink-950/20 border border-rose-200/80 dark:border-rose-500/30 space-y-2 text-xs leading-relaxed">
          <div className="space-y-1">
            <span className="font-black text-rose-900 dark:text-rose-200 block">
              📖 {language === 'mr' ? 'अकाली प्रसूती (Preterm Labor) म्हणजे काय?' : language === 'hi' ? 'समय पूर्व प्रसव (Preterm Labor) क्या है?' : 'What is Preterm Labor?'}
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              {language === 'mr'
                ? 'अकाली प्रसूती म्हणजे गर्भधारणेचे ३७ पूर्ण आठवडे होण्यापूर्वी सुरू होणारी प्रसूती. अकाली प्रसूतीचा धोका म्हणजे असे घटक ज्यांमुळे प्रसूती वेळेआधी होण्याची शक्यता जास्त असते.'
                : language === 'hi'
                ? 'समय से पहले प्रसव (Preterm Labor) का अर्थ है गर्भावस्था के 37 पूर्ण सप्ताह से पहले प्रसव पीड़ा या प्रसव शुरू होना। प्रीटर्म जोखिम का अर्थ है वे कारक जो समय से पहले प्रसव की संभावना बढ़ाते हैं।'
                : 'Preterm labor means labor that starts before 37 completed weeks of pregnancy. Preterm-labor risk means factors suggesting that a pregnant woman may have a higher chance of going into labor too early.'}
            </p>
          </div>
        </div>

        {/* Warning Signs Checklist to watch for */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>
              {language === 'mr'
                ? '३७ आठवड्यांपूर्वी खालील लक्षणे दिसल्यास त्वरित आशा ताई किंवा १०८ वर संपर्क करा:'
                : language === 'hi'
                ? '37 सप्ताह से पहले ये लक्षण दिखें तो तुरंत 108 या आशा दीदी से संपर्क करें:'
                : 'Watch for these early labor warning signs before 37 weeks:'}
            </span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                ⏱️ {language === 'mr' ? 'पोट घट्ट होणे / आकुंचन' : language === 'hi' ? 'पेट में संकुचन / अकड़न' : 'Regular Contractions'}
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {language === 'mr' ? 'एका तासात ४ पेक्षा जास्त वेळा पोट दुखणे किंवा घट्ट होणे.' : language === 'hi' ? 'एक घंटे में 4 या अधिक बार पेट कसना या दर्द होना।' : 'Frequent tightenings occurring more than 4 times in an hour.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                💧 {language === 'mr' ? 'अचानक पाणी जाणे' : language === 'hi' ? 'पानी की थैली फटना' : 'Water Leaking (Ruptured Bag)'}
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {language === 'mr' ? 'अंगावरून सतत पाणी वाहणे किंवा पाण्याचा स्त्राव होणे.' : language === 'hi' ? 'योनि मार्ग से लगातार या अचानक पानी बहना।' : 'Continuous trickling or sudden gush of clear fluid from the vagina.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                ⚡ {language === 'mr' ? 'ओटीपोट व कंबरदुखी' : language === 'hi' ? 'पीठ के निचले हिस्से में दर्द' : 'Constant Low Backache & Pelvic Pressure'}
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {language === 'mr' ? 'बाळ खाली सरकल्यासारखा दाब जाणवणे व सतत कंबरदुखी.' : language === 'hi' ? 'शिशु का नीचे खिसकने का दबाव व लगातार पीठ दर्द।' : 'Persistent dull lower back pain and feeling like the baby is pushing down.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                🩸 {language === 'mr' ? 'रक्तस्त्राव किंवा डाग' : language === 'hi' ? 'रक्तस्राव या धब्बे' : 'Vaginal Bleeding or Spotting'}
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {language === 'mr' ? 'लाल किंवा तपकिरी रंगाचा स्त्राव आढळल्यास ताबडतोब रुग्णालयात जा.' : language === 'hi' ? 'लाल या भूरे रंग का स्राव दिखने पर तुरंत अस्पताल जाएं।' : 'Any pink, brown, or bright red blood requires immediate emergency check.'}
              </p>
            </div>
          </div>
        </div>

        {/* Multiple Pregnancy or Fetal Placement Status Note */}
        {beneficiary?.pregnancy && (
          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-pink-500" />
              <span className="font-black text-slate-900 dark:text-white">
                {beneficiary.pregnancy.fetusCount === 2
                  ? (language === 'mr' ? 'जुळे गर्भ (Twin Pregnancy): अतिरिक्त विश्रांती व देखरेख आवश्यक.' : 'Twin Pregnancy: Extra rest, hydration & bi-weekly monitoring advised.')
                  : (language === 'mr' ? 'गर्भस्थिती: नियमित सुरक्षित मातृत्व देखरेख चालू.' : 'Fetal Status: Routine safe motherhood tracking active.')}
              </span>
            </div>
            <a
              href="tel:108"
              className="text-[11px] font-black bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>108 SOS</span>
            </a>
          </div>
        )}
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

        {beneficiary && beneficiary.ancSchedule.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {beneficiary.ancSchedule.map(c => {
              const done = c.status === 'COMPLETED';
              const overdue = c.status === 'OVERDUE';
              const isNext = nextAnc?.contactNo === c.contactNo;
              return (
                <div key={c.contactNo} className={`silky-card p-3.5 rounded-2xl space-y-1.5 ${done ? 'border-emerald-500/40' : overdue || isNext ? 'border-rose-500/50' : 'opacity-80'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${done ? 'text-emerald-600 dark:text-emerald-300' : overdue || isNext ? 'text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'}`}>
                      ANC {c.contactNo} ({c.targetWeek} Wks)
                    </span>
                    {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className={`w-4 h-4 ${overdue || isNext ? 'text-rose-500' : 'text-slate-400'}`} />}
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">{c.title[language] || c.title.en}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatDate(c.dueDate)}{c.assignedFacility ? ` • ${c.assignedFacility}` : ''}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block font-bold ${done ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : overdue ? 'bg-rose-600 text-white' : isNext ? 'bg-rose-100 text-rose-800' : 'bg-black/10 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
                    {done
                      ? (language === 'mr' ? 'पूर्ण झाले' : language === 'hi' ? 'पूर्ण' : 'Completed')
                      : overdue
                      ? (language === 'mr' ? 'उशीर' : language === 'hi' ? 'विलंबित' : 'Overdue')
                      : isNext
                      ? (language === 'mr' ? 'आगामी' : language === 'hi' ? 'आगामी' : 'Next')
                      : (language === 'mr' ? 'नियोजित' : language === 'hi' ? 'नियोजित' : 'Scheduled')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'mr' ? 'तुमचे तपासणी वेळापत्रक आशा सेविका नोंदणी केल्यावर दिसेल.' : language === 'hi' ? 'आपका जांच कार्यक्रम आशा पंजीकरण के बाद दिखेगा।' : 'Your checkup schedule appears once your ASHA worker registers you.'}
          </p>
        )}
      </div>

      {/* Explainable AI: why her risk level is what it is (with Listen for read-aloud) */}
      {analysis && (
        <ExplainableAiPanel
          result={analysis}
          language={language}
          title={language === 'mr' ? 'माझा धोका - का?' : language === 'hi' ? 'मेरा जोखिम - क्यों?' : 'My risk - why?'}
        />
      )}

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
              <HealthPassQr beneficiary={beneficiary} className="w-44 h-44 sm:w-48 sm:h-48" />
            </div>

            {/* Unique Beneficiary Details */}
            <div className="bg-black/50 p-2.5 rounded-2xl border border-white/10 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-300">
                <span>RCH ID:</span>
                <span className="font-mono text-teal-400 font-black">{beneficiary?.rchId || '-'}</span>
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
      {showConsentPortal && beneficiary && (
        <PatientRecordConsentPortal
          beneficiary={beneficiary}
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
