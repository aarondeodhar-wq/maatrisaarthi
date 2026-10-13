import React, { useEffect, useState } from 'react';
import { Beneficiary } from '../types';
import { generateHealthPassQrCode } from '../core/qrEngine';

interface HealthPassQrProps {
  beneficiary?: Beneficiary;
  className?: string;
}

/**
 * Renders the mother's unique MCP pass QR. The QR encodes only her record ID and RCH ID,
 * so it is the same every time it is shown and different for every mother.
 */
export const HealthPassQr: React.FC<HealthPassQrProps> = ({ beneficiary, className }) => {
  const [dataUrl, setDataUrl] = useState('');
  const id = beneficiary?.id;
  const rchId = beneficiary?.rchId;
  const issuedAt = beneficiary?.registeredAt;

  useEffect(() => {
    let cancelled = false;
    setDataUrl('');
    if (!id) return;
    generateHealthPassQrCode({
      app: 'MAATRISAARTHI',
      type: 'MOTHER_HEALTH_PASS',
      beneficiaryId: id,
      rchId: rchId || '',
      timestamp: issuedAt || ''
    }).then(url => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [id, rchId, issuedAt]);

  if (!id) {
    return (
      <div className={`flex items-center justify-center text-center text-xs text-slate-500 font-bold p-4 ${className || 'w-44 h-44'}`}>
        No health record is linked to this account yet. Ask your ASHA worker to register you.
      </div>
    );
  }

  return dataUrl ? (
    <img src={dataUrl} alt={`MCP pass QR for ${beneficiary?.name || 'mother'}`} className={`object-contain rounded-xl ${className || 'w-44 h-44'}`} />
  ) : (
    <div className={`flex items-center justify-center text-xs text-slate-500 font-bold ${className || 'w-44 h-44'}`}>
      Generating QR...
    </div>
  );
};
