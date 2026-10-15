import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Beneficiary } from '../types';
import { generateHealthPassQrCode, PASS_TTL_MS } from '../core/qrEngine';

interface HealthPassQrProps {
  beneficiary?: Beneficiary;
  className?: string;
}

// How long each QR stays valid before a new one is issued. Shorter = a photo of it goes stale sooner.
const REFRESH_OPTIONS: Array<{ ms: number; label: string }> = [
  { ms: 30 * 1000, label: '30 s (live)' },
  { ms: 60 * 1000, label: '1 min' },
  { ms: 5 * 60 * 1000, label: '5 min' },
  { ms: PASS_TTL_MS, label: '15 min' }
];
const STORAGE_KEY = 'maatrisaarthi_qr_refresh_ms';

const readSavedInterval = (): number => {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (REFRESH_OPTIONS.some(o => o.ms === saved)) return saved;
  } catch (e) {}
  return 60 * 1000;
};

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Renders the mother's MCP pass QR and keeps it live: a new QR is issued whenever the current one
 * runs out, on the interval chosen here (30 s to 15 min). Scanners reject expired passes, so a
 * screenshot stops working after that interval.
 */
export const HealthPassQr: React.FC<HealthPassQrProps> = ({ beneficiary, className }) => {
  const [dataUrl, setDataUrl] = useState('');
  const [issuedAt, setIssuedAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [intervalMs, setIntervalMs] = useState<number>(readSavedInterval);
  const id = beneficiary?.id;
  const rchId = beneficiary?.rchId;

  // Issue a fresh QR when the mother or interval changes and whenever the current one runs out
  useEffect(() => {
    if (!id) return;
    if (dataUrl && now < expiresAt) return;
    let cancelled = false;
    const issued = Date.now();
    const expires = issued + intervalMs;
    generateHealthPassQrCode({
      app: 'MAATRISAARTHI',
      type: 'MOTHER_HEALTH_PASS',
      beneficiaryId: id,
      rchId: rchId || '',
      timestamp: new Date(issued).toISOString(),
      expiresAt: expires
    }).then(url => {
      if (cancelled) return;
      setDataUrl(url);
      setIssuedAt(issued);
      setExpiresAt(expires);
    });
    return () => {
      cancelled = true;
    };
  }, [id, rchId, dataUrl, now, expiresAt, intervalMs]);

  const refreshNow = () => {
    setDataUrl('');
    setExpiresAt(0);
  };

  useEffect(refreshNow, [id, rchId, intervalMs]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const chooseInterval = (ms: number) => {
    setIntervalMs(ms);
    try {
      localStorage.setItem(STORAGE_KEY, String(ms));
    } catch (e) {}
  };

  if (!id) {
    return (
      <div className={`flex items-center justify-center text-center text-xs text-slate-500 font-bold p-4 ${className || 'w-44 h-44'}`}>
        No health record is linked to this account yet. Ask your ASHA worker to register you.
      </div>
    );
  }

  const remaining = expiresAt - now;
  const fraction = issuedAt && expiresAt > issuedAt ? Math.max(0, Math.min(1, remaining / (expiresAt - issuedAt))) : 0;

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      {dataUrl ? (
        <img src={dataUrl} alt={`MCP pass QR for ${beneficiary?.name || 'mother'}`} className={`object-contain rounded-xl ${className || 'w-44 h-44'}`} />
      ) : (
        <div className={`flex items-center justify-center text-xs text-slate-500 font-bold ${className || 'w-44 h-44'}`}>
          Generating QR...
        </div>
      )}

      {/* Time left on this QR */}
      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
        <div
          className={`h-full transition-[width] duration-1000 ease-linear ${fraction < 0.2 ? 'bg-rose-500' : 'bg-teal-600'}`}
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
        <span>
          Valid <span className="font-mono">{formatRemaining(remaining)}</span> • auto-refresh
        </span>
        <button
          type="button"
          onClick={refreshNow}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-100"
          title="Issue a new QR now"
        >
          <RefreshCw className="w-3 h-3" />
          <span>New</span>
        </button>
      </div>

      {/* Refresh interval options */}
      <div className="flex flex-wrap justify-center gap-1" role="group" aria-label="QR refresh interval">
        {REFRESH_OPTIONS.map(o => (
          <button
            key={o.ms}
            type="button"
            onClick={() => chooseInterval(o.ms)}
            aria-pressed={intervalMs === o.ms}
            className={`px-2 py-0.5 rounded-full text-[10px] font-black border cursor-pointer ${
              intervalMs === o.ms ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
};
