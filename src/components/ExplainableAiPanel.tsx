import React, { useEffect, useState } from 'react';
import { Brain, Volume2, Square, GitBranch, AlertTriangle, CheckCircle2, CircleDashed } from 'lucide-react';
import { Language } from '../types';
import { MLPredictionResult } from '../core/mlRiskEngine';
import { speakTutorialAudio, stopTutorialAudio } from '../core/voiceTutorialService';

interface ExplainableAiPanelProps {
  result: MLPredictionResult;
  language: Language;
  title?: string;
  // Shown when the result is for the latest saved visit rather than the form being filled
  sourceNote?: string;
}

const MODEL_FEATURE = 'Trained ML Model';

const L = {
  why: { mr: 'हा निकाल का आला?', hi: 'यह परिणाम क्यों?', en: 'Why this result' },
  safe: { mr: 'सुरक्षित मर्यादेत', hi: 'सुरक्षित सीमा में', en: 'in safe range' },
  model: { mr: 'प्रशिक्षित मॉडेल (Random Forest)', hi: 'प्रशिक्षित मॉडल (Random Forest)', en: 'Trained model (random forest)' },
  treesVote: { mr: 'झाडे उच्च धोका म्हणतात', hi: 'पेड़ उच्च जोखिम बताते हैं', en: 'trees vote high risk' },
  path: { mr: 'निर्णय मार्ग', hi: 'निर्णय पथ', en: 'Decision path' },
  notMeasured: { mr: 'मोजले नाही', hi: 'नहीं मापा गया', en: 'Not measured' },
  notMeasuredNote: {
    mr: 'हे निकालात धरले नाही. मोजल्यास निकाल बदलू शकतो.',
    hi: 'ये परिणाम में शामिल नहीं हैं। मापने पर परिणाम बदल सकता है।',
    en: 'These are not in the result. Measuring them can change it.'
  },
  listen: { mr: 'ऐका', hi: 'सुनें', en: 'Listen' },
  stop: { mr: 'थांबा', hi: 'रोकें', en: 'Stop' },
  preterm: { mr: 'अकाली प्रसूती धोका', hi: 'समय-पूर्व प्रसव जोखिम', en: 'Preterm labour risk' },
  disclaimer: {
    mr: 'निर्णय-सहाय्य फक्त. अंतिम निर्णय डॉक्टर / ANM घेतील.',
    hi: 'केवल निर्णय-सहायता। अंतिम निर्णय डॉक्टर / ANM का।',
    en: 'Decision support only. The doctor / ANM makes the final call.'
  }
};

const barColor = (c: string) =>
  c === 'HIGH_RISK' ? 'bg-rose-600' : c === 'MODERATE_RISK' ? 'bg-amber-500' : 'bg-emerald-500';

/**
 * Explainable-AI view of one risk result: which readings and history pushed the tier,
 * how strongly, what the trained model voted and the path it took, and what was not measured.
 */
