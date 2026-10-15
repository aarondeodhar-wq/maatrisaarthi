import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Beneficiary, Language, VisitCode } from '../types';
import { UserProfile, isDemoProfile } from '../core/firebaseAuth';
import { demoConfirmCurrent, issueVisitCode, subscribeVisitCode } from '../core/visitCodes';
import { getPassBaseUrl } from '../core/qrEngine';

interface VisitConfirmModalProps {
  profile: UserProfile;
  beneficiary: Beneficiary;
  language: Language;
  onClose: () => void;
  // Called once per code, when the mother has confirmed it
  onConfirmed: (beneficiary: Beneficiary) => void;
}

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * ASHA: shows a one-time visit code (QR and 6 digits) for the mother to confirm.
 * A new code is issued every time this opens and every time "New code" is pressed.
 */
export const VisitConfirmModal: React.FC<VisitConfirmModalProps> = ({ profile, beneficiary, language, onClose, onConfirmed }) => {
  const [visitCode, setVisitCode] = useState<VisitCode | null>(null);
  const [qr, setQr] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const reported = useRef<number | null>(null);

  const issue = useCallback(async () => {
    setError(null);
    setQr('');
    try {
      const issued = await issueVisitCode(profile, beneficiary.id);
      setVisitCode(issued);
      const url = `${getPassBaseUrl()}/pass?confirm=${encodeURIComponent(`${beneficiary.id}.${issued.code}`)}`;
      setQr(await QRCode.toDataURL(url, { width: 280, margin: 2, errorCorrectionLevel: 'M' }));
    } catch (err: any) {
      setError(err?.message || 'Could not create a visit code.');
    }
  }, [profile, beneficiary.id]);

  // A new code every time the modal opens
  useEffect(() => {
    issue();
  }, [issue]);

  // Follow the stored code: it flips to confirmed when the mother confirms
  useEffect(() => {
    return subscribeVisitCode(profile, beneficiary.id, stored => {
      if (stored) setVisitCode(prev => (prev && prev.createdAt > stored.createdAt ? prev : stored));
    });
  }, [profile, beneficiary.id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const confirmed = !!visitCode?.confirmedAt;
  const expired = !!visitCode && !confirmed && now > visitCode.expiresAt;

  useEffect(() => {
    if (visitCode?.confirmedAt && reported.current !== visitCode.createdAt) {
      reported.current = visitCode.createdAt;
      onConfirmed(beneficiary);
    }
  }, [visitCode, beneficiary, onConfirmed]);

  const L = (mr: string, hi: string, en: string) => (language === 'mr' ? mr : language === 'hi' ? hi : en);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-3 text-center border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            {L('भेट पडताळणी कोड', 'विज़िट सत्यापन कोड', 'Visit confirmation code')}
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 flex items-center justify-center cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
          {beneficiary.name} • RCH {beneficiary.rchId}
        </p>

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        {confirmed ? (
          <div className="py-6 space-y-2">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
              {L('मातेने भेट निश्चित केली', 'माँ ने विज़िट की पुष्टि की', 'Mother confirmed this visit')}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {L('ही भेट पडताळलेली म्हणून नोंदली गेली.', 'यह विज़िट सत्यापित दर्ज हुई।', 'The visit is now recorded as mother-confirmed.')}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white p-3 rounded-2xl inline-flex border border-slate-200">
              {qr && !expired ? (
                <img src={qr} alt="Visit confirmation QR" className="w-48 h-48 object-contain" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs font-bold text-slate-500">
                  {expired ? L('कोड संपला', 'कोड समाप्त', 'Code expired') : '...'}
                </div>
              )}
            </div>

            <div className="font-mono text-3xl font-black tracking-[0.3em] text-teal-700 dark:text-teal-300">
              {visitCode && !expired ? visitCode.code : '------'}
            </div>

            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
              {visitCode && !expired
                ? <>{L('वैध', 'मान्य', 'Valid for')} <span className="font-mono">{formatRemaining(visitCode.expiresAt - now)}</span> • {L('एकदाच वापरता येतो', 'एक बार उपयोग', 'works once')}</>
                : L('नवीन कोड तयार करा', 'नया कोड बनाएं', 'Generate a new code')}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {L(
                'मातेला तिच्या ॲपमध्ये हा कोड टाकायला किंवा हा QR स्कॅन करायला सांगा.',
                'माँ से अपने ऐप में यह कोड डालने या यह QR स्कैन करने को कहें।',
                "Ask the mother to scan this QR or type the code in her MaatriSaarthi app."
              )}
            </p>
          </>
        )}

        <div className="flex gap-2 justify-center">
          {!confirmed && (
            <button type="button" onClick={issue} className="btn-pill-secondary px-4 py-2 text-xs font-black cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
              {L('नवीन कोड', 'नया कोड', 'New code')}
            </button>
          )}
          {!confirmed && isDemoProfile(profile) && (
            <button
              type="button"
              onClick={() => demoConfirmCurrent(profile, beneficiary.id)}
              className="btn-pill-secondary px-4 py-2 text-xs font-black cursor-pointer"
              title="Demo only: confirms as the mother without a second device"
            >
              Demo: confirm as mother
            </button>
          )}
          {confirmed && (
            <button type="button" onClick={issue} className="btn-pill-primary px-4 py-2 text-xs font-black cursor-pointer">
              {L('नवीन भेटीसाठी कोड', 'नई विज़िट का कोड', 'New code for next visit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
