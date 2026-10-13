import React from 'react';
import { Language, UserRole } from '../types';
import { 
  Heart, 
  Activity, 
  ShieldCheck, 
  Users, 
  Calendar, 
  Sparkles, 
  Compass, 
  Play, 
  Radio, 
  Globe, 
  AlertTriangle,
  ArrowUpRight,
  Fish,
  Zap
} from 'lucide-react';

interface HeroOverviewSectionProps {
  language: Language;
  onNavigateTab: (tab: string) => void;
  activeRole: UserRole;
  totalMothers: number;
}

export const HeroOverviewSection: React.FC<HeroOverviewSectionProps> = ({
  language,
  onNavigateTab,
  activeRole,
  totalMothers
}) => {
  const content = {
    badge: {
      mr: '((•)) Real-Time Maternal High-Risk Prediction & Care System',
      hi: '((•)) Real-Time Maternal High-Risk Prediction & Care System',
      en: '((•)) Real-Time Maternal High-Risk Prediction & Care System'
    },
    heading: {
      mr: 'Maternal Care & High-Risk Pregnancy Platform',
      hi: 'Maternal Care & High-Risk Pregnancy Platform',
      en: 'Maternal Care & High-Risk Pregnancy Platform'
    },
    headingDevanagari: {
      mr: 'माता व बाल आरोग्य संरक्षण व्यासपीठ',
      hi: 'मातृ एवं शिशु स्वास्थ्य सुरक्षा मंच',
      en: 'Maternal Care & High-Risk Pregnancy Platform'
    },
    subheading: {
      mr: 'Integrating ASHA field workers, WHO 8-contact ANC timeline, AI clinical risk prediction, and 108 emergency triage into a unified maternal health system.',
      hi: 'आशा कार्यकर्ताओं, WHO 8-जांच अनुसूची, AI क्लिनिकल जोखिम भविष्यवाणी और 108 आपातकालीन सेवा को एक सुरक्षित मंच में जोड़ना।',
      en: 'Integrating ASHA field workers, WHO 8-contact ANC timeline, AI clinical risk prediction, and 108 emergency triage into a unified maternal health system.'
    },
    btnExplore: {
      mr: 'Explore Maternal Registry',
      hi: 'Explore Maternal Registry',
      en: 'Explore Maternal Registry'
    },
    btnDeploy: {
      mr: 'Open ASHA Console',
      hi: 'Open ASHA Console',
      en: 'Open ASHA Console'
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Silky Glass Stage Container */}
      <section className="silky-glass rounded-3xl p-6 sm:p-10 lg:p-14 text-center space-y-7 relative overflow-hidden shadow-2xl">
        
        {/* Top Centered Status Pill (Exact match to reference) */}
        <div className="inline-flex items-center gap-2 bg-teal-500/10 text-teal-400 border border-teal-500/25 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm tracking-wide">
          <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>{content.badge[language]}</span>
        </div>

        {/* Big Silky Electric Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto silky-gradient-text">
          {content.heading[language]}
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm md:text-base text-slate-300 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          {content.subheading[language]}
        </p>

        {/* Dual Call-to-Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
          <button
            onClick={() => onNavigateTab('registry')}
            className="btn-silky-primary flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-black"
          >
            <Compass className="w-4 h-4 text-emerald-950" />
            <span>{content.btnExplore[language]}</span>
          </button>

          <button
            onClick={() => onNavigateTab('mobile_app')}
            className="btn-silky-secondary flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold"
          >
            <Play className="w-3.5 h-3.5 fill-current text-rose-400" />
            <span>{content.btnDeploy[language]}</span>
          </button>
        </div>

        {/* 4 High-Gloss KPI Metric Cards at the bottom of the stage */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-teal-500/15 text-left">
          {/* Metric 1 */}
          <div className="silky-card rounded-2xl p-4 sm:p-5 space-y-1.5">
            <div className="text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              420,000
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">
              Monitored Mothers (km²)
            </p>
          </div>

          {/* Metric 2 */}
          <div className="silky-card rounded-2xl p-4 sm:p-5 space-y-1.5">
            <div className="text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              1,420
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">
              Observed Active Cohort
            </p>
          </div>

          {/* Metric 3 */}
          <div className="silky-card rounded-2xl p-4 sm:p-5 space-y-1.5">
            <div className="text-rose-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              14
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">
              Threat / Emergency Interceptions
            </p>
          </div>

          {/* Metric 4 */}
          <div className="silky-card rounded-2xl p-4 sm:p-5 space-y-1.5">
            <div className="text-amber-400">
              <Radio className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              14
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">
              Active ASHA Swarm Units
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
