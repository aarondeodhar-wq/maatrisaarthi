// Supervisor report: turns raw visit_logs, vitals_logs and mother records into
// per-ASHA indicators. Pure functions, so the thresholds are easy to test and change.

import { Beneficiary, VisitLog } from '../types';
import { distanceMeters } from './visitLog';
import { toLocalDateString } from './protocolEngine';

// A scan further than this from the mother's registered home is flagged.
// Phone GPS in villages is often off by 50-100 m, so 300 m avoids false alarms.
export const FAR_VISIT_METERS = 300;

// A vitals entry needs a QR scan or PIN unlock by the same worker for the same mother
// in the 12 hours before it (or up to 10 minutes after, for clock drift).
const SCAN_BEFORE_MS = 12 * 60 * 60 * 1000;
const SCAN_AFTER_MS = 10 * 60 * 1000;

export const REPORT_DAYS = 7;

export interface VitalLogRow {
  id: string;
  beneficiaryId: string;
  recordedByUid?: string;
  recordedBy?: string;
  recordedAt?: string;
}

export interface AshaAccount {
  uid: string;
  name: string;
}

export interface FarVisit {
  visit: VisitLog;
  motherName: string;
  meters: number;
}

export interface UnmatchedEdit {
  vital: VitalLogRow;
  motherName: string;
}

export interface OverdueMother {
  beneficiaryId: string;
  motherName: string;
  contactNo: number;
  dueDate: string;
  daysLate: number;
}

export interface AshaRow {
  uid: string;
  name: string;
  assignedMothers: number;
  visitsToday: number;
  visitsPerDay: number[];            // oldest first, last entry is today
  scans: number;                     // QR scans + PIN unlocks in the window
  verifiedScans: number;             // scans where the mother's PIN was entered
  scansWithoutLocation: number;
  farVisits: FarVisit[];
  unmatchedEdits: UnmatchedEdit[];
  overdueMothers: OverdueMother[];
}

export interface SupervisionReport {
  days: string[];                    // YYYY-MM-DD, oldest first
  rows: AshaRow[];
}

const isScan = (v: VisitLog) => v.action === 'SCAN_QR' || v.action === 'PIN_UNLOCK';

function lastDays(n: number, now: Date): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(toLocalDateString(d));
  }
  return out;
}

export function buildSupervisionReport(
  ashas: AshaAccount[],
  visits: VisitLog[],
  vitals: VitalLogRow[],
  mothers: Beneficiary[],
  now: Date = new Date()
): SupervisionReport {
  const days = lastDays(REPORT_DAYS, now);
  const today = days[days.length - 1];
  const motherById = new Map(mothers.map(m => [m.id, m]));

  const rows: AshaRow[] = ashas.map(asha => {
    const myVisits = visits.filter(v => v.ashaUid === asha.uid);
    const myMothers = mothers.filter(m => m.assignedAshaUid === asha.uid);
    const myScans = myVisits.filter(isScan);
    const dayOf = (iso: string) => toLocalDateString(new Date(iso));

    const visitsPerDay = days.map(day => myVisits.filter(v => dayOf(v.clientAt) === day).length);

    const farVisits: FarVisit[] = [];
    for (const v of myScans) {
      const home = motherById.get(v.beneficiaryId)?.homeLocation;
      if (!v.geo || !home) continue;
      const meters = Math.round(distanceMeters(v.geo, home));
      if (meters > FAR_VISIT_METERS) {
        farVisits.push({ visit: v, motherName: motherById.get(v.beneficiaryId)?.name || v.beneficiaryId, meters });
      }
    }

    const unmatchedEdits: UnmatchedEdit[] = vitals
      .filter(vt => vt.recordedByUid === asha.uid && vt.recordedAt)
      .filter(vt => {
        const t = new Date(vt.recordedAt as string).getTime();
        return !myScans.some(s => {
          if (s.beneficiaryId !== vt.beneficiaryId) return false;
          const dt = t - new Date(s.clientAt).getTime();
          return dt >= -SCAN_AFTER_MS && dt <= SCAN_BEFORE_MS;
        });
      })
      .map(vt => ({ vital: vt, motherName: motherById.get(vt.beneficiaryId)?.name || vt.beneficiaryId }));

    const overdueMothers: OverdueMother[] = [];
    for (const m of myMothers) {
      const next = m.ancSchedule
        .filter(c => c.status !== 'COMPLETED' && c.dueDate && c.dueDate < today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (!next) continue;
      const daysLate = Math.round(
        (new Date(today).getTime() - new Date(next.dueDate).getTime()) / 86400000
      );
      overdueMothers.push({
        beneficiaryId: m.id,
        motherName: m.name,
        contactNo: next.contactNo,
        dueDate: next.dueDate,
        daysLate
      });
    }
    overdueMothers.sort((a, b) => b.daysLate - a.daysLate);

    return {
      uid: asha.uid,
      name: asha.name,
      assignedMothers: myMothers.length,
      visitsToday: visitsPerDay[visitsPerDay.length - 1],
      visitsPerDay,
      scans: myScans.length,
      verifiedScans: myScans.filter(v => v.verified).length,
      scansWithoutLocation: myScans.filter(v => !v.geo).length,
      farVisits,
      unmatchedEdits,
      overdueMothers
    };
  });

  return { days, rows };
}
