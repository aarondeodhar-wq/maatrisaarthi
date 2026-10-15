import React, { useEffect, useState } from 'react';
import { Beneficiary } from '../types';
import { generateHealthPassQrCode, PASS_TTL_MS } from '../core/qrEngine';

interface HealthPassQrProps {
  beneficiary?: Beneficiary;
  className?: string;
}

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Renders the mother's MCP pass QR. Every QR is valid for 15 minutes: scanners reject it
 * after that, so a photo of it is useless later. The QR is re-issued automatically
 * while this component is on screen.
 */
export const HealthPassQr: React.FC<HealthPassQrProps> = ({ beneficiary, className }) => {
  const [dataUrl, setDataUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const id = beneficiary?.id;
  const rchId = beneficiary?.rchId;

  // Issue a fresh QR when the mother changes and again whenever the current one runs out
  useEffect(() => {
    if (!id) return;
    if (dataUrl && now < expiresAt) return;
    let cancelled = false;
    const issuedAt = Date.now();
    generateHealthPassQrCode({
      app: 'MAATRISAARTHI',
      type: 'MOTHER_HEALTH_PASS',
      beneficiaryId: id,
      rchId: rchId || '',
      timestamp: new Date(issuedAt).toISOString(),
      expiresAt: issuedAt + PASS_TTL_MS
    }).then(url => {
      if (cancelled) return;
      setDataUrl(url);
      setExpiresAt(issuedAt + PASS_TTL_MS);
    });
    return () => {
      cancelled = true;
    };
  }, [id, rchId, dataUrl, now, expiresAt]);

  useEffect(() => {
    setDataUrl('');
    setExpiresAt(0);
  }, [id, rchId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!id) {
    return (
      <div className={`flex items-center justify-center text-center text-xs text-slate-500 font-bold p-4 ${className || 'w-44 h-44'}`}>
        No health record is linked to this account yet. Ask your ASHA worker to register you.
      </div>
    );
  }

  return dataUrl ? (
    <div className="inline-flex flex-col items-center gap-1">
      <img src={dataUrl} alt={`MCP pass QR for ${beneficiary?.name || 'mother'}`} className={`object-contain rounded-xl ${className || 'w-44 h-44'}`} />
      <span className="text-[11px] font-bold text-slate-600">
        Valid for <span className="font-mono">{formatRemaining(expiresAt - now)}</span> • refreshes automatically
      </span>
    </div>
  ) : (
    <div className={`flex items-center justify-center text-xs text-slate-500 font-bold ${className || 'w-44 h-44'}`}>
      Generating QR...
    </div>
  );
};
