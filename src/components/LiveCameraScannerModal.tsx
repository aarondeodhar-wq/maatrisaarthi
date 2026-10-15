import React, { useState, useEffect, useRef } from 'react';
import { Beneficiary, Language } from '../types';
import { 
  Camera, 
  CameraOff, 
  X, 
  Sparkles, 
  CheckCircle2, 
  KeyRound, 
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Zap,
  Users
} from 'lucide-react';
import jsQR from 'jsqr';
import { parseScannedQrPass, isPassFresh, MotherHealthPassPayload } from '../core/qrEngine';

interface LiveCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  beneficiaries: Beneficiary[];
  onSelectBeneficiary: (beneficiary: Beneficiary) => void;
  // Called once per opened record. verified is true only when the mother's PIN was entered.
  onVisitVerified?: (beneficiary: Beneficiary, action: 'SCAN_QR' | 'PIN_UNLOCK', verified: boolean) => void;
  onScanSuccessToast?: (msg: string) => void;
  scannerTitle?: string;
}

export const LiveCameraScannerModal: React.FC<LiveCameraScannerModalProps> = ({
  isOpen,
  onClose,
  language,
  beneficiaries,
  onSelectBeneficiary,
  onVisitVerified,
  onScanSuccessToast,
  scannerTitle
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'DECRYPTING' | 'SUCCESS'>('IDLE');
  const [detectedPass, setDetectedPass] = useState<MotherHealthPassPayload | null>(null);
  // A scanned pass waiting for the mother's PIN, which proves she was at the visit
  const [pendingMatch, setPendingMatch] = useState<Beneficiary | null>(null);
  const [visitPin, setVisitPin] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Real Device Camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setPendingMatch(null);
      setVisitPin('');
      return;
    }

    startRealCamera();

    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode]);

  const startRealCamera = async () => {
    stopCameraStream();
    setCameraError(null);
    setScanStatus('SCANNING');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API not supported in this browser. Please use the 4-digit PIN fallback.');
      setScanStatus('IDLE');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video metadata to play and start scanning loop
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          startFrameProcessing();
        };
      }
    } catch (err: any) {
      console.warn('Real camera stream failed:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          language === 'mr' 
            ? 'कॅमेरा परवानगी नाकारली गेली आहे. कृपया ब्राउझरमध्ये कॅमेरा परवानगी सुरु करा किंवा खालील पिन वापरा.'
            : language === 'hi'
            ? 'कैमरा अनुमति अस्वीकृत है। कृपया कैमरा सक्षम करें या नीचे दिए गए पिन का उपयोग करें।'
            : 'Camera permission was denied. Please allow camera access in browser settings or use the 4-digit PIN.'
        );
      } else {
        setCameraError(
          language === 'mr'
            ? 'कॅमेरा सुरू करण्यात अडचण आली. कृपया पिन किंवा चाचणी पास वापरा.'
            : 'Could not access camera device. Please use PIN or simulated quick scan.'
        );
      }
      setScanStatus('IDLE');
    }
  };

  const stopCameraStream = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Real-time Canvas QR Recognition Loop with jsQR
  const startFrameProcessing = () => {
    const scanLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (qrCode && qrCode.data) {
            handleRawQrDetected(qrCode.data);
            return; // Stop loop once detected
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanLoop);
    };

    animationFrameRef.current = requestAnimationFrame(scanLoop);
  };

  const handleRawQrDetected = (qrString: string) => {
    setScanStatus('DECRYPTING');
    const payload = parseScannedQrPass(qrString);

    if (payload && !isPassFresh(payload)) {
      // Valid MaatriSaarthi QR, but older than 15 minutes (or an old-format QR)
      setScanStatus('IDLE');
      setCameraError('This QR has expired. Ask the mother to open her pass again: it refreshes automatically and is valid for 15 minutes.');
      return;
    }

    if (payload) {
      setDetectedPass(payload);
      setScanStatus('SUCCESS');
      stopCameraStream();

      // Only open a record that exists in the cohort this user is authorised to read
      const matched = beneficiaries.find(b =>
        b.id === payload.beneficiaryId ||
        (payload.rchId !== '' && b.rchId === payload.rchId)
      );

      if (!matched) {
        setScanStatus('IDLE');
        setCameraError('This MCP pass is not in your assigned records. Check that you are signed in to the right account.');
        return;
      }

      // A QR can be photographed and replayed later, so the visit only counts as verified
      // once the mother gives her PIN.
      setTimeout(() => {
        setVisitPin('');
        setPendingMatch(matched);
        setScanStatus('IDLE');
      }, 400);
    } else {
      // Not a valid MaatriSaarthi QR
      setScanStatus('SCANNING');
      animationFrameRef.current = requestAnimationFrame(startFrameProcessing);
    }
  };

  const finishVisit = (b: Beneficiary, action: 'SCAN_QR' | 'PIN_UNLOCK', verified: boolean) => {
    onVisitVerified?.(b, action, verified);
    onSelectBeneficiary(b);
    if (onScanSuccessToast) {
      onScanSuccessToast(verified
        ? `✓ Visit verified with PIN: ${b.name} (${b.rchId})`
        : `Opened ${b.name} (${b.rchId}). Visit NOT verified: no PIN entered.`);
    }
    onClose();
  };

  const handleConfirmVisitPin = () => {
    if (!pendingMatch) return;
    if (visitPin.trim() === pendingMatch.accessPin) {
      setCameraError(null);
      finishVisit(pendingMatch, 'SCAN_QR', true);
    } else {
      setCameraError('Incorrect PIN. Ask the mother for her 4-digit consent PIN.');
    }
  };

  const cancelPendingMatch = () => {
    setPendingMatch(null);
    setVisitPin('');
    setCameraError(null);
    startRealCamera();
  };

  // Fallback 4-Digit Offline PIN Unlock
  const handlePinUnlock = () => {
    const cleanPin = pinInput.trim();
    if (!cleanPin) return;

    const matched = /^\d{4}$/.test(cleanPin) ? beneficiaries.find(b => b.accessPin === cleanPin) : undefined;

    if (matched) {
      setCameraError(null);
      setScanStatus('SUCCESS');
      setTimeout(() => finishVisit(matched, 'PIN_UNLOCK', true), 500);
    } else {
      setCameraError('Incorrect PIN. Ask the mother for her 4-digit consent PIN.');
    }
  };

  // Quick 1-Tap Simulation for Clinical Demos. Opens the record at once, so the
  // visit is logged as unverified (no PIN) and shows as such on the supervisor dashboard.
  const handleQuickDemoScan = (b: Beneficiary) => {
    setScanStatus('DECRYPTING');
    setTimeout(() => {
      setScanStatus('SUCCESS');
      setTimeout(() => {
        onVisitVerified?.(b, 'SCAN_QR', false);
        onSelectBeneficiary(b);
        if (onScanSuccessToast) onScanSuccessToast(`✓ Scanned Pass: ${b.name} (${b.rchId})`);
        onClose();
      }, 500);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-white/20 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                {scannerTitle || (language === 'mr' ? 'मातेचा डिजिटल QR पास स्कॅनर' : language === 'hi' ? 'माता डिजिटल QR पास स्कैनर' : 'Live Patient QR Camera Scanner')}
              </h3>
              <span className="text-[10px] text-teal-400 font-bold block">
                {cameraActive ? '● Live Camera Active (jsQR 30fps)' : 'Offline PIN & Camera Fallback'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center font-black text-xs cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Camera Viewfinder Screen */}
        <div className="relative w-full h-64 sm:h-72 bg-black rounded-2xl overflow-hidden border-2 border-dashed border-teal-400 flex items-center justify-center shadow-inner">
          {/* Hidden Canvas for Frame Processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Real Live Video Feed */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            playsInline
            muted
            autoPlay
          />

          {/* Live Reticle Target Grid & Red Laser Sweep */}
          {cameraActive && scanStatus === 'SCANNING' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Reticle Target Square */}
              <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-teal-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(20,184,166,0.5)]">
                {/* 4 Corner Markers */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-teal-300 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-teal-300 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-teal-300 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-teal-300 rounded-br-lg" />
                
                {/* Animated Red Laser Scanline */}
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-bounce absolute top-1/2 -translate-y-1/2" />
              </div>

              {/* Bottom Instructions Overlay */}
              <div className="absolute bottom-2 inset-x-2 text-center bg-black/60 backdrop-blur-xs py-1 px-2 rounded-lg text-[10px] text-slate-200 font-bold">
                {language === 'mr' ? 'कॅमेऱ्यासमोर मातेचा QR कोड दाखवा' : 'Align Mother\'s MCP QR Pass in Viewfinder'}
              </div>
            </div>
          )}

          {/* Camera Loading / Decrypting / Success State Overlays */}
          {scanStatus === 'DECRYPTING' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-2 z-10 animate-fadeIn">
              <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-teal-300">
                {language === 'mr' ? '२५६-बिट एनक्रिप्शन डीक्रिप्ट करत आहे...' : 'Decrypting 256-Bit DPDP Medical Payload...'}
              </p>
            </div>
          )}

          {scanStatus === 'SUCCESS' && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-2 z-10 animate-fadeIn">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
              <p className="text-sm font-black text-white">
                {language === 'mr' ? 'तपासणी पास सत्यापित झाला!' : 'MCP Pass Decrypted & Verified!'}
              </p>
            </div>
          )}

          {/* Visit confirmation: mother's PIN */}
          {pendingMatch && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center space-y-2 z-20">
              <ShieldCheck className="w-8 h-8 text-teal-400" />
              <p className="text-xs font-black text-white">{pendingMatch.name} • RCH {pendingMatch.rchId}</p>
              <p className="text-[11px] text-slate-300 font-bold">
                {language === 'mr' ? 'भेट सिद्ध करण्यासाठी मातेचा ४-अंकी पिन टाका' : "Enter the mother's 4-digit PIN to confirm you are at this visit"}
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={visitPin}
                onChange={e => setVisitPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 text-center tracking-widest font-mono text-base font-black border border-white/20 rounded-xl p-2 bg-black/60 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-400 outline-none"
              />
              {cameraError && <p className="text-[11px] font-bold text-rose-400">{cameraError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={handleConfirmVisitPin} className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer">
                  {language === 'mr' ? 'पडताळा' : 'Confirm visit'}
                </button>
                <button type="button" onClick={() => finishVisit(pendingMatch, 'SCAN_QR', false)} className="bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-[11px] px-3 py-2 rounded-xl cursor-pointer">
                  {language === 'mr' ? 'पिन शिवाय उघडा' : 'Open without PIN'}
                </button>
                <button type="button" onClick={cancelPendingMatch} className="bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-[11px] px-3 py-2 rounded-xl cursor-pointer">
                  {language === 'mr' ? 'मागे' : 'Back'}
                </button>
              </div>
            </div>
          )}

          {/* Camera Permission Denied / Error Fallback UI */}
          {!cameraActive && scanStatus === 'IDLE' && !pendingMatch && (
            <div className="p-4 text-center space-y-2 text-slate-300">
              <CameraOff className="w-10 h-10 mx-auto text-rose-400" />
              <p className="text-xs font-bold text-slate-200">
                {cameraError || (language === 'mr' ? 'कॅमेरा जोडलेला नाही' : 'Camera stream unavailable')}
              </p>
              <button
                type="button"
                onClick={startRealCamera}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 mx-auto cursor-pointer shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'कॅमेरा पुन्हा सुरू करा' : 'Retry Real Camera'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Camera Switcher (Front / Back Lens) */}
        {cameraActive && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 font-bold">
              {facingMode === 'environment' ? '📷 Rear Lens (Environment)' : '🤳 Front Lens'}
            </span>
            <button
              type="button"
              onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
              className="text-teal-400 hover:text-teal-300 font-black cursor-pointer underline text-[11px]"
            >
              {language === 'mr' ? 'कॅमेरा बदला' : 'Switch Camera Lens'}
            </button>
          </div>
        )}

        {/* 4-Digit Offline PIN Fallback */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            — {language === 'mr' ? 'किंवा ४-अंकी ऑफलाइन सुरक्षा पिन टाका' : "OR ENTER THE MOTHER'S 4-DIGIT CONSENT PIN"} —
          </div>
          {cameraError && cameraActive && (
            <p className="text-[11px] font-bold text-rose-400 text-center">{cameraError}</p>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={4}
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              placeholder="••••"
              className="flex-1 text-center tracking-widest font-mono text-base font-black border border-white/20 rounded-xl p-2.5 bg-black/60 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-400 outline-none"
            />
            <button
              type="button"
              onClick={handlePinUnlock}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs px-4 py-3 rounded-xl cursor-pointer shadow-lg shadow-teal-500/25 transition"
            >
              {language === 'mr' ? 'उघडा' : 'Unlock PIN'}
            </button>
          </div>
        </div>

        {/* 1-Tap Sample Mother Picker for Rapid Testing / Demos */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <span className="text-[10px] font-bold text-slate-400 block">
            ⚡ {language === 'mr' ? 'जलद १-टॅप चाचणी पास निवडा:' : 'Quick 1-Tap Sample Patient Pass:'}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {beneficiaries.slice(0, 2).map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleQuickDemoScan(b)}
                className="p-2 rounded-xl bg-white/10 hover:bg-teal-500/20 border border-white/10 text-left transition cursor-pointer flex items-center justify-between"
              >
                <div className="truncate min-w-0 pr-1">
                  <span className="text-[11px] font-black text-white block truncate">{b.name}</span>
                  <span className="text-[9px] text-teal-400 font-mono block">RCH: {b.rchId}</span>
                </div>
                <span className={`text-[8px] font-black px-1 py-0.5 rounded ${b.currentRiskTier === 'RED' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                  {b.currentRiskTier}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-xl text-xs cursor-pointer transition border border-white/15"
        >
          {language === 'mr' ? 'रद्द करा (Close)' : 'Close'}
        </button>
      </div>
    </div>
  );
};
