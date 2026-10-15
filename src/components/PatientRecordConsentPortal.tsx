import React, { useState, useEffect } from 'react';
import { Beneficiary, Language, VitalRecord } from '../types';
import { exportBeneficiaryToWordDoc } from '../core/wordExportService';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Heart, 
  Calendar, 
  PhoneCall, 
  Droplets, 
  Scale, 
  Gauge, 
  MapPin, 
  User, 
  FileText, 
  RefreshCw,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  FileDown
} from 'lucide-react';

interface PatientRecordConsentPortalProps {
  beneficiary: Beneficiary;
  language: Language;
  onClose: () => void;
  onRequestEmergencySOS?: (b: Beneficiary) => void;
}

export const PatientRecordConsentPortal: React.FC<PatientRecordConsentPortalProps> = ({
  beneficiary,
  language,
  onClose,
  onRequestEmergencySOS
}) => {
  // Stages: 'CONSENT_GATE' -> 'RECORD_UNLOCKED' -> 'AUTO_LOCKED'
  const [stage, setStage] = useState<'CONSENT_GATE' | 'RECORD_UNLOCKED' | 'AUTO_LOCKED'>('CONSENT_GATE');
  
  // Timer Duration (fixed at 15 minutes)
  const [selectedTtlMinutes, setSelectedTtlMinutes] = useState<number>(15);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(900);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Active vital record
  const latestVital: VitalRecord | undefined = beneficiary.vitalsHistory[0];

  // Start countdown once patient grants consent
  useEffect(() => {
    let timer: any = null;
    if (stage === 'RECORD_UNLOCKED' && isTimerRunning && remainingSeconds > 0) {
      timer = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setStage('AUTO_LOCKED');
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [stage, isTimerRunning, remainingSeconds]);

  // Handle Patient Granting Consent (Selecting YES)
  const handleGrantConsent = (minutes: number = 15) => {
    setSelectedTtlMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setIsTimerRunning(true);
    setStage('RECORD_UNLOCKED');
  };

  // Handle Immediate Manual Lock
  const handleManualLock = () => {
    setIsTimerRunning(false);
    setRemainingSeconds(0);
    setStage('AUTO_LOCKED');
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="max-w-3xl w-full bg-slate-900 border border-teal-500/30 text-white rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* =========================================================================
            HEADER BAR: DPDP Act 2023 Security Notice & Auto-Lock Status
           ========================================================================= */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border-b border-teal-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  {language === 'mr' ? 'डिजिटल मातृ सुरक्षा पास (MCP Health Portal)' : language === 'hi' ? 'डिजिटल मातृ सुरक्षा पास (MCP Health Portal)' : 'Digital Safe Motherhood Pass (MCP)'}
                </h2>
                <span className="bg-teal-500/20 text-teal-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-teal-400/30">
                  DPDP Act 2023
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                RCH ID: <span className="font-mono text-teal-300 font-bold">{beneficiary.rchId || 'MH-PUN-2026-8819'}</span> • {beneficiary.village} PHC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stage === 'RECORD_UNLOCKED' && (
              <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-300 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(remainingSeconds)}</span>
              </div>
            )}
            
            {stage === 'RECORD_UNLOCKED' && (
              <button
                type="button"
                onClick={handleManualLock}
                className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 transition cursor-pointer flex items-center gap-1"
                title="Lock Medical Records Immediately"
              >
                <Lock className="w-3 h-3" />
                <span>{language === 'mr' ? 'डेटा लॉक करा' : 'Lock Now'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center cursor-pointer transition text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* =========================================================================
            STAGE 1: DPDP ACT 2023 PATIENT CONSENT GATE
           ========================================================================= */}
        {stage === 'CONSENT_GATE' && (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-500/15 border-2 border-teal-500/50 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/10">
              <Lock className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg sm:text-xl font-black text-white">
                {language === 'mr' ? 'रुग्ण संमती पडताळणी आवश्यक आहे' : language === 'hi' ? 'रोगी की सहमति सत्यापन आवश्यक है' : 'Patient Consent Verification Required'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {language === 'mr'
                  ? 'वैद्यकीय गोपनीयता आणि DPDP कायदा २०२३ नुसार, माता रुग्णाने संमती दिल्याशिवाय गोपनीय आरोग्य अहवाल उघडले जाणार नाहीत.'
                  : language === 'hi'
                  ? 'चिकित्सा गोपनीयता और DPDP अधिनियम 2023 के तहत, मरीज की सहमति के बिना गोपनीय स्वास्थ्य रिकॉर्ड प्रदर्शित नहीं किए जा सकते।'
                  : 'In compliance with the Digital Personal Data Protection (DPDP) Act 2023, maternal clinical health records require explicit patient authorization prior to disclosure.'}
              </p>
            </div>

            {/* Patient Identity Confirmation Card */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-teal-500/20 max-w-md mx-auto text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-white/10 pb-2">
                <span>नोंदणीकृत माता (Beneficiary):</span>
                <span className="text-white font-black text-sm">{beneficiary.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>RCH क्रमांक:</span>
                <span className="font-mono text-teal-300 font-bold">{beneficiary.rchId}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>वय व गाव (Age & Village):</span>
                <span className="text-slate-200 font-bold">{beneficiary.age} वर्षे • {beneficiary.village}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>प्रवेश कालावधी (Auto-Lock Window):</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500 text-white">15 Mins</span>
              </div>
            </div>

            {/* Consent Question & Action Buttons (Patient must select YES) */}
            <div className="space-y-3 max-w-md mx-auto pt-2">
              <span className="text-xs font-bold text-amber-300 block">
                {language === 'mr' 
                  ? '👉 तुम्ही तुमचे वैद्यकीय अहवाल व ANC तपासणी माहिती पाहण्यास संमती देता का?' 
                  : language === 'hi' 
                  ? '👉 क्या आप अपने चिकित्सा रिकॉर्ड और ANC जांच विवरण देखने की सहमति देते हैं?' 
                  : '👉 Do you consent to unlock and share your maternal medical records?'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* YES: Grant Access */}
                <button
                  type="button"
                  onClick={() => handleGrantConsent(selectedTtlMinutes)}
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2 cursor-pointer transition hover:scale-[1.02]"
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>{language === 'mr' ? '✓ होय, संमती द्या (YES)' : language === 'hi' ? '✓ हाँ, सहमति दें (YES)' : '✓ YES, Grant Access'}</span>
                </button>

                {/* NO: Deny Access */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-white/10 hover:bg-rose-600 hover:text-white text-slate-300 border border-white/15 flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span>{language === 'mr' ? '✕ नकार द्या (NO)' : language === 'hi' ? '✕ अस्वीकार करें (NO)' : '✕ NO, Deny Access'}</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500">
              * संमती दिल्यानंतर डेटा {selectedTtlMinutes} मिनिटांसाठीच उपलब्ध राहील आणि त्यानंतर आपोआप लॉक होईल.
            </p>
          </div>
        )}

        {/* =========================================================================
            STAGE 2: UNLOCKED HIGH-FIDELITY CLINICAL PATIENT RECORD (Auto-Locking TTL)
           ========================================================================= */}
        {stage === 'RECORD_UNLOCKED' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            
            {/* Live Security Timer Alert Bar */}
            <div className="bg-gradient-to-r from-teal-950/80 to-emerald-950/80 border border-teal-500/50 p-3 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-teal-300 font-bold">
                <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {language === 'mr' 
                    ? `सक्रिय अधिकृत सत्र • ${formatTime(remainingSeconds)} मिनिटांत आपोआप लॉक होईल` 
                    : `Active Authorized Session • Auto-locks in ${formatTime(remainingSeconds)}`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleManualLock}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded-xl text-[11px] cursor-pointer"
              >
                {language === 'mr' ? 'आत्ताच लॉक करा' : 'Lock Now'}
              </button>
            </div>

            {/* Maternal Profile & Triage Banner */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-teal-500/20 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">माता नाव (Name):</span>
                <span className="text-sm font-black text-white">{beneficiary.name}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">पती: {beneficiary.husbandName}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">गर्भधारणा टप्पा (Gestational):</span>
                <span className="text-sm font-black text-teal-300">{beneficiary.currentGestationalWeeks} आठवडे (Weeks)</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">EDD: {beneficiary.edd}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">रक्तगट (Blood Group):</span>
                <span className="text-sm font-black text-rose-400 font-mono">{beneficiary.bloodGroup || 'Not known'}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">वय: {beneficiary.age} वर्षे</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">जोखीम श्रेणी (ML Risk Tier):</span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg inline-block mt-0.5 ${
                  beneficiary.currentRiskTier === 'RED'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : beneficiary.currentRiskTier === 'YELLOW'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {beneficiary.currentRiskTier === 'RED' ? '🔴 उच्च जोखीम (High Risk)' : beneficiary.currentRiskTier === 'YELLOW' ? '🟡 मध्यम जोखीम (Moderate)' : '🟢 सामान्य / सुरक्षित (Low Risk)'}
                </span>
              </div>
            </div>

            {/* Actions: Download Word Document + Lock */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800/50 rounded-2xl border border-teal-500/20">
              <button
                type="button"
                onClick={() => exportBeneficiaryToWordDoc(beneficiary)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition"
              >
                <FileDown className="w-4 h-4" />
                <span>{language === 'mr' ? '📄 वर्ड दस्तऐवज डाउनलोड करा (.doc)' : language === 'hi' ? '📄 वर्ड डॉक्यूमेंट डाउनलोड करें (.doc)' : '📄 Download Word Document (.doc)'}</span>
              </button>

              <span className="text-[11px] text-slate-400 font-medium">
                * NHM व PMSMA मानकांनुसार क्लिनिकल अहवाल
              </span>
            </div>

            {/* Vital Signs & Lab Reports */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                <span>तपासणी व रक्त अहवाल (Clinical Vitals & Labs)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* BP */}
                <div className="bg-slate-800/60 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                    <span>रक्तदाब (BP)</span>
                    <Gauge className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div className="text-base font-black text-white font-mono mt-1">
                    {latestVital?.systolicBP ? <>{latestVital.systolicBP}/{latestVital.diastolicBP} <span className="text-[10px] font-normal text-slate-400">mmHg</span></> : <span className="text-xs text-slate-400">not measured</span>}
                  </div>
                </div>

                {/* Hb */}
                <div className="bg-slate-800/60 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                    <span>हिमोग्लोबिन (Hb)</span>
                    <Droplets className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="text-base font-black text-rose-300 font-mono mt-1">
                    {latestVital?.hemoglobin !== undefined ? <>{latestVital.hemoglobin} <span className="text-[10px] font-normal text-slate-400">g/dL</span></> : <span className="text-xs text-slate-400">not measured</span>}
                  </div>
                </div>

                {/* Blood Sugar */}
                <div className="bg-slate-800/60 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                    <span>रक्त शर्करा (Sugar)</span>
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-base font-black text-white font-mono mt-1">
                    {latestVital?.bloodSugar !== undefined ? <>{latestVital.bloodSugar} <span className="text-[10px] font-normal text-slate-400">mg/dL</span></> : <span className="text-xs text-slate-400">not measured</span>}
                  </div>
                </div>

                {/* Weight */}
                <div className="bg-slate-800/60 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                    <span>वजन (Weight)</span>
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-base font-black text-white font-mono mt-1">
                    {latestVital?.weightKg !== undefined ? <>{latestVital.weightKg} <span className="text-[10px] font-normal text-slate-400">kg</span></> : <span className="text-xs text-slate-400">not measured</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 8-ANC Checkup Schedule Overview */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>८-ANC तपासणी वेळापत्रक (8-ANC Schedule)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {beneficiary.ancSchedule.slice(0, 4).map((anc) => (
                  <div key={anc.contactNo} className="bg-slate-800/40 p-2.5 rounded-xl border border-white/10 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-teal-300">ANC #{anc.contactNo}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                        anc.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {anc.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Due: {anc.dueDate}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 108 Emergency Ambulance Button */}
            <a
              href="tel:108"
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 fill-white animate-bounce" />
              <span>🚨 तात्काळ १०८ रुग्णवाहिका कॉल करा (1-Click 108 Emergency Call)</span>
            </a>
          </div>
        )}

        {/* =========================================================================
            STAGE 3: AUTO-LOCKED TIMEOUT STATE (DPDP Security Enforced)
           ========================================================================= */}
        {stage === 'AUTO_LOCKED' && (
          <div className="p-8 text-center space-y-5 overflow-y-auto">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/15 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg sm:text-xl font-black text-rose-400">
                {language === 'mr' ? '🔒 सत्र समाप्त • वैद्यकीय माहिती सुरक्षित लॉक झाली आहे' : language === 'hi' ? '🔒 सत्र समाप्त • चिकित्सा रिकॉर्ड सुरक्षित रूप से लॉक हैं' : '🔒 Session Expired • Patient Data Locked'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {language === 'mr'
                  ? `सुरक्षा कारणास्तव आणि DPDP कायदा २०२३ नुसार ${selectedTtlMinutes} मिनिटांचा सुरक्षित कालावधी समाप्त झाला आहे. पुन्हा पाहण्यासाठी रुग्णाची नवी संमती आवश्यक आहे.`
                  : `For patient privacy and DPDP Act 2023 compliance, the ${selectedTtlMinutes}-minute authorized viewing window has expired.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto pt-2">
              <button
                type="button"
                onClick={() => setStage('CONSENT_GATE')}
                className="btn-pill-primary py-3 px-5 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{language === 'mr' ? 'पुन्हा संमती द्या (Re-Authorize)' : 'Re-Authorize Consent'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-300 rounded-2xl cursor-pointer"
              >
                {language === 'mr' ? 'बंद करा (Close)' : 'Close'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
