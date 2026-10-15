import React, { useEffect, useState } from 'react';
import { ShieldAlert, Baby, HeartPulse, AlertTriangle, Info, CheckCircle2, Sparkles, Activity } from 'lucide-react';
import { Beneficiary, Language } from '../types';
import { writeAccessUntil } from '../core/accessWindow';
import {
  PregnancyProfile,
  PRE_EXISTING_CONDITIONS,
  CONCEPTION_EVENTS,
  PRIOR_COMPLICATIONS,
  FactorDef,
  evaluatePregnancyFactors
} from '../core/pregnancyRisk';

const EMPTY: PregnancyProfile = {
  fetusCount: 1,
  presentation: 'UNKNOWN',
  growth: 'UNKNOWN',
  conditions: [],
  conceptionEvents: [],
  priorComplications: []
};

interface Props {
  beneficiary: Beneficiary;
  requiresWindow: boolean; // true for ASHA workers: edits need an open 15-minute window
  language?: Language;
  onChange: (profile: PregnancyProfile) => void;
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

const STI_IDS = ['hiv', 'syphilis', 'hep_b', 'hep_c', 'sti_gc_ct', 'hsv_genital'];

const CheckGroup: React.FC<{
  title: string;
  badge?: string;
  defs: FactorDef[];
  selected: string[];
  disabled: boolean;
  onToggle: (id: string) => void;
}> = ({ title, badge, defs, selected, disabled, onToggle }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">{title}</p>
      {badge && (
        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-400/30">
          {badge}
        </span>
      )}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {defs.map(d => {
        const isChecked = selected.includes(d.id);
        const isSti = STI_IDS.includes(d.id);
        return (
          <label
            key={d.id}
            className={`flex items-start gap-2.5 rounded-2xl border p-2.5 text-xs transition cursor-pointer select-none ${
              isChecked
                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-500 text-rose-950 dark:text-rose-100 shadow-xs'
                : 'bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={isChecked}
              onChange={() => onToggle(d.id)}
              className="mt-1 accent-rose-600 rounded shrink-0 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black">{d.label}</span>
                {isSti && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                    STI
                  </span>
                )}
                {isChecked && (
                  <span className="text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400">
                    +{Math.round(d.points * 100)} pts
                  </span>
                )}
              </div>
              <span className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                👶 <strong>Baby effect:</strong> {d.babyEffect}
              </span>
            </div>
          </label>
        );
      })}
    </div>
  </div>
);

const SelectField: React.FC<{
  label: string;
  sublabel?: string;
  value: string;
  disabled: boolean;
  options: [string, string][];
  onChange: (v: string) => void;
}> = ({ label, sublabel, value, disabled, options, onChange }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-black text-slate-800 dark:text-slate-200 block">
      {label}
      {sublabel && <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">{sublabel}</span>}
    </label>
    <select
      disabled={disabled}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-bold disabled:opacity-60 transition"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  </div>
);

export const PregnancyProfileCard: React.FC<Props> = ({ beneficiary, requiresWindow, language = 'en', onChange }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const canEdit = !requiresWindow || writeAccessUntil(beneficiary.id, now) !== null;

  const profile: PregnancyProfile = { ...EMPTY, ...(beneficiary.pregnancy || {}) };
  const set = (patch: Partial<PregnancyProfile>) => onChange({ ...profile, ...patch });
  const weeks = beneficiary.currentGestationalWeeks;

  const evaluation = evaluatePregnancyFactors({ gestationalWeeks: weeks, pregnancy: profile });
  const pLevel = evaluation.pretermRisk.level;
  const levelBadgeClass =
    pLevel === 'HIGH'
      ? 'bg-rose-600 text-white shadow-rose-600/30 shadow-md animate-pulse'
      : pLevel === 'MODERATE'
      ? 'bg-amber-500 text-slate-950 font-black'
      : 'bg-emerald-600 text-white';

  const t = {
    title: {
      mr: `गर्भधारणा व गर्भस्थिती जोखीम प्रोफाइल: ${beneficiary.name}`,
      hi: `गर्भावस्था एवं भ्रूण स्थिति जोखिम प्रोफाइल: ${beneficiary.name}`,
      en: `Pregnancy & Fetal Risk Profile: ${beneficiary.name}`
    },
    pretermDef: {
      mr: 'अकाली प्रसूती (Preterm Labor) म्हणजे गर्भधारणेचे ३७ पूर्ण आठवडे होण्यापूर्वी सुरू होणारी प्रसूती.',
      hi: 'समय से पहले प्रसव (Preterm Labor) का अर्थ है गर्भावस्था के 37 पूर्ण सप्ताह से पहले प्रसव शुरू होना।',
      en: 'Preterm labor means labor that starts before 37 completed weeks of pregnancy.'
    },
    pretermRiskDef: {
      mr: 'अकाली प्रसूतीचा धोका (Preterm-Labor Risk): असे घटक जे सूचित करतात की गर्भवती महिलेची प्रसूती वेळेपूर्वी होण्याची शक्यता जास्त आहे.',
      hi: 'प्रीटर्म लेबर जोखिम: वे कारक जो संकेत देते हैं कि गर्भवती महिला का प्रसव समय से पहले होने की अधिक संभावना है।',
      en: 'Preterm-labor risk means factors suggesting that a pregnant woman may have a higher chance of going into labor too early.'
    },
    readOnlyNotice: {
      mr: 'केवळ वाचन उपलब्ध. माहिती बदलण्यासाठी मातेचा QR कोड स्कॅन करा किंवा तिचा पिन टाका (१५ मिनिटांची विंडो).',
      hi: 'केवल पढ़ने के लिए उपलब्ध। विवरण बदलने के लिए माता का QR कोड स्कैन करें या पिन दर्ज करें।',
      en: 'Read-only mode. Scan the mother\'s QR pass or enter her 4-digit PIN to enable edits (15-min window).'
    }
  };

  // Group pre-existing conditions into STDs and Chronic conditions for better clinical clarity
  const stiConditions = PRE_EXISTING_CONDITIONS.filter(c => STI_IDS.includes(c.id));
  const chronicConditions = PRE_EXISTING_CONDITIONS.filter(c => !STI_IDS.includes(c.id));

  return (
    <div className="reference-hero-card p-6 sm:p-8 space-y-6 text-xs">
      {/* Header & Preterm-Labor Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/10 pb-4">
        <div>
          <div className="headline-tag-pill mb-1">
            <Sparkles className="w-3 h-3 text-pink-500" /> Obstetric & Preterm Assessment
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
            <Baby className="w-5 h-5 text-pink-500" />
            <span>{t.title[language] || t.title.en}</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            Multiple pregnancy, fetal presentation, abnormal growth, pre-existing diseases & preterm-labor risk evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-black ${levelBadgeClass}`}>
            Preterm Risk: {pLevel}
          </span>
          <span className="font-mono text-xs font-black bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-xl text-slate-700 dark:text-slate-300">
            {weeks} wks
          </span>
        </div>
      </div>

      {/* Read-only notification if editing window closed */}
      {!canEdit && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 rounded-2xl flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t.readOnlyNotice[language] || t.readOnlyNotice.en}</span>
        </div>
      )}

      {/* PRETERM-LABOR RISK CLINICAL DEFINITION & XAI ASSESSMENT CARD */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 rounded-2xl p-4 sm:p-5 border border-indigo-200 dark:border-indigo-500/30 space-y-3">
        <div className="flex items-center justify-between border-b border-indigo-200/70 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
              Preterm-Labor Risk Assessment & Explainable AI (XAI)
            </h4>
          </div>
          <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-white/10">
            &lt; 37 Weeks Threshold
          </span>
        </div>

        {/* Clinical Definitions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
          <div className="bg-white/85 dark:bg-black/30 p-2.5 rounded-xl border border-indigo-100 dark:border-white/5 space-y-1">
            <span className="font-black text-slate-900 dark:text-white flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-600" /> Preterm Labor Definition:
            </span>
            <p className="text-slate-700 dark:text-slate-300">{t.pretermDef[language] || t.pretermDef.en}</p>
          </div>
          <div className="bg-white/85 dark:bg-black/30 p-2.5 rounded-xl border border-indigo-100 dark:border-white/5 space-y-1">
            <span className="font-black text-slate-900 dark:text-white flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Preterm-Labor Risk Definition:
            </span>
            <p className="text-slate-700 dark:text-slate-300">{t.pretermRiskDef[language] || t.pretermRiskDef.en}</p>
          </div>
        </div>

        {/* Contributing Factors & Rationale */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] uppercase font-black tracking-wider text-indigo-950 dark:text-indigo-200 block">
            Contributing Preterm Factors Detected:
          </span>
          {evaluation.pretermRisk.reasons.length === 0 ? (
            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
              No preterm labor factors recorded. Regular routine ANC surveillance indicated.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {evaluation.pretermRisk.reasons.map((r, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40"
                >
                  ⚠️ {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1. OBSTETRIC PARAMETERS: MULTIPLE PREGNANCY, PRESENTATION, GROWTH */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-200/80 dark:border-white/10 pb-2">
          <Baby className="w-4 h-4 text-teal-600" />
          <span>Fetal Count, Placement & Growth</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SelectField
            label="Multiple Pregnancy (Fetus Count)"
            sublabel="Twins/triplets raise preterm risk"
            value={String(profile.fetusCount)}
            disabled={!canEdit}
            options={[
              ['1', 'Singleton (1 Baby)'],
              ['2', 'Twins (2 Babies - High Risk)'],
              ['3', 'Triplets or more (3+ Babies - Critical)']
            ]}
            onChange={v => set({ fetusCount: Number(v) as 1 | 2 | 3 })}
          />

          <SelectField
            label="Fetal Placement (Presentation)"
            sublabel="Checked at or after 36 weeks"
            value={profile.presentation}
            disabled={!canEdit}
            options={[
              ['UNKNOWN', 'Not Checked / Unknown'],
              ['CEPHALIC', 'Cephalic (Head Down - Normal)'],
              ['BREECH', 'Breech (Bottom Down)'],
              ['TRANSVERSE', 'Transverse (Lying Across)']
            ]}
            onChange={v => set({ presentation: v as PregnancyProfile['presentation'] })}
          />

          <SelectField
            label="Fetal Growth Status"
            sublabel="From fundal height / USG"
            value={profile.growth}
            disabled={!canEdit}
            options={[
              ['UNKNOWN', 'Not Checked / Unknown'],
              ['NORMAL', 'Normal Growth for Dates'],
              ['SMALL_FOR_DATES', 'Small for Dates (IUGR Risk)'],
              ['LARGE_FOR_DATES', 'Large for Dates (Macrosomia)']
            ]}
            onChange={v => set({ growth: v as PregnancyProfile['growth'] })}
          />
        </div>

        {weeks >= 36 && (profile.presentation === 'BREECH' || profile.presentation === 'TRANSVERSE') && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-[11px] font-bold text-rose-900 dark:text-rose-200">
            ⚠️ Abnormal fetal placement at {weeks} weeks: Urgent obstetric referral for planned institutional delivery.
          </div>
        )}
      </div>

      {/* 2. PRE-EXISTING DISEASES (STDs & REPRODUCTIVE INFECTIONS) */}
      <CheckGroup
        title="1. Pre-Existing STDs & Reproductive Tract Infections (Affects Baby)"
        badge="STIs / Vertical Transmission"
        defs={stiConditions}
        selected={profile.conditions}
        disabled={!canEdit}
        onToggle={id => set({ conditions: toggle(profile.conditions, id) })}
      />

      {/* 3. PRE-EXISTING CHRONIC & SYSTEMIC DISEASES */}
      <CheckGroup
        title="2. Chronic Medical Conditions Before Pregnancy"
        badge="Maternal-Fetal Systemic Risks"
        defs={chronicConditions}
        selected={profile.conditions}
        disabled={!canEdit}
        onToggle={id => set({ conditions: toggle(profile.conditions, id) })}
      />

      {/* 4. COMPLICATIONS AT CONCEPTION */}
      <CheckGroup
        title="3. Complications Around Conception & Early Gestation"
        defs={CONCEPTION_EVENTS}
        selected={profile.conceptionEvents}
        disabled={!canEdit}
        onToggle={id => set({ conceptionEvents: toggle(profile.conceptionEvents, id) })}
      />

      {/* 5. PAST PREGNANCY COMPLICATIONS */}
      <CheckGroup
        title="4. Past Pregnancy Complications (Obstetric History)"
        defs={PRIOR_COMPLICATIONS}
        selected={profile.priorComplications}
        disabled={!canEdit}
        onToggle={id => set({ priorComplications: toggle(profile.priorComplications, id) })}
      />

      {/* 6. EXPLAINABLE AI (XAI) FACTOR IMPACT TABLE */}
      <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-teal-500" />
            <span>AI Risk Weight & Explainable Impact Trace</span>
          </p>
          <span className="text-[10px] text-slate-500 font-bold">
            Total Points Added: +{Math.round(evaluation.points * 100)}
          </span>
        </div>

        {evaluation.explainability.length === 0 ? (
          <p className="text-[11px] font-bold text-slate-500 italic p-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            No pregnancy risk factors active. Standard protocol ANC schedule maintained.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {evaluation.explainability.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-white/10 p-2.5 bg-slate-50 dark:bg-white/5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white">{e.feature}</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {e.value}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {e.reason[language] || e.reason.en}
                  </p>
                </div>
                <span
                  className={`text-xs font-black shrink-0 px-2.5 py-1 rounded-lg ${
                    e.contribution === 'HIGH_RISK'
                      ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                      : e.contribution === 'MODERATE_RISK'
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {e.contribution === 'NORMAL' ? 'Normal' : `+${Math.round(e.impactScore)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
