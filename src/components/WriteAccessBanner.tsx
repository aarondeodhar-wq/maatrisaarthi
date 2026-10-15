import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { writeAccessUntil } from '../core/accessWindow';

// Shows the ASHA worker whether this mother's record is open for updates, and the time left.
export const WriteAccessBanner: React.FC<{ beneficiaryId: string }> = ({ beneficiaryId }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const until = writeAccessUntil(beneficiaryId, now);

  if (until === null) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Updates locked. Scan this mother's QR pass or enter her PIN to unlock editing for 15 minutes.</span>
      </div>
    );
  }

  const secs = Math.max(0, Math.ceil((until - now) / 1000));
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200">
      <ShieldCheck className="w-4 h-4 shrink-0" />
      <span>Editing open. Access ends in <span className="font-mono">{mm}:{ss}</span>.</span>
    </div>
  );
};