export const ExplainableAiPanel: React.FC<ExplainableAiPanelProps> = ({ result, language, title, sourceNote }) => {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => stopTutorialAudio(), []);

  const factors = result.explainability
    .filter(e => !e.feature.startsWith(MODEL_FEATURE) && e.contribution !== 'NORMAL')
    .sort((a, b) => b.impactScore - a.impactScore);
  const normalCount = result.explainability.filter(e => !e.feature.startsWith(MODEL_FEATURE) && e.contribution === 'NORMAL').length;
  const m = result.model;

  const tierClass =
    result.riskTier === 'RED' ? 'bg-rose-600 text-white' : result.riskTier === 'YELLOW' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white';

  const handleListen = () => {
    if (speaking) {
      stopTutorialAudio();
      setSpeaking(false);
      return;
    }
    const lines = [
      result.triageBadge[language],
      ...factors.slice(0, 4).map(f => f.reason[language]),
      result.triageAction[language]
    ];
    speakTutorialAudio(lines.join('. '), language, () => setSpeaking(true), () => setSpeaking(false));
    setSpeaking(true);
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 sm:p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>{title || 'Explainable AI'}</span>
        </h4>
        <button
          type="button"
          onClick={handleListen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-500/40 bg-teal-500/15 text-teal-900 dark:text-teal-200 font-black cursor-pointer"
          aria-pressed={speaking}
        >
          {speaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{speaking ? L.stop[language] : L.listen[language]}</span>
        </button>
      </div>

      {sourceNote && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{sourceNote}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-3 py-1 rounded-full font-black ${tierClass}`}>{result.triageBadge[language]}</span>
        <span className="font-bold text-slate-700 dark:text-slate-300">
          Score {(result.riskProbability * 100).toFixed(0)}%
        </span>
      </div>
      <p className="font-bold text-slate-800 dark:text-slate-200">{result.triageAction[language]}</p>

      {/* Contributing factors, strongest first */}
      <div className="space-y-2">
        <div className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">{L.why[language]}</div>
        {factors.length === 0 && (
          <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>{language === 'en' ? 'No risk factor found in the measured readings.' : language === 'hi' ? 'मापी गई रीडिंग में कोई जोखिम नहीं मिला।' : 'मोजलेल्या नोंदींमध्ये धोका आढळला नाही.'}</span>
          </div>
        )}
        {factors.map((f, i) => (
          <div key={`${f.feature}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-slate-900 dark:text-white">{f.feature}</span>
              <span className="font-mono font-bold text-slate-600 dark:text-slate-300 text-right">{String(f.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden" title={`Impact ${f.impactScore}/100`}>
              <div className={`h-full rounded-full ${barColor(f.contribution)}`} style={{ width: `${Math.max(6, f.impactScore)}%` }} />
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300">{f.reason[language]}</p>
          </div>
        ))}
        {normalCount > 0 && (
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            ✓ {normalCount} {L.safe[language]}
          </div>
        )}
      </div>

      {/* What the trained model did */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 space-y-2 bg-slate-50 dark:bg-black/20">
        <div className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <GitBranch className="w-3.5 h-3.5" />
          <span>{L.model[language]}</span>
        </div>
        {m.used && m.probability !== undefined ? (
          <>
            <div className="relative h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full ${m.probability >= (m.threshold ?? 0.5) ? 'bg-rose-600' : 'bg-teal-600'}`}
                style={{ width: `${Math.round(m.probability * 100)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white"
                style={{ left: `${Math.round((m.threshold ?? 0.5) * 100)}%` }}
                title="Decision threshold"
              />
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {Math.round(m.probability * 100)}% • {m.treesHigh}/{m.treesTotal} {L.treesVote[language]} • threshold {Math.round((m.threshold ?? 0.5) * 100)}%
            </div>
            {m.path && m.path.length > 0 && (
              <div>
                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1">{L.path[language]}</div>
                <div className="flex flex-wrap items-center gap-1">
                  {m.path.map((step, i) => (
                    <React.Fragment key={i}>
                      <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200">
                        {step}
                      </span>
                      {i < m.path!.length - 1 && <span className="text-slate-400">›</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
            <CircleDashed className="w-4 h-4" />
            <span>{m.skippedReason}</span>
          </div>
        )}
      </div>

      {result.pretermRisk.level !== 'LOW' && (
        <div className="flex items-start gap-1.5 font-bold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{L.preterm[language]}: {result.pretermRisk.level}{result.pretermRisk.reasons.length ? ` (${result.pretermRisk.reasons.join(', ')})` : ''}</span>
        </div>
      )}

      {result.notMeasured.length > 0 && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mr-1 self-center">{L.notMeasured[language]}:</span>
            {result.notMeasured.map(n => (
              <span key={n} className="px-2 py-0.5 rounded-full border border-dashed border-slate-400 dark:border-white/30 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {n}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{L.notMeasuredNote[language]}</p>
        </div>
      )}

      <p className="text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/10 pt-2">{L.disclaimer[language]}</p>
    </div>
  );
};
