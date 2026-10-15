// Safe-range checks: plain if/else on each reading, using the same cut-offs as mlRiskEngine.ts.
// Hand-set from standard antenatal guidance. Not learned, not validated on patient data.

export type RangeStatus = 'SAFE' | 'WATCH' | 'DANGER' | 'NOT_MEASURED';

export interface RangeResult {
  status: RangeStatus;
  message: string;
}

const NOT_MEASURED: RangeResult = { status: 'NOT_MEASURED', message: 'Not measured' };

export function checkBloodPressure(sys?: number, dia?: number): RangeResult {
  if (!sys || !dia) return NOT_MEASURED;
  if (sys >= 140 || dia >= 90) return { status: 'DANGER', message: `${sys}/${dia} mmHg: high (pre-eclampsia risk)` };
  if (sys >= 130 || dia >= 85) return { status: 'WATCH', message: `${sys}/${dia} mmHg: raised, recheck` };
  return { status: 'SAFE', message: `${sys}/${dia} mmHg: in safe range` };
}

export function checkSpO2(spO2?: number): RangeResult {
  if (!spO2) return NOT_MEASURED;
  if (spO2 < 90) return { status: 'DANGER', message: `${spO2}%: severe low oxygen` };
  if (spO2 < 94) return { status: 'WATCH', message: `${spO2}%: low, recheck` };
  return { status: 'SAFE', message: `${spO2}%: in safe range` };
}

export function checkHemoglobin(hb?: number): RangeResult {
  if (!hb) return NOT_MEASURED;
  if (hb < 7) return { status: 'DANGER', message: `${hb} g/dL: severe anaemia` };
  if (hb < 11) return { status: 'WATCH', message: `${hb} g/dL: anaemia` };
  return { status: 'SAFE', message: `${hb} g/dL: in safe range` };
}

export function checkBloodSugar(mgdl?: number): RangeResult {
  if (!mgdl) return NOT_MEASURED;
  if (mgdl >= 200) return { status: 'DANGER', message: `${mgdl} mg/dL: very high` };
  if (mgdl >= 140) return { status: 'WATCH', message: `${mgdl} mg/dL: high, needs OGTT` };
  return { status: 'SAFE', message: `${mgdl} mg/dL: in safe range` };
}

export function checkTemperature(f?: number): RangeResult {
  if (!f) return NOT_MEASURED;
  if (f >= 100.4) return { status: 'WATCH', message: `${f} °F: fever, check for infection` };
  return { status: 'SAFE', message: `${f} °F: in safe range` };
}

export function checkPulse(bpm?: number): RangeResult {
  if (!bpm) return NOT_MEASURED;
  if (bpm > 120 || bpm < 50) return { status: 'WATCH', message: `${bpm} bpm: outside 50-120` };
  return { status: 'SAFE', message: `${bpm} bpm: in safe range` };
}

export function checkWeight(kg?: number): RangeResult {
  if (!kg) return NOT_MEASURED;
  if (kg < 45) return { status: 'WATCH', message: `${kg} kg: underweight` };
  return { status: 'SAFE', message: `${kg} kg: in safe range` };
}

export function checkUrineProtein(u?: string): RangeResult {
  if (!u) return NOT_MEASURED;
  if (u === '2+' || u === '3+') return { status: 'DANGER', message: `${u}: significant protein` };
  if (u === '1+') return { status: 'WATCH', message: `${u}: protein, recheck` };
  return { status: 'SAFE', message: `${u}: in safe range` };
}
