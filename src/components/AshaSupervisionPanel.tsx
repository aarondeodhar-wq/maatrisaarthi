import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Beneficiary, VisitLog } from '../types';
import { auth, db } from '../core/firebaseAuth';
import {
  AshaAccount,
  AshaRow,
  FAR_VISIT_METERS,
  REPORT_DAYS,
  VitalLogRow,
  buildSupervisionReport
} from '../core/supervision';
import { ClipboardCheck, ChevronDown, MapPinOff, ShieldAlert, CalendarClock } from 'lucide-react';

interface AshaSupervisionPanelProps {
  beneficiaries: Beneficiary[];
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const AshaSupervisionPanel: React.FC<AshaSupervisionPanelProps> = ({ beneficiaries }) => {
  const [ashas, setAshas] = useState<AshaAccount[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [vitals, setVitals] = useState<VitalLogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openUid, setOpenUid] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setError('Live supervision data needs a real signed-in account (not the demo login).');
      return;
    }
    const since = new Date();
    since.setDate(since.getDate() - REPORT_DAYS);
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();
    const onErr = (err: Error) => setError(err.message);

    const unsubs = [
      onSnapshot(
        query(collection(db, 'user_accounts'), where('role', '==', 'ASHA_WORKER')),
        snap => setAshas(
          snap.docs
            .map(d => d.data() as { uid: string; name: string; approved?: boolean })
            .filter(a => a.approved)
            .map(a => ({ uid: a.uid, name: a.name }))
        ),
        onErr
      ),
      onSnapshot(
        query(collection(db, 'visit_logs'), where('clientAt', '>=', sinceIso)),
        snap => setVisits(snap.docs.map(d => d.data() as VisitLog)),
        onErr
      ),
      onSnapshot(
        query(collection(db, 'vitals_logs'), where('recordedAt', '>=', sinceIso)),
        snap => setVitals(snap.docs.map(d => ({ id: d.id, ...d.data() }) as VitalLogRow)),
        onErr
      )
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const report = useMemo(
    () => buildSupervisionReport(ashas, visits, vitals, beneficiaries),
    [ashas, visits, vitals, beneficiaries]
  );

  const dayLabel = (day: string) => new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });

  const flagCount = (r: AshaRow) => r.farVisits.length + r.unmatchedEdits.length + r.scansWithoutLocation;

  return (
    <div className="silky-glass p-5 sm:p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>ASHA Field Supervision (last {REPORT_DAYS} days)</span>
        </h4>
      </div>

      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
        Built from GPS-stamped visit logs. A visit is verified when the mother's PIN was entered. Distance is measured
        from the GPS fix taken when the mother was registered; scans over {FAR_VISIT_METERS} m away are flagged.
      </p>

      {error && (
        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Could not load supervision data: {error}</p>
      )}

      {!error && report.rows.length === 0 && (
        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">No approved ASHA accounts found.</p>
      )}

      <div className="space-y-2">
        {report.rows.map(r => {
          const open = openUid === r.uid;
          const maxDay = Math.max(1, ...r.visitsPerDay);
          const verifiedPct = r.scans ? Math.round((r.verifiedScans / r.scans) * 100) : null;
          return (
            <div key={r.uid} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setOpenUid(open ? null : r.uid)}
                className="w-full p-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-left cursor-pointer"
              >
                <div className="min-w-[8rem] flex-1">
                  <span className="text-sm font-black text-slate-950 dark:text-white block">{r.name}</span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                    {r.assignedMothers} mothers • {r.visitsToday} visits today • {r.confirmedVisits} mother-confirmed
                  </span>
                </div>

                <div className="flex items-end gap-1 h-8" title="Visits per day, oldest first">
                  {r.visitsPerDay.map((n, i) => (
                    <div key={report.days[i]} className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-3 rounded-sm bg-teal-500"
                        style={{ height: `${Math.max(2, (n / maxDay) * 22)}px`, opacity: n ? 1 : 0.25 }}
                        title={`${dayLabel(report.days[i])}: ${n}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 w-24">
                  {verifiedPct === null ? 'No scans' : `${verifiedPct}% PIN-verified`}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-black">
                  {r.farVisits.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      {r.farVisits.length} far from home
                    </span>
                  )}
                  {r.unmatchedEdits.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {r.unmatchedEdits.length} edits without scan
                    </span>
                  )}
                  {r.overdueMothers.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                      {r.overdueMothers.length} overdue ANC
                    </span>
                  )}
                  {flagCount(r) === 0 && r.overdueMothers.length === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      No flags
                    </span>
                  )}
                </div>

                <ChevronDown className={`w-4 h-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="px-3 pb-3 space-y-3 text-[11px] text-slate-800 dark:text-slate-200">
                  <div>
                    <span className="font-black flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Scans far from the mother's home</span>
                    {r.farVisits.length === 0 ? (
                      <p className="text-slate-600 dark:text-slate-400">None.</p>
                    ) : (
                      <ul className="list-disc pl-5">
                        {r.farVisits.map(f => (
                          <li key={f.visit.id}>
                            {f.motherName}: {f.meters} m away, {formatTime(f.visit.clientAt)}
                            {f.visit.verified ? ' (PIN verified)' : ' (no PIN)'}
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.scansWithoutLocation > 0 && (
                      <p className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-bold">
                        <MapPinOff className="w-3.5 h-3.5" /> {r.scansWithoutLocation} scan(s) had no GPS fix, so distance is unknown.
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="font-black">Vitals entered without a matching scan</span>
                    {r.unmatchedEdits.length === 0 ? (
                      <p className="text-slate-600 dark:text-slate-400">None.</p>
                    ) : (
                      <ul className="list-disc pl-5">
                        {r.unmatchedEdits.map(u => (
                          <li key={u.vital.id}>{u.motherName}: entered {formatTime(u.vital.recordedAt as string)}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <span className="font-black flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5 text-orange-500" /> Overdue ANC contacts</span>
                    {r.overdueMothers.length === 0 ? (
                      <p className="text-slate-600 dark:text-slate-400">None.</p>
                    ) : (
                      <ul className="list-disc pl-5">
                        {r.overdueMothers.map(o => (
                          <li key={o.beneficiaryId}>
                            {o.motherName}: ANC #{o.contactNo} due {o.dueDate} ({o.daysLate} days late)
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
