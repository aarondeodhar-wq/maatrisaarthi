// AuthLoadingScreen: Ultra-Premium Post-Authentication Loading & Role-Provisioning Transition
// Styled with Day Mode iOS/macOS Clinical Aesthetics (Soft Ice-Aqua, Porcelain Glass, High-Contrast Typography)

import React, { useEffect, useState } from 'react';
import { UserRole, Language } from '../types';
import { ShieldCheck, CheckCircle2, Stethoscope, Smartphone, Heart, Building2, Sparkles, Activity } from 'lucide-react';

interface AuthLoadingScreenProps {
  role: UserRole;
  userName: string;
  language: Language;
  onFinished: () => void;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  role,
  userName,
  language,
  onFinished
}) => {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStep(2);
      setProgress(65);
    }, 400);

    const t2 = setTimeout(() => {
      setStep(3);
      setProgress(92);
    }, 850);

    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(onFinished, 300);
    }, 1300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinished]);

  const roleDetails = {
    ASHA_WORKER: {
      title: { mr: 'आशा फिल्ड कन्सोल', hi: 'आशा फील्ड कंसोल', en: 'ASHA Field Workstation' },
      icon: Smartphone,
      gradient: 'from-[#00b4d8] to-[#0077b6]',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200'
    },
    PHC_DOCTOR: {
      title: { mr: 'वैद्यकीय अधिकारी ओपीडी', hi: 'चिकित्सा अधिकारी पोर्टल', en: 'Doctor Clinical OPD Portal' },
      icon: Stethoscope,
      gradient: 'from-blue-500 to-indigo-600',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200'
    },
    MOTHER: {
      title: { mr: 'माता डिजिटल पास (MCP Pass)', hi: 'माता डिजिटल पास (MCP Pass)', en: 'Maternal Digital Pass' },
      icon: Heart,
      gradient: 'from-pink-500 to-rose-600',
      badgeColor: 'bg-pink-50 text-pink-800 border-pink-200'
    },
    WARD_OFFICER: {
      title: { mr: 'प्रभाग MCH डॅशबोर्ड', hi: 'वार्ड MCH डैशबोर्ड', en: 'Ward Health Analytics' },
      icon: Building2,
      gradient: 'from-amber-500 to-orange-600',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200'
    }
  };

  const currentRole = roleDetails[role] || roleDetails.ASHA_WORKER;
  const RoleIcon = currentRole.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-2xl font-sans animate-fadeIn">
      {/* Ambient Aurora Glowing Orbs */}
      <div className="absolute w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[350px] h-[350px] bg-teal-400/20 rounded-full blur-3xl -bottom-10 -left-10 pointer-events-none" />

      {/* Main Glassmorphic Porcelain Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-[0_25px_70px_-15px_rgba(0,180,216,0.22)] border border-slate-100 dark:border-white/15 text-slate-900 dark:text-white space-y-6 text-center overflow-hidden">
        
        {/* macOS Traffic Dots Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-xs" />
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-xs" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs" />
          </div>
          <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            256-Bit Encrypted Session
          </span>
        </div>

        {/* Official MaatriSaarthi Logo with Animated Halo & Role Badge */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-cyan-400/25 dark:bg-cyan-500/30 rounded-3xl animate-ping opacity-60" />
          
          <img 
            src="/logo.png" 
            alt="MaatriSaarthi Logo" 
            className="relative w-20 h-20 rounded-3xl shadow-xl object-cover border-2 border-white dark:border-white/20 transform scale-105" 
          />
          
          {/* Attached Role Sub-Badge */}
          <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-gradient-to-br ${currentRole.gradient} text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900`}>
            <RoleIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Welcome Text & Role Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#e0f7fa] dark:bg-teal-500/20 text-[#00695c] dark:text-teal-300 border border-[#80deea] dark:border-teal-500/40 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>((•)) Identity Verified</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {language === 'mr' ? 'स्वागत आहे' : language === 'hi' ? 'स्वागत है' : 'Welcome'}, {userName}
          </h2>
          
          <p className="text-xs font-bold text-teal-700 dark:text-teal-400">
            {currentRole.title[language] || currentRole.title.en}
          </p>
        </div>

        {/* Dynamic Provisioning Sequence (Fresh Apple/macOS Ice-Mint Tone) */}
        <div className="bg-gradient-to-b from-[#f0fdfa] to-[#e6fbf9] dark:from-slate-950/80 dark:to-slate-950/90 p-4 sm:p-5 rounded-2xl border border-teal-200/80 dark:border-teal-500/30 text-left space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-300 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>DPDP Act 2023 Consent Confirmed</span>
          </div>

          <div className={`flex items-center gap-2.5 font-bold text-xs transition-all duration-300 ${
            step >= 2 
              ? 'text-teal-900 dark:text-teal-300 opacity-100' 
              : 'text-slate-400 dark:text-slate-500 opacity-60'
          }`}>
            {step >= 2 ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-teal-500 border-t-transparent shrink-0 inline-block animate-spin" />
            )}
            <span>Loading Cohorts & Clinical ML Engine...</span>
          </div>

          <div className={`flex items-center gap-2.5 font-bold text-xs transition-all duration-300 ${
            step >= 3 
              ? 'text-emerald-900 dark:text-emerald-300 opacity-100' 
              : 'text-slate-400 dark:text-slate-500 opacity-60'
          }`}>
            {step >= 3 ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-white/30 border-t-transparent shrink-0 inline-block animate-spin" />
            )}
            <span>Preparing Safe Motherhood Workstation...</span>
          </div>
        </div>

        {/* Progress Bar & Status */}
        <div className="space-y-2 pt-1">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200 dark:border-white/10 shadow-inner">
            <div
              className="bg-gradient-to-r from-[#00d2ff] to-[#00e676] h-full rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>Synchronizing offline local storage...</span>
            <span className="text-teal-700 dark:text-teal-300 font-bold font-mono">{progress}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};
