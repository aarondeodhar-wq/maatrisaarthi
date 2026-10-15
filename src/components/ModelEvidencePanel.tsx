import React, { useMemo, useState } from 'react';
import { Brain, Award, ShieldCheck, Info, ChevronRight, BarChart2 } from 'lucide-react';
import modelJson from '../core/riskModel.json';
import { predictMaternalRisk } from '../core/mlRiskEngine';
import { ExplainableAiPanel } from './ExplainableAiPanel';

interface Metrics {
  tp: number;
  fn: number;
  fp: number;
  tn: number;
  accuracy: number;
  sensitivity: number;
  specificity: number;
  precision?: number;
}

const model = modelJson as unknown as {
  trained: boolean;
  trainedOn?: string;
  type?: string;
  threshold?: number;
  benchmarkPaper?: string;
  hyperparameters?: { nEstimators?: number; maxDepth?: number };
  rows?: { train: number; test: number; total?: number };
  cvMetrics?: { k: number; meanAccuracy: number; stdAccuracy: number; displayRange: string; folds?: number[] };
  testMetrics?: Metrics;
  auditMetrics?: { description: string; uniqueRecords: number; cvRange: string; testAccuracy: string };
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const NA = '—';

// Every number on this panel is read from src/core/riskModel.json, which
// scripts/train-risk-model.mjs writes. Nothing is typed in by hand.
export const ModelEvidencePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BENCHMARK' | 'AUDIT'>('BENCHMARK');
  // Live tester inputs: blank = not measured (the forest only runs with BP, sugar, temp and pulse)
  const [age, setAge] = useState('28');
  const [sys, setSys] = useState('118');
  const [dia, setDia] = useState('76');
  const [sugar, setSugar] = useState('95');
  const [hb, setHb] = useState('');
  const [temp, setTemp] = useState('98.6');
  const [hr, setHr] = useState('76');

  const n = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const result = useMemo(
    () => predictMaternalRisk({
      age: n(age) ?? 0,
      systolicBP: n(sys) ?? 0,
      diastolicBP: n(dia) ?? 0,
      bloodSugar: n(sugar) ?? 0,
      hemoglobin: n(hb) ?? 0,
      bodyTempF: n(temp),
      heartRate: n(hr)
    }),
    [age, sys, dia, sugar, hb, temp, hr]
  );

  const m = model.testMetrics;
  const cv = model.cvMetrics;
  const audit = model.auditMetrics;
  const field = (v: string, set: (s: string) => void, label: string, step = 1) => (
    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">
      {label}
      <input
        type="number"
        step={step}
        value={v}
        placeholder="—"
        onChange={e => set(e.target.value)}
        className="mt-1 w-full border border-slate-300 dark:border-white/20 rounded-lg p-2 text-sm font-bold bg-white dark:bg-black/40 text-slate-900 dark:text-white"
      />
    </label>
  );
  const stat = (value: string, label: string, color: string) => (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 bg-white/50 dark:bg-white/5">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className="silky-glass p-5 sm:p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Maternal Risk Model: Evidence</span>
        </h4>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab('BENCHMARK')}
            className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'BENCHMARK' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Benchmark{cv ? ` (${pct(cv.meanAccuracy)})` : ''}</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'AUDIT' ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Deduplicated audit{audit ? ` (${audit.cvRange.split(' ')[0]})` : ''}</span>
          </button>
        </div>
      </div>

      {activeTab === 'BENCHMARK' ? (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 text-[11px] text-teal-900 dark:text-teal-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                {cv ? `${cv.k}-fold cross-validation: ${cv.displayRange}` : 'No cross-validation result in the model file.'}
              </p>
              <p className="text-[10px] text-teal-800 dark:text-teal-300">
                Random forest ({model.hyperparameters?.nEstimators ?? NA} trees) on the {model.rows?.total?.toLocaleString() ?? NA}-row UCI Maternal Health
                Risk dataset, the protocol used in published papers{model.benchmarkPaper ? ` (${model.benchmarkPaper.split('(')[0].trim()})` : ''}.
                That dataset repeats many identical rows, so copies of a reading can sit in both the training and test folds.
                This makes the benchmark score higher than accuracy on new mothers. The deduplicated audit tab shows that harder test.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {stat(cv ? pct(cv.meanAccuracy) : NA, `${cv?.k ?? ''}-fold CV mean`, 'text-teal-600 dark:text-teal-400')}
            {stat(m ? pct(m.accuracy) : NA, `Holdout (${model.rows?.test ?? NA} rows)`, 'text-emerald-600 dark:text-emerald-400')}
            {stat(m ? pct(m.sensitivity) : NA, 'High-risk sensitivity', 'text-rose-600 dark:text-rose-400')}
            {stat(m ? pct(m.specificity) : NA, 'Specificity', 'text-indigo-600 dark:text-indigo-400')}
          </div>

          {m && (
            <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
              Holdout confusion matrix: TP {m.tp} • FN {m.fn} • FP {m.fp} • TN {m.tn}
            </div>
          )}

          {cv?.folds && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-black/20">
              <div className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Per-fold accuracy</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center text-[10px] font-bold">
                {cv.folds.map((f, i) => (
                  <div key={i} className="p-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10">
                    <div className="text-[9px] text-slate-400">F{i + 1}</div>
                    <div className="text-teal-700 dark:text-teal-300 font-black">{(f * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200">
            <p className="font-bold">Deduplicated audit: every reading appears once</p>
            <p className="text-[10px] text-amber-800 dark:text-amber-300 mt-0.5">
              Both datasets merged, exact duplicates removed, then split so no reading is in both train and test.
              This is the better estimate of accuracy on mothers the model has not seen.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            {stat(audit ? audit.uniqueRecords.toLocaleString() : NA, 'Unique records', 'text-amber-600 dark:text-amber-400')}
            {stat(audit?.cvRange ?? NA, 'Deduplicated 5-fold CV', 'text-slate-800 dark:text-slate-200')}
            {stat(audit?.testAccuracy ?? NA, 'Deduplicated holdout', 'text-slate-800 dark:text-slate-200')}
          </div>
        </div>
      )}

      {/* Interactive tester: the full engine (rules + forest) with an explainable result */}
      <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-teal-600" />
          <span>Try the model (blank = not measured)</span>
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
          {field(age, setAge, 'Age')}
          {field(sys, setSys, 'Systolic')}
          {field(dia, setDia, 'Diastolic')}
          {field(sugar, setSugar, 'Sugar mg/dL')}
          {field(hb, setHb, 'Hb g/dL', 0.1)}
          {field(temp, setTemp, 'Temp °F', 0.1)}
          {field(hr, setHr, 'Pulse bpm')}
        </div>
        <ExplainableAiPanel result={result} language="en" title="Explainable result" />
      </div>
    </div>
  );
};
