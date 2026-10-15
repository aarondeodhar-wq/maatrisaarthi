import React from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  RangeStatus,
  checkBloodPressure,
  checkSpO2,
  checkHemoglobin,
  checkBloodSugar,
  checkTemperature,
  checkPulse,
  checkWeight,
  checkUrineProtein
} from '../core/vitalRanges';

interface Props {
  systolicBP: number;
  diastolicBP: number;
  hemoglobin: number;
  bloodSugar: number;
  weightKg: number;
  spO2: string;
  bodyTemp: string;
  heartRate: string;
  urine: string;
}

const STYLE: Record<RangeStatus, string> = {
  SAFE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  WATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  DANGER: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  NOT_MEASURED: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
};

// Shows each reading against its safe range, using plain if/else rules (vitalRanges.ts).
// A blank input is shown as NOT MEASURED, never as safe.
export const VitalsSafetyPanel: React.FC<Props> = (p) => {
  const rows = [
    { name: 'Blood pressure', r: checkBloodPressure(p.systolicBP, p.diastolicBP) },
    { name: 'SpO2', r: checkSpO2(p.spO2.trim() ? Number(p.spO2) : undefined) },
    { name: 'Haemoglobin', r: checkHemoglobin(p.hemoglobin) },
    { name: 'Blood sugar', r: checkBloodSugar(p.bloodSugar) },
    { name: 'Temperature', r: checkTemperature(p.bodyTemp.trim() ? Number(p.bodyTemp) : undefined) },
    { name: 'Pulse', r: checkPulse(p.heartRate.trim() ? Number(p.heartRate) : undefined) },
    { name: 'Weight', r: checkWeight(p.weightKg) },
    { name: 'Urine protein', r: checkUrineProtein(p.urine || undefined) }
  ];

  return (
    <div className="reference-sub-card p-4 space-y-2">
      <p className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-teal-500" /> Safe-range check
      </p>
      <ul className="space-y-1.5">
        {rows.map(({ name, r }) => (
          <li key={name} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-slate-800 dark:text-slate-200">{name}</span>
            <span className={`px-2 py-0.5 rounded-full font-black ${STYLE[r.status]}`}>{r.status.replace('_', ' ')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
