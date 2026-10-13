import React, { useState } from 'react';
import { Beneficiary, Language, NotificationTemplate } from '../types';
import { NOTIFICATION_TEMPLATES, formatNotificationText } from '../core/notificationEngine';
import { sendFreeWhatsAppAlert, sendFreeSmsAlert, openPersonalWhatsApp, sendDirectWhatsApp, sendDirectSMS, describeAlertOutcome } from '../core/freeAlertsService';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Smartphone, 
  Calendar, 
  AlertTriangle, 
  Pill, 
  ShieldCheck, 
  Sparkles, 
  Globe, 
  Copy,
  Clock,
  Phone,
  Laptop,
  Share2
} from 'lucide-react';

interface ReminderSandboxProps {
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary;
  onSelectBeneficiary: (b: Beneficiary) => void;
  language: Language;
  onUpdateConsent: (beneficiaryId: string, optIn: boolean, preferredLang: Language) => void;
}

export const ReminderSandbox: React.FC<ReminderSandboxProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  language,
  onUpdateConsent
}) => {
  const [selectedTemplateType, setSelectedTemplateType] = useState<NotificationTemplate['type']>('ANC_DUE');
  const [targetChannel, setTargetChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  const [targetLanguage, setTargetLanguage] = useState<Language>(language);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchToast, setDispatchToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const activeTemplate = NOTIFICATION_TEMPLATES.find(t => t.type === selectedTemplateType) || NOTIFICATION_TEMPLATES[0];
  const templateRawText = activeTemplate.templates[targetLanguage] || activeTemplate.templates.en;
  const previewMessage = formatNotificationText(templateRawText, selectedBeneficiary);

  const handleTriggerDispatch = async () => {
    setIsDispatching(true);
    let res;
    if (targetChannel === 'WHATSAPP') {
      res = await sendFreeWhatsAppAlert({
        recipientPhone: selectedBeneficiary.phone,
        recipientName: selectedBeneficiary.name,
        messageType: selectedTemplateType,
        language: targetLanguage,
        customText: previewMessage,
        rchId: selectedBeneficiary.rchId
      });
    } else {
      res = await sendFreeSmsAlert({
        recipientPhone: selectedBeneficiary.phone,
        recipientName: selectedBeneficiary.name,
        messageType: selectedTemplateType,
        language: targetLanguage,
        customText: previewMessage,
        rchId: selectedBeneficiary.rchId
      });
    }
    setIsDispatching(false);

    setDispatchToast({
      open: true,
      message: describeAlertOutcome(res, selectedBeneficiary.name)
    });
    setTimeout(() => {
      setDispatchToast({ open: false, message: '' });
    }, 5000);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 font-sans">
      {/* Top Banner with Apple Health Glass Style */}
      <div className="silky-glass rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-white/15">
        {/* macOS Traffic Lights Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="macos-traffic-light">
              <span className="macos-dot-red" />
              <span className="macos-dot-yellow" />
              <span className="macos-dot-green" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-blue-500" />
              Automated Notification & WhatsApp Reminder Hub
            </span>
          </div>

          <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            DPDP 2023 Consent Checked
          </span>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2.5 tracking-tight">
            <MessageSquare className="w-6 h-6 text-rose-500" />
            <span>{language === 'mr' ? 'मराठी संदेश व व्हॉट्सअॅप सिम्युलेटर' : 'Multilingual Nudge Sandbox & DPDP Consent Engine'}</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
            Interactive preview of Marathi (`मराठी`), Hindi (`हिंदी`), and English notification templates with real-time token injection
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Configurator (7 Cols) */}
        <div className="lg:col-span-7 silky-glass rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-white/15">
          {/* Target Beneficiary Selector */}
          <div>
            <label className="text-xs font-black text-slate-950 dark:text-white block mb-1.5">
              {language === 'mr' ? 'लक्ष्य लाभार्थी माता निवडा:' : 'Select Target Beneficiary:'}
            </label>
            <select
              value={selectedBeneficiary.id}
              onChange={e => {
                const found = beneficiaries.find(b => b.id === e.target.value);
                if (found) onSelectBeneficiary(found);
              }}
              className="w-full border border-slate-300 dark:border-white/20 rounded-2xl p-3 text-xs font-bold text-slate-950 dark:text-white bg-slate-50 dark:bg-black/40 shadow-xs focus:border-teal-500 focus:outline-none cursor-pointer"
            >
              {beneficiaries.map(b => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold">
                  {b.name} ({b.currentRiskTier} Risk) - {b.village} - {b.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Template Type Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-950 dark:text-white block mb-1.5">
              {language === 'mr' ? 'संदेश प्रकार निवडा (Notification Template):' : 'Select Template Scenario:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* ANC Due Alert */}
              <button
                type="button"
                onClick={() => setSelectedTemplateType('ANC_DUE')}
                className={`p-3.5 rounded-2xl border text-left font-black transition cursor-pointer flex items-center gap-2.5 ${
                  selectedTemplateType === 'ANC_DUE'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 !text-white border-emerald-400 shadow-md'
                    : 'bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <Calendar className={`w-4 h-4 shrink-0 ${selectedTemplateType === 'ANC_DUE' ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
                <div>
                  <div className="leading-tight font-black">📅 ANC Due Alert</div>
                  <span className={`text-[10px] block mt-0.5 ${selectedTemplateType === 'ANC_DUE' ? '!text-white/90 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                    तपासणी स्मरणपत्र
                  </span>
                </div>
              </button>

              {/* PMSMA Specialist */}
              <button
                type="button"
                onClick={() => setSelectedTemplateType('PMSMA_CAMP')}
                className={`p-3.5 rounded-2xl border text-left font-black transition cursor-pointer flex items-center gap-2.5 ${
                  selectedTemplateType === 'PMSMA_CAMP'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 !text-white border-blue-400 shadow-md'
                    : 'bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <Calendar className={`w-4 h-4 shrink-0 ${selectedTemplateType === 'PMSMA_CAMP' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <div>
                  <div className="leading-tight font-black">🏥 PMSMA 9th Specialist</div>
                  <span className={`text-[10px] block mt-0.5 ${selectedTemplateType === 'PMSMA_CAMP' ? '!text-white/90 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                    ९ तारीख विशेष शिबिर
                  </span>
                </div>
              </button>

              {/* High-Risk Emergency */}
              <button
                type="button"
                onClick={() => setSelectedTemplateType('HIGH_RISK_ALERT')}
                className={`p-3.5 rounded-2xl border text-left font-black transition cursor-pointer flex items-center gap-2.5 ${
                  selectedTemplateType === 'HIGH_RISK_ALERT'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 !text-white border-rose-400 shadow-md animate-pulse'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 shrink-0 ${selectedTemplateType === 'HIGH_RISK_ALERT' ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`} />
                <div>
                  <div className="leading-tight font-black">🚨 High-Risk Emergency</div>
                  <span className={`text-[10px] block mt-0.5 ${selectedTemplateType === 'HIGH_RISK_ALERT' ? '!text-white/90 font-bold' : 'text-rose-700 dark:text-rose-300 font-medium'}`}>
                    उच्च जोखीम तात्काळ सूचना
                  </span>
                </div>
              </button>

              {/* IFA Pill Adherence */}
              <button
                type="button"
                onClick={() => setSelectedTemplateType('IFA_NUTRITION')}
                className={`p-3.5 rounded-2xl border text-left font-black transition cursor-pointer flex items-center gap-2.5 ${
                  selectedTemplateType === 'IFA_NUTRITION'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 !text-white border-amber-400 shadow-md'
                    : 'bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <Pill className={`w-4 h-4 shrink-0 ${selectedTemplateType === 'IFA_NUTRITION' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
                <div>
                  <div className="leading-tight font-black">💊 IFA Pill Adherence</div>
                  <span className={`text-[10px] block mt-0.5 ${selectedTemplateType === 'IFA_NUTRITION' ? '!text-white/90 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                    लोहयुक्त गोळी स्मरण
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Language & Channel Toggles with Apple Health High Contrast */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 dark:bg-black/30 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
              <label className="text-xs font-black text-slate-950 dark:text-white block">Message Language:</label>
              <div className="flex gap-1.5">
                {(['mr', 'hi', 'en'] as const).map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setTargetLanguage(lang)}
                    className={`flex-1 py-2 rounded-xl font-black text-xs cursor-pointer transition ${
                      targetLanguage === lang 
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-600 !text-white shadow-sm' 
                        : 'bg-white dark:bg-white/10 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {lang === 'mr' ? 'मराठी' : lang === 'hi' ? 'हिंदी' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-black/30 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
              <label className="text-xs font-black text-slate-950 dark:text-white block">Delivery Channel:</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetChannel('WHATSAPP')}
                  className={`flex-1 py-2 rounded-xl font-black text-xs cursor-pointer transition ${
                    targetChannel === 'WHATSAPP' 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 !text-white shadow-sm' 
                      : 'bg-white dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  📱 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setTargetChannel('SMS')}
                  className={`flex-1 py-2 rounded-xl font-black text-xs cursor-pointer transition ${
                    targetChannel === 'SMS' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 !text-white shadow-sm' 
                      : 'bg-white dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  💬 Govt SMS
                </button>
              </div>
            </div>
          </div>

          {/* Trigger Dispatch Button */}
          <button
            type="button"
            onClick={handleTriggerDispatch}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black py-3.5 px-4 rounded-2xl shadow-xl shadow-emerald-950/20 transition cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/20 active:scale-98"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'mr' ? '⚡ प्रत्यक्ष WhatsApp / SMS पाठवा' : language === 'hi' ? '⚡ सीधा WhatsApp / SMS भेजें' : '⚡ Send Real WhatsApp / SMS Now'}</span>
          </button>
        </div>

        {/* Right Column: Phone Screen Live Message Simulator (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center gap-3">
          <div className="w-full max-w-sm rounded-[44px] bg-slate-900 dark:bg-black p-3.5 shadow-2xl border-4 border-slate-700 dark:border-slate-800 font-sans">
            <div className="rounded-[34px] overflow-hidden flex flex-col justify-between min-h-[500px] border border-slate-300 dark:border-white/10">
              {/* Phone App Bar */}
              <div className="p-3.5 bg-[#075E54] dark:bg-[#1F2C34] text-white rounded-t-[32px] border-b border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm ${
                    targetChannel === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}>
                    {targetChannel === 'WHATSAPP' ? 'WA' : 'SMS'}
                  </div>
                  <div>
                    <div className="font-black text-white leading-tight">MAATRISAARTHI-GOV</div>
                    <span className="text-[10px] text-emerald-300 font-bold">Verified Health Gateway</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-400/30">Live</span>
              </div>

              {/* Message Chat Bubble (WhatsApp Style Background & High Contrast) */}
              <div className="p-4 flex-1 flex flex-col justify-center space-y-3 bg-[#EFEAE2] dark:bg-[#0B141B]">
                <div className={`p-4 rounded-2xl rounded-tr-none text-xs space-y-2 shadow-md border ${
                  targetChannel === 'WHATSAPP'
                    ? 'bg-white dark:bg-[#005C4B] border-slate-300 dark:border-emerald-500/30 text-slate-950 dark:text-emerald-50'
                    : 'bg-white dark:bg-[#1A365D] border-slate-300 dark:border-blue-500/30 text-slate-950 dark:text-blue-50'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed font-semibold text-slate-950 dark:text-white">
                    {previewMessage}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-300 pt-1.5 border-t border-slate-200 dark:border-white/10 font-mono">
                    <span>Sender: PHC-PUNE</span>
                    <span className="text-sky-600 dark:text-sky-300 font-bold">Direct API ✓✓</span>
                  </div>
                </div>
              </div>

              {/* Bottom Phone Bar with Instant Launch Links */}
              <div className="p-3.5 bg-white dark:bg-[#1F2C34] rounded-b-[32px] border-t border-slate-200 dark:border-white/10 space-y-2 text-center">
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block truncate">
                  Recipient: {selectedBeneficiary.name} (+91 {selectedBeneficiary.phone})
                </span>
                
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => sendDirectWhatsApp(selectedBeneficiary.phone, previewMessage)}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm active:scale-95"
                  >
                    <span>📱 WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => sendDirectSMS(selectedBeneficiary.phone, previewMessage)}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                  >
                    <span>💬 Direct SMS</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Toast Notification */}
      {dispatchToast.open && (
        <div className="fixed bottom-6 right-6 max-w-md bg-emerald-700 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-start gap-3 border border-emerald-400 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0 mt-0.5" />
          <div className="text-xs font-black leading-relaxed">
            {dispatchToast.message}
          </div>
        </div>
      )}
    </div>
  );
};
