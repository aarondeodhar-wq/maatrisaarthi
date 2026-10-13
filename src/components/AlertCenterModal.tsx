import React, { useState } from 'react';
import { Beneficiary, Language } from '../types';
import { 
  Bell, 
  PhoneCall, 
  AlertTriangle, 
  Calendar, 
  Pill, 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  X,
  ChevronDown
} from 'lucide-react';

interface AlertCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary;
  onSelectBeneficiary: (b: Beneficiary) => void;
  language: Language;
  onTriggerAlert: (alertType: string, b: Beneficiary) => void;
}

export const AlertCenterModal: React.FC<AlertCenterModalProps> = ({
  isOpen,
  onClose,
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  language,
  onTriggerAlert
}) => {
  const [activeAlertType, setActiveAlertType] = useState<'108_SOS' | 'HIGH_RISK_REFERRAL' | 'PMSMA_CAMP' | 'IFA_NUTRITION' | 'CONSENT_REQUEST'>('108_SOS');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const alertOptions = [
    {
      id: '108_SOS',
      title: { 
        mr: '१०८ आपत्कालीन रुग्णवाहिका अलर्ट (108 SOS)', 
        hi: '108 आपातकालीन एम्बुलेंस अलर्ट (108 SOS)', 
        en: '108 Emergency Ambulance Alert' 
      },
      urgency: 'CRITICAL',
      badgeClass: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40',
      iconGradient: 'from-rose-500 to-red-600 shadow-rose-500/30',
      desc: {
        mr: 'तीव्र रक्तस्राव, झटके (Eclampsia) किंवा आपत्कालीन प्रसूतीसाठी १०८ रुग्णवाहिका व PHC डॉक्टरला तात्काळ अलर्ट.',
        hi: 'गंभीर रक्तस्राव, दौरे (Eclampsia) या प्रसव आपातकाल हेतु 108 एम्बुलेंस व डॉक्टर को तत्काल अलर्ट।',
        en: 'Dispatches emergency 108 ambulance & alerts Medical Officer with GPS location for critical maternal danger signs.'
      },
      icon: PhoneCall
    },
    {
      id: 'HIGH_RISK_REFERRAL',
      title: { 
        mr: 'उच्च जोखीम तज्ज्ञ संदर्भ अलर्ट (High-Risk Referral)', 
        hi: 'उच्च जोखिम विशेषज्ञ रेफरल अलर्ट (High-Risk)', 
        en: 'High-Risk Specialist Referral Alert' 
      },
      urgency: 'URGENT',
      badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40',
      iconGradient: 'from-amber-500 to-orange-600 shadow-amber-500/30',
      desc: {
        mr: 'Hb < ७.० किंवा BP >= १४०/९० आढळल्यास उप-जिल्हा रुग्णालय (FRU) तज्ज्ञ तपासणी व IV Iron साठी अलर्ट.',
        hi: 'Hb < 7.0 या BP >= 140/90 होने पर उप-जिला अस्पताल (FRU) विशेषज्ञ जांच व IV Iron हेतु अलर्ट।',
        en: 'Triggers priority specialist review at First Referral Unit (FRU) for severe anemia & pre-eclampsia.'
      },
      icon: AlertTriangle
    },
    {
      id: 'PMSMA_CAMP',
      title: { 
        mr: 'PMSMA ९ तारीख विशेष शिबिर अलर्ट (PMSMA Camp)', 
        hi: 'PMSMA 9 तारीख विशेष शिविर अलर्ट (PMSMA Camp)', 
        en: 'PMSMA 9th Monthly Camp Alert' 
      },
      urgency: 'SPECIALIST',
      badgeClass: 'bg-sky-100 dark:bg-sky-500/20 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40',
      iconGradient: 'from-sky-500 to-blue-600 shadow-sky-500/30',
      desc: {
        mr: 'दुसऱ्या व तिसऱ्या तिमाहीतील मातांना दर महिन्याच्या ९ तारखेला मोफत तज्ज्ञ तपासणी व सोनोग्राफीसाठी स्मरणपत्र.',
        hi: 'दूसरी व तीसरी तिमाही की गर्भवती को हर माह की 9 तारीख को मुफ्त विशेषज्ञ जांच व सोनोग्राफी स्मरणपत्र।',
        en: 'Invites 2nd & 3rd-trimester mothers for free monthly OB-GYN checkup & USG scan on the 9th of every month.'
      },
      icon: Calendar
    },
    {
      id: 'IFA_NUTRITION',
      title: { 
        mr: 'लोहयुक्त लाल गोळी (IFA) व पोषण आठवण', 
        hi: 'आयरन की लाल गोली (IFA) व पोषण स्मरण', 
        en: 'IFA & Calcium Adherence Alert' 
      },
      urgency: 'ROUTINE',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40',
      iconGradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
      desc: {
        mr: 'दररोज १ IFA लाल गोळी व १ कॅल्शियम गोळी घेण्याचे व्हॉट्सअॅप / SMS स्मरणपत्र मातेच्या भाषेत.',
        hi: 'रोजाना 1 आयरन व 1 कैल्शियम गोली लेने का व्हाट्सऐप / SMS रिमाइंडर।',
        en: 'Dispatches daily pill adherence nudges in Marathi/Hindi to prevent nutritional anemia.'
      },
      icon: Pill
    },
    {
      id: 'CONSENT_REQUEST',
      title: { 
        mr: 'DPDP 2023 डेटा ॲक्सेस संमती विनंती (Consent)', 
        hi: 'DPDP 2023 डेटा एक्सेस सहमति अनुरोध (Consent)', 
        en: 'DPDP 2023 Patient Consent Request' 
      },
      urgency: 'SECURITY',
      badgeClass: 'bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40',
      iconGradient: 'from-purple-500 to-indigo-600 shadow-purple-500/30',
      desc: {
        mr: 'दवाखान्यात डॉक्टरांनी QR कोड स्कॅन केल्यावर मातेच्या मोबाईलवर डिजिटल संमती परवानगी अलर्ट पाठवा.',
        hi: 'अस्पताल में डॉक्टर द्वारा QR कोड स्कैन करने पर मरीज के फोन पर डिजिटल सहमति अलर्ट भेजें।',
        en: 'Prompts patient with 1-tap "Grant Access" dialog when doctor scans QR / unique code in clinic.'
      },
      icon: ShieldCheck
    }
  ];

  const handleSend = () => {
    onTriggerAlert(activeAlertType, selectedBeneficiary);
    setSuccessToast(`Processing alert for ${selectedBeneficiary.name}. Check the status message for the result.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-white/20 text-slate-950 dark:text-white flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Pinned Window Header (Never Cut Off) */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white truncate">
                {language === 'mr' ? 'आपत्कालीन व क्लिनिकल अलर्ट केंद्र' : language === 'hi' ? 'मातृ स्वास्थ्य अलर्ट केंद्र' : 'Maternal Health Alert Center'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                PS-06 Multi-Channel Alert & Referral Dispatcher (SMS, WhatsApp, Voice)
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer transition shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          {/* Recipient Mother Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-900 dark:text-slate-200 flex items-center justify-between">
              <span>{language === 'mr' ? 'लक्ष्य लाभार्थी माता निवडा:' : 'Select Target Beneficiary:'}</span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">Verified RCH Registry</span>
            </label>
            <div className="relative">
              <select
                value={selectedBeneficiary.id}
                onChange={e => {
                  const found = beneficiaries.find(b => b.id === e.target.value);
                  if (found) onSelectBeneficiary(found);
                }}
                className="w-full appearance-none border border-slate-300 dark:border-white/20 rounded-2xl p-3 pr-10 text-xs font-bold text-slate-950 dark:text-white bg-slate-50 dark:bg-slate-950/80 shadow-xs focus:border-rose-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition cursor-pointer"
              >
                {beneficiaries.map(b => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold">
                    {b.name} ({b.currentRiskTier} Risk) • {b.phone} • RCH: {b.rchId}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Alert Type Cards */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-900 dark:text-slate-200 block">
              {language === 'mr' ? 'अलर्टचा प्रकार निवडा:' : 'Select Alert Action:'}
            </label>
            
            <div className="grid grid-cols-1 gap-2.5">
              {alertOptions.map(opt => {
                const isSelected = opt.id === activeAlertType;
                const Icon = opt.icon;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setActiveAlertType(opt.id as any)}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
                      isSelected
                        ? 'border-2 border-rose-500 bg-rose-50/80 dark:bg-rose-950/30 shadow-md ring-2 ring-rose-500/30'
                        : 'border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {/* Squircle Icon */}
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${opt.iconGradient} text-white flex items-center justify-center shrink-0 shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-950 dark:text-white truncate">
                          {opt.title[language] || opt.title.en}
                        </h4>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase ${opt.badgeClass}`}>
                          {opt.urgency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug font-medium line-clamp-2">
                        {opt.desc[language] || opt.desc.en}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {successToast && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-500/40 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-black animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}
        </div>

        {/* Pinned Action Footer (Always Visible at Bottom) */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-950 dark:text-white font-black py-2.5 sm:py-3 rounded-2xl text-xs cursor-pointer border border-slate-300 dark:border-white/15 transition shadow-xs"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSend}
            className="flex-2 bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black py-2.5 sm:py-3 rounded-2xl shadow-xl shadow-rose-600/30 transition-all cursor-pointer text-xs flex items-center justify-center gap-2 border border-white/20 active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'mr' ? 'अलर्ट त्वरित पाठवा' : language === 'hi' ? 'अलर्ट तुरंत भेजें' : 'Dispatch Alert Now'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
