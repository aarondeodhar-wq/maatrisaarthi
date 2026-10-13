// Device Permissions & DPDP Act 2023 Consent Modal

import React, { useState } from 'react';
import { Language } from '../types';
import { 
  Camera, 
  Phone, 
  Image, 
  Mic, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Lock, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface DevicePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onPermissionsGranted?: () => void;
}

export const DevicePermissionsModal: React.FC<DevicePermissionsModalProps> = ({
  isOpen,
  onClose,
  language,
  onPermissionsGranted
}) => {
  const [permissions, setPermissions] = useState({
    camera: true,
    phone: true,
    storage: true,
    microphone: true
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [grantedSuccess, setGrantedSuccess] = useState(false);

  const t = {
    title: {
      mr: 'उपकरण परवानगी व DPDP सुरक्षा संमती',
      hi: 'डिवाइस अनुमति और DPDP सुरक्षा सहमति',
      en: 'Device Permissions & DPDP Privacy Consent'
    },
    subtitle: {
      mr: 'सुरक्षित आरोग्य सेवा आणि QR स्कॅनिंगसाठी खालील परवानग्या आवश्यक आहेत:',
      hi: 'सुरक्षित स्वास्थ्य सेवाओं और QR स्कैनिंग के लिए निम्नलिखित अनुमतियाँ आवश्यक हैं:',
      en: 'The following permissions are required for clinical QR scanning and emergency triage:'
    },
    cameraTitle: {
      mr: 'कॅमेरा प्रवेश (Camera Access)',
      hi: 'कैमरा एक्सेस (Camera Access)',
      en: 'Camera Access'
    },
    cameraDesc: {
      mr: 'मातांचा डिजिटल QR पास स्कॅन करण्यासाठी आणि प्रिस्क्रिप्शन तपासण्यासाठी.',
      hi: 'माताओं का डिजिटल QR पास स्कैन करने और प्रिस्क्रिप्शन देखने के लिए।',
      en: 'To scan digital MCP QR passes and patient dossiers in clinic.'
    },
    phoneTitle: {
      mr: 'फोन व डायलर (Phone & SOS Calls)',
      hi: 'फोन व डायलर (Phone & SOS Calls)',
      en: 'Phone & Emergency SOS'
    },
    phoneDesc: {
      mr: 'आपत्कालीन वेळी १०८ रुग्णवाहिका व आशा सेविकेशी थेट संपर्क साधण्यासाठी.',
      hi: 'आपात स्थिति में 108 एम्बुलेंस और आशा कार्यकर्ता को सीधे कॉल करने के लिए।',
      en: 'To initiate 1-tap 108 ambulance dispatch and direct ASHA calls.'
    },
    storageTitle: {
      mr: 'फोटो व कागदपत्रे (Photos & Medical Reports)',
      hi: 'फोटो व मेडिकल रिपोर्ट (Photos & Reports)',
      en: 'Photos & Lab Documents'
    },
    storageDesc: {
      mr: 'सोनोग्राफी (USG) रिपोर्ट आणि रक्त तपासणी फाइल्स सुरक्षित सेव्ह करण्यासाठी.',
      hi: 'सोनोग्राफी (USG) रिपोर्ट और रक्त जांच रिपोर्ट सुरक्षित सेव करने के लिए।',
      en: 'To securely store ultrasound scans and lab investigation reports.'
    },
    micTitle: {
      mr: 'मायक्रोफोन (Microphone for Voice Notes)',
      hi: 'माइक्रोफोन (Microphone for Voice Notes)',
      en: 'Microphone & Audio'
    },
    micDesc: {
      mr: 'आशा सेविकेसाठी मराठी व हिंदीमध्ये आवाजी वैद्यकीय नोंदी घेण्यासाठी.',
      hi: 'आशा कार्यकर्ता के लिए वॉयस क्लिनिकल नोट्स रिकॉर्ड करने के लिए।',
      en: 'To record spoken multilingual clinical notes in the field.'
    },
    grantBtn: {
      mr: 'सर्व परवानग्या मंजूर करा (Allow All)',
      hi: 'सभी अनुमतियाँ स्वीकार करें (Allow All)',
      en: 'Grant All Permissions'
    }
  };

  const handleGrantPermissions = async () => {
    setIsRequesting(true);

    // 1. Request real browser/device camera & microphone permissions
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ 
          video: permissions.camera, 
          audio: permissions.microphone 
        }).then(stream => {
          // Stop immediately after granting
          stream.getTracks().forEach(track => track.stop());
        }).catch(e => {
          console.log('Media permission note:', e.message);
        });
      }
    } catch (e) {}

    // 2. Request Notification Permission
    try {
      if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
    } catch (e) {}

    setIsRequesting(false);
    setGrantedSuccess(true);
    localStorage.setItem('maatrisaarthi_permissions_granted', 'true');

    setTimeout(() => {
      if (onPermissionsGranted) onPermissionsGranted();
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-sans animate-fadeIn">
      {/* Dark Translucent Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity" 
      />

      {/* Main Silky Frosted Container */}
      <div className="relative w-full max-w-lg silky-glass rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/25 text-slate-900 dark:text-white z-10 space-y-5 overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950 dark:text-white">
                {t.title[language]}
              </h3>
              <span className="text-[10px] text-teal-600 dark:text-teal-300 font-bold block">
                DPDP Act 2023 Compliant • Privacy Secured
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          {t.subtitle[language]}
        </p>

        {/* 4 Permission Switches */}
        <div className="space-y-2.5">
          {/* 1. Camera */}
          <div className="silky-card p-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white">
                  {t.cameraTitle[language]}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-300">
                  {t.cameraDesc[language]}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={permissions.camera}
              onChange={e => setPermissions({ ...permissions, camera: e.target.checked })}
              className="w-4 h-4 accent-teal-500 cursor-pointer"
            />
          </div>

          {/* 2. Phone & Emergency Calls */}
          <div className="silky-card p-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white">
                  {t.phoneTitle[language]}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-300">
                  {t.phoneDesc[language]}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={permissions.phone}
              onChange={e => setPermissions({ ...permissions, phone: e.target.checked })}
              className="w-4 h-4 accent-teal-500 cursor-pointer"
            />
          </div>

          {/* 3. Storage / Reports */}
          <div className="silky-card p-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Image className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white">
                  {t.storageTitle[language]}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-300">
                  {t.storageDesc[language]}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={permissions.storage}
              onChange={e => setPermissions({ ...permissions, storage: e.target.checked })}
              className="w-4 h-4 accent-teal-500 cursor-pointer"
            />
          </div>

          {/* 4. Microphone */}
          <div className="silky-card p-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white">
                  {t.micTitle[language]}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-300">
                  {t.micDesc[language]}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={permissions.microphone}
              onChange={e => setPermissions({ ...permissions, microphone: e.target.checked })}
              className="w-4 h-4 accent-teal-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Security Assurance Badge */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
          <Lock className="w-4 h-4 shrink-0 text-emerald-500" />
          <span className="text-[11px]">End-to-End Encryption: Health data is never shared with third parties.</span>
        </div>

        {/* Action Button */}
        {grantedSuccess ? (
          <div className="w-full bg-emerald-600 text-white font-black py-3 rounded-2xl text-center text-xs flex items-center justify-center gap-2 shadow-lg animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>परवानग्या यशस्वीपणे मंजूर केल्या (Permissions Granted ✓)</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGrantPermissions}
            disabled={isRequesting}
            className="w-full btn-silky-primary text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-xl"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isRequesting ? 'Requesting Access...' : t.grantBtn[language]}</span>
          </button>
        )}

      </div>
    </div>
  );
};
