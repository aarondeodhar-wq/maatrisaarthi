import React, { useEffect, useState } from 'react';
import { Heart, ShieldCheck, Sparkles, Activity } from 'lucide-react';
import { Language } from '../types';

interface SplashScreenProps {
  onFinish: () => void;
  language: Language;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, language }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onFinish, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onFinish]);

  const titles = {
    appName: {
      mr: 'मातृसारथी (MaatriSaarthi)',
      hi: 'मातृसारथी (MaatriSaarthi)',
      en: 'MaatriSaarthi'
    },
    tagline: {
      mr: 'सुरक्षित मातृत्व — उच्च जोखीम गर्भधारणा ट्रॅकिंग व माता-बाल संरक्षण प्रणाली',
      hi: 'सुरक्षित मातृत्व — उच्च जोखिम गर्भावस्था ट्रैकिंग व मातृ-शिशु सुरक्षा प्रणाली',
      en: 'Safe Motherhood — High-Risk Pregnancy Tracking & Care Connectivity'
    },
    loadingText: {
      mr: 'प्रणाली सुरू होत आहे...',
      hi: 'प्रणाली शुरू हो रही है...',
      en: 'Initializing Safe Motherhood Platform...'
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-rose-700 via-rose-600 to-rose-900 flex flex-col items-center justify-center p-6 text-white z-50 font-sans selection:bg-white selection:text-rose-700">
      {/* Background Pulse Glows */}
      <div className="absolute w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute w-64 h-64 bg-amber-400/15 rounded-full blur-2xl -top-10 -right-10" />

      <div className="relative z-10 text-center space-y-6 max-w-sm w-full">
        {/* Animated Maternal Logo with Heartbeat */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-white/20 rounded-3xl animate-ping opacity-50" />
          <img 
            src="/logo.png" 
            alt="MaatriSaarthi Logo" 
            className="relative w-20 h-20 rounded-3xl shadow-2xl object-cover border-2 border-white/40 transform hover:scale-105 transition" 
          />
        </div>

        {/* Title and Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
            {titles.appName[language] || titles.appName.en}
          </h1>
          <p className="text-xs text-rose-100 font-medium leading-relaxed max-w-xs mx-auto opacity-95">
            {titles.tagline[language] || titles.tagline.en}
          </p>
        </div>

        {/* Compliance Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-[10px] font-bold bg-white/15 px-2.5 py-1 rounded-full border border-white/25 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-300" />
            DPDP Act 2023 Compliant
          </span>
          <span className="text-[10px] font-bold bg-white/15 px-2.5 py-1 rounded-full border border-white/25 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-300" />
            GoI / WHO Protocol
          </span>
        </div>

        {/* Progress Bar & Status */}
        <div className="space-y-2 pt-4">
          <div className="w-full bg-black/25 rounded-full h-2 overflow-hidden p-0.5 border border-white/20">
            <div
              className="bg-gradient-to-r from-amber-300 to-white h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-rose-200 font-mono">
            <span>{titles.loadingText[language] || titles.loadingText.en}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
