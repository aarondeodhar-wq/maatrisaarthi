import React, { useState, useEffect } from 'react';
import { Beneficiary, Language, VitalRecord, RiskTier } from '../types';
import { predictMaternalRisk } from '../core/mlRiskEngine';
import { calculateEDD, calculateGestationalWeeks, generateANCSchedule, toLocalDateString } from '../core/protocolEngine';
import { createDefaultDPDPConsent } from '../core/dpdpCompliance';
import { 
  Heart, 
  QrCode, 
  KeyRound, 
  AlertTriangle, 
  CheckCircle2, 
  PhoneCall, 
  Mic, 
  MicOff, 
  Calendar, 
  PlusCircle, 
  Activity, 
  UserCheck, 
  ShieldAlert, 
  ChevronRight, 
  Search, 
  Sparkles, 
  ArrowRight, 
  Send, 
  Volume2, 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  Users, 
  Building2, 
  Clock, 
  ShieldCheck, 
  TrendingUp, 
  Laptop,
  Timer,
  Pill,
  Bell,
  Droplets,
  Zap,
  Eye,
  AlertCircle,
  Camera,
  Scan,
  X
} from 'lucide-react';
import { generateHealthPassQrCode, parseScannedQrPass } from '../core/qrEngine';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';

interface FieldWorkerMobileViewProps {
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary;
  onSelectBeneficiary: (b: Beneficiary) => void;
  language: Language;
  onAddVitalsRecord: (beneficiaryId: string, vital: VitalRecord) => void;
  onRegisterBeneficiary: (newB: Beneficiary) => void;
  onSendEmergencySOS: (b: Beneficiary) => void;
  onRecordAudioNote: (b: Beneficiary, noteText: string) => void;
  isOnline: boolean;
}

export const FieldWorkerMobileView: React.FC<FieldWorkerMobileViewProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  language,
  onAddVitalsRecord,
  onRegisterBeneficiary,
  onSendEmergencySOS,
  onRecordAudioNote,
  isOnline
}) => {
  const [activeTab, setActiveTab] = useState<'CARD_TRIAGE' | 'ENTER_VITALS' | 'DUE_LIST' | 'TIMERS' | 'REGISTER'>('CARD_TRIAGE');
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneFramePreview, setPhoneFramePreview] = useState(false);

  // Vitals Entry Form State
  const [systolicBP, setSystolicBP] = useState(selectedBeneficiary.vitalsHistory[0]?.systolicBP || 120);
  const [diastolicBP, setDiastolicBP] = useState(selectedBeneficiary.vitalsHistory[0]?.diastolicBP || 80);
  const [hemoglobin, setHemoglobin] = useState(selectedBeneficiary.vitalsHistory[0]?.hemoglobin || 11.0);
  const [bloodSugar, setBloodSugar] = useState(selectedBeneficiary.vitalsHistory[0]?.bloodSugar || 95);
  const [weightKg, setWeightKg] = useState(selectedBeneficiary.vitalsHistory[0]?.weightKg || 52);
  const [hasBleeding, setHasBleeding] = useState(false);
  const [hasSevereHeadache, setHasSevereHeadache] = useState(false);
  const [hasBlurredVision, setHasBlurredVision] = useState(false);
  const [hasFacialEdema, setHasFacialEdema] = useState(false);
  const [hasReducedFetalMovement, setHasReducedFetalMovement] = useState(false);
  const [hasConvulsions, setHasConvulsions] = useState(false);

  // Audio Note Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNoteSent, setVoiceNoteSent] = useState(false);

  // ASHA QR Camera Scanner & Offline PIN State
  const [ashaScanModalOpen, setAshaScanModalOpen] = useState(false);
  const [scanSimulating, setScanSimulating] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [scanSuccessToast, setScanSuccessToast] = useState<string | null>(null);

  const handleAshaScanSimulate = (target: Beneficiary) => {
    setScanSimulating(true);
    setTimeout(() => {
      setScanSimulating(false);
      setAshaScanModalOpen(false);
      onSelectBeneficiary(target);
      setScanSuccessToast(`✅ Decrypted digital pass for ${target.name} (RCH: ${target.rchId})`);
      setTimeout(() => setScanSuccessToast(null), 3500);
    }, 1000);
  };

  const handleAshaUnlockPin = () => {
    const cleanPin = pinInput.trim();
    const match = /^\d{4}$/.test(cleanPin) ? beneficiaries.find(b => b.accessPin === cleanPin) : undefined;
    if (match) {
      onSelectBeneficiary(match);
      setAshaScanModalOpen(false);
      setScanSuccessToast(`✅ PIN Verified: Dossier unlocked for ${match.name}`);
      setTimeout(() => setScanSuccessToast(null), 3500);
    } else {
      setScanSuccessToast('❌ Incorrect PIN. Ask the mother for her 4-digit consent PIN.');
      setTimeout(() => setScanSuccessToast(null), 3500);
    }
  };

  // Live Timer & Pill Reminder state
  const [pmsmaCountdownDays, setPmsmaCountdownDays] = useState(23);
  const [pillTimerActive, setPillTimerActive] = useState(true);
  const [customTimerMinutes, setCustomTimerMinutes] = useState(30);
  const [activeTimerSeconds, setActiveTimerSeconds] = useState(1800);
  const [timerRunning, setTimerRunning] = useState(false);

  // New Mother Registration State
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState(22);
  const [regPhone, setRegPhone] = useState('');
  const [regHusband, setRegHusband] = useState('');
  const [regVillage, setRegVillage] = useState('Koregaon Bhima');
  const [regLmp, setRegLmp] = useState('2026-04-15');
  const [regGravidity, setRegGravidity] = useState(1);
  const [regParity, setRegParity] = useState(0);
  const [regPrevCesarean, setRegPrevCesarean] = useState(false);
  const [regBloodGroup, setRegBloodGroup] = useState('B+');

  useEffect(() => {
    let interval: any = null;
    if (timerRunning && activeTimerSeconds > 0) {
      interval = setInterval(() => {
        setActiveTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (activeTimerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, activeTimerSeconds]);

  // Live evaluated triage on current inputs
  const liveTriage = predictMaternalRisk({
    age: selectedBeneficiary.age,
    systolicBP,
    diastolicBP,
    hemoglobin,
    bloodSugar,
    weightKg,
    parity: selectedBeneficiary.parity,
    hasPrevCesarean: selectedBeneficiary.hasPrevCesarean,
    hasBleeding,
    hasSevereHeadache,
    hasBlurredVision,
    hasFacialEdema,
    hasReducedFetalMovement,
    hasConvulsions
  });

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    const newVital: VitalRecord = {
      id: 'vit_' + Math.random().toString(36).substring(2, 9),
      date: toLocalDateString(),
      gestationalWeek: selectedBeneficiary.currentGestationalWeeks,
      systolicBP,
      diastolicBP,
      hemoglobin,
      bloodSugar,
      weightKg,
      urineProtein: liveTriage.riskTier === 'RED' ? '1+' : 'NIL',
      symptoms: {
        hasVaginalBleeding: hasBleeding,
        hasSevereHeadache,
        hasBlurredVision,
        hasFacialEdema,
        hasReducedFetalMovement,
        hasConvulsions,
        hasHighFever: false
      },
      mlRiskScore: liveTriage.riskProbability,
      riskTier: liveTriage.riskTier,
      riskReasons: liveTriage.explainability.filter(e => e.contribution !== 'NORMAL').map(e => e.reason[language]),
      recordedBy: selectedBeneficiary.assignedAsha.name,
      facility: selectedBeneficiary.village + ' Anganwadi / Sub-Centre',
      syncStatus: isOnline ? 'SYNCED' : 'LOCAL'
    };

    onAddVitalsRecord(selectedBeneficiary.id, newVital);
    setActiveTab('CARD_TRIAGE');
  };

  const handleRegisterNewMother = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regLmp) return;

    const weeks = calculateGestationalWeeks(regLmp);
    const edd = calculateEDD(regLmp);
    const schedule = generateANCSchedule(regLmp, 'PHC Shirur');

    const newB: Beneficiary = {
      id: 'ben_' + Math.random().toString(36).substring(2, 9),
      rchId: `MH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      abhaId: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: regName,
      age: Number(regAge),
      phone: regPhone || '+91 98000 00000',
      husbandName: regHusband || 'Husband',
      village: regVillage,
      ward: 'Shirur Rural Ward 02',
      district: 'Pune',
      assignedAsha: {
        name: 'Savita Patil (सविता पाटील)',
        phone: '+91 97654 32101'
      },
      lmp: regLmp,
      edd,
      currentGestationalWeeks: weeks,
      gravidity: Number(regGravidity),
      parity: Number(regParity),
      hasPrevCesarean: regPrevCesarean,
      hasPastStillbirth: false,
      bloodGroup: regBloodGroup,
      currentRiskTier: 'GREEN',
      mlRiskScore: 0.12,
      riskFactors: [],
      ancSchedule: schedule,
      vitalsHistory: [
        {
          id: 'vit_init_' + Math.random().toString(36).substring(2, 7),
          date: toLocalDateString(),
          gestationalWeek: weeks,
          systolicBP: 120,
          diastolicBP: 80,
          hemoglobin: 11.5,
          bloodSugar: 90,
          weightKg: 50,
          urineProtein: 'NIL',
          symptoms: {
            hasVaginalBleeding: false,
            hasSevereHeadache: false,
            hasBlurredVision: false,
            hasFacialEdema: false,
            hasReducedFetalMovement: false,
            hasConvulsions: false,
            hasHighFever: false
          },
          mlRiskScore: 0.12,
          riskTier: 'GREEN',
          riskReasons: [],
          recordedBy: 'Savita Patil (ASHA)',
          facility: 'PHC Shirur',
          syncStatus: isOnline ? 'SYNCED' : 'LOCAL'
        }
      ],
      prescriptions: [],
      audioNotes: [],
      dpdpConsent: createDefaultDPDPConsent(language, true, true, true),
      qrAuthToken: `MS-AUTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      accessPin: `${Math.floor(1000 + Math.random() * 9000)}`,
      registeredAt: toLocalDateString(),
      lastSyncedAt: new Date().toISOString()
    };

    onRegisterBeneficiary(newB);
    onSelectBeneficiary(newB);
    setActiveTab('CARD_TRIAGE');
  };

  const handleVoiceRecordToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingSeconds(0);
      const timer = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 6) {
            clearInterval(timer);
            setIsRecording(false);
            setVoiceNoteSent(true);
            onRecordAudioNote(selectedBeneficiary, "डॉक्टर साहेब, मातेच्या रक्तदाब व हिमोग्लोबिन तपासणी संदर्भात तात्काळ मार्गदर्शन हवे आहे.");
            return 6;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const filteredBeneficiaries = beneficiaries.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.rchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.village.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 font-sans">
      {/* Top Banner with macOS Chrome */}
      <div className="silky-glass rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-white/15">
        {/* macOS Traffic Lights Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="macos-traffic-light">
              <span className="macos-dot-red" />
              <span className="macos-dot-yellow" />
              <span className="macos-dot-green" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-rose-500" />
              Maternal & Child Health Field Workstation • ASHA Console
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-3 py-1 rounded-full border ${
              isOnline 
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-400/30' 
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-400/30 animate-pulse'
            }`}>
              {isOnline ? 'Online (Auto-Sync)' : 'Offline Local Storage'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 border border-white/20">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                {selectedBeneficiary.assignedAsha.name} <span className="text-xs text-rose-600 dark:text-rose-300 font-bold">{language === 'mr' ? '(आशा कार्यकर्ती)' : language === 'hi' ? '(आशा कार्यकर्ता)' : '(ASHA Worker)'}</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Primary Health Centre (PHC) Shirur • Assigned Village: {selectedBeneficiary.village}
              </p>
            </div>
          </div>

          {/* Search Beneficiaries in Cohort */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search mother in cohort..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/20 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* FULL RESPONSIVE 2-COLUMN MAC WORKSTATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Beneficiary Selector & Traffic Light Triage (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Beneficiary Quick Selector Carousel */}
          <div className="silky-glass rounded-3xl p-5 shadow-xl space-y-3 border border-slate-200 dark:border-white/15">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-2.5">
              <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-rose-500" />
                <span>My Assigned Mothers ({beneficiaries.length})</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Select to Manage</span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {filteredBeneficiaries.map(b => {
                const isSelected = b.id === selectedBeneficiary.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelectBeneficiary(b);
                      setSystolicBP(b.vitalsHistory[0]?.systolicBP || 120);
                      setDiastolicBP(b.vitalsHistory[0]?.diastolicBP || 80);
                      setHemoglobin(b.vitalsHistory[0]?.hemoglobin || 11.0);
                      setBloodSugar(b.vitalsHistory[0]?.bloodSugar || 95);
                      setWeightKg(b.vitalsHistory[0]?.weightKg || 52);
                    }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 shadow-md ring-2 ring-rose-500/50'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        b.currentRiskTier === 'RED' ? 'bg-rose-500 animate-ping' :
                        b.currentRiskTier === 'YELLOW' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <div>
                        <div className={`font-black text-xs ${isSelected ? 'text-rose-950 dark:text-white' : 'text-slate-900 dark:text-white'}`}>{b.name}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                          {b.village} • {b.currentGestationalWeeks} Weeks • RCH: {b.rchId}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      b.currentRiskTier === 'RED' ? 'bg-rose-600 text-white shadow-xs animate-pulse' :
                      b.currentRiskTier === 'YELLOW' ? 'bg-amber-500 text-slate-950' :
                      'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30'
                    }`}>
                      {b.currentRiskTier}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Traffic Light Card & Triage Status */}
          <div id="tour-asha-triage" className={`p-6 rounded-3xl text-white shadow-2xl transition-all border ${
            selectedBeneficiary.currentRiskTier === 'RED'
              ? 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 !text-white border-2 border-rose-400 shadow-xl shadow-rose-600/30'
              : selectedBeneficiary.currentRiskTier === 'YELLOW'
              ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 !text-white border-2 border-amber-400 shadow-xl shadow-amber-600/30'
              : 'bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 !text-white border-2 border-emerald-400 shadow-xl shadow-teal-600/30'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-black/40 rounded-full border border-white/20 !text-white">
                  Traffic Light Triage Status
                </span>
                <h3 className="text-xl font-black mt-2 flex items-center gap-2 !text-white">
                  {selectedBeneficiary.currentRiskTier === 'RED' && <AlertTriangle className="w-5 h-5 text-white animate-bounce" />}
                  {selectedBeneficiary.currentRiskTier === 'YELLOW' && <Activity className="w-5 h-5 text-white" />}
                  {selectedBeneficiary.currentRiskTier === 'GREEN' && <CheckCircle2 className="w-5 h-5 text-white" />}
                  {selectedBeneficiary.currentRiskTier === 'RED'
                    ? (language === 'mr' ? 'तातडीचा उच्च धोका (Urgent Visit)' : 'HIGH RISK — URGENT CLINICAL VISIT')
                    : selectedBeneficiary.currentRiskTier === 'YELLOW'
                    ? (language === 'mr' ? 'मध्यम जोखीम (Caution Watchlist)' : 'CAUTION — PMSMA 9th CLINIC')
                    : (language === 'mr' ? 'सुरक्षित व सामान्य (Routine Safe)' : 'SAFE — ROUTINE ANC')}
                </h3>
              </div>

              <div className="text-right bg-black/30 p-2.5 rounded-2xl border border-white/20">
                <span className="text-2xl font-black !text-white">{selectedBeneficiary.currentGestationalWeeks}</span>
                <span className="text-[10px] block !text-white/90 font-bold">Weeks</span>
              </div>
            </div>

            <div className="mt-3 p-3 bg-black/25 rounded-2xl text-xs backdrop-blur-md font-bold leading-relaxed !text-white border border-white/15">
              {selectedBeneficiary.currentRiskTier === 'RED'
                ? (language === 'mr' ? 'तातडीने PHC किंवा १०८ रुग्णवाहिकेवर कॉल करा. रुग्णालयात हलवा.' : 'Immediate emergency transfer to hospital. Standby 108 ambulance.')
                : selectedBeneficiary.currentRiskTier === 'YELLOW'
                ? (language === 'mr' ? '९ तारखेच्या PMSMA शिबिरात तज्ज्ञ स्त्रीरोग तपासणी करा.' : 'Mandatory OB-GYN checkup at PMSMA 9th monthly specialist camp.')
                : (language === 'mr' ? 'नियमित १ IFA लाल गोळी व कॅल्शियम गोळी चालू ठेवा.' : 'Continue regular daily IFA tablet + Calcium supplementation.')}
            </div>

            {/* 1-Tap Emergency Actions */}
            <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
              <a
                href="tel:108"
                onClick={() => onSendEmergencySOS(selectedBeneficiary)}
                className="flex items-center justify-center gap-2 bg-white text-rose-700 hover:bg-rose-50 font-black py-2.5 px-3 rounded-2xl shadow-lg text-xs border border-white/40 cursor-pointer transition active:scale-95"
              >
                <PhoneCall className="w-4 h-4 text-rose-600 animate-pulse" />
                <span>{language === 'mr' ? '१०८ रुग्णवाहिका (SOS)' : language === 'hi' ? '108 एम्बुलेंस (SOS)' : '108 Ambulance SOS'}</span>
              </a>

              <button
                type="button"
                onClick={handleVoiceRecordToggle}
                className={`flex items-center justify-center gap-2 font-black py-2.5 px-3 rounded-2xl shadow-lg text-xs cursor-pointer border border-white/25 backdrop-blur-md transition ${
                  isRecording ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-white/20 hover:bg-white/30 !text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isRecording ? `Recording (${recordingSeconds}s)...` : language === 'mr' ? 'व्हॉईस मेमो (Audio)' : language === 'hi' ? 'वॉयस मेमो (Audio)' : 'Voice Memo (Audio)'}</span>
              </button>
            </div>
          </div>

          {/* Digital MCP Pass Scanner & Pass Tools for ASHA */}
          <div id="tour-asha-scanner" className="silky-glass rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-white/15 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                  Digital MCP Pass Scanner & Pass Tools
                </h4>
              </div>
              <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-400/30 px-2.5 py-0.5 rounded-full">
                DPDP 2023 Encrypted
              </span>
            </div>

            {/* Scan Mother's QR Code Button */}
            <button
              type="button"
              onClick={() => setAshaScanModalOpen(true)}
              className="w-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 text-white font-black py-3 px-4 rounded-2xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 text-xs transition cursor-pointer border border-white/20 active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>{language === 'mr' ? '📷 मातेचा QR कोड स्कॅन करा (Scan Camera)' : '📷 Scan Mother\'s QR Pass (Live Camera)'}</span>
            </button>

            {/* Selected Mother Pass Preview & View Pass Button */}
            <div className="bg-slate-50 dark:bg-black/30 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block truncate">
                  Active Pass: {selectedBeneficiary.name}
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                  RCH: {selectedBeneficiary.rchId} • PIN: <span className="font-mono text-rose-600 dark:text-rose-400 font-black">{selectedBeneficiary.accessPin}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAshaScanModalOpen(true)}
                className="bg-teal-500/15 hover:bg-teal-500/25 px-3 py-2 rounded-xl border border-teal-500/30 text-teal-900 dark:text-teal-200 shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-black transition"
                title="Scan Mother MCP Pass"
              >
                <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>{language === 'mr' ? 'स्कॅन करा' : language === 'hi' ? 'स्कैन करें' : 'Scan Mother'}</span>
              </button>
            </div>

            {scanSuccessToast && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-black animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{scanSuccessToast}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Vitals Logger, Due-List, Timers & Registration Tabs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Floating Frosted Capsule Navigation Bar */}
          <div id="tour-asha-tabs" className="flex items-center gap-1.5 p-1.5 rounded-full silky-glass border border-slate-200 dark:border-white/10 shadow-lg overflow-x-auto text-xs font-black">
            <button
              type="button"
              onClick={() => setActiveTab('ENTER_VITALS')}
              className={`py-2 px-4 rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'ENTER_VITALS' || activeTab === 'CARD_TRIAGE' 
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{language === 'mr' ? 'तपासणी नोंद (Vitals)' : language === 'hi' ? 'जांच दर्ज करें' : 'Record Vitals'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DUE_LIST')}
              className={`py-2 px-4 rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'DUE_LIST' 
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{language === 'mr' ? '८-ANC वेळापत्रक' : language === 'hi' ? '8-ANC अनुसूची' : '8-ANC Schedule'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TIMERS')}
              className={`py-2 px-4 rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'TIMERS' 
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Timer className="w-4 h-4 text-amber-500" />
              <span>{language === 'mr' ? 'क्लिनिकल टाइमर्स' : language === 'hi' ? 'क्लीनिकल टाइमर' : 'Clinical Timers'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('REGISTER')}
              className={`py-2 px-4 rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'REGISTER' 
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === 'mr' ? '+ नवीन नोंदणी' : language === 'hi' ? '+ नया पंजीकरण' : '+ New Registration'}</span>
            </button>
          </div>

          {/* TAB: ENTER VITALS */}
          {(activeTab === 'ENTER_VITALS' || activeTab === 'CARD_TRIAGE') && (
            <form onSubmit={handleSaveVitals} className="reference-hero-card p-6 sm:p-8 space-y-5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-3">
                <div>
                  <div className="headline-tag-pill mb-1">
                    ((•)) Real-Time Maternal Risk Stratification
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-500" />
                    <span>{selectedBeneficiary.name} — {language === 'mr' ? 'तपासणी नोंद (Offline Vitals Logger)' : language === 'hi' ? 'जांच लॉग (Offline Vitals Logger)' : 'Offline Vitals Logger'}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                    Enter field vitals. AI model evaluates High/Medium/Low risk tier in real-time.
                  </p>
                </div>
                <span className="font-mono text-xs text-teal-800 dark:text-teal-300 font-black bg-teal-100 dark:bg-teal-500/15 border border-teal-300 dark:border-teal-500/30 px-3 py-1 rounded-full shadow-xs">
                  Week {selectedBeneficiary.currentGestationalWeeks}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hemoglobin */}
                <div className="reference-sub-card p-4 space-y-2">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5 text-xs font-black">
                      <Droplets className="w-4 h-4 text-rose-500" />
                      <span>Hemoglobin (Hb)</span>
                    </span>
                    <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                      hemoglobin < 7 
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black animate-pulse' 
                        : 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                    }`}>
                      {hemoglobin} g/dL
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHemoglobin(prev => Math.max(4.0, parseFloat((prev - 0.1).toFixed(1))))}
                      className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 font-black text-slate-900 dark:text-white flex items-center justify-center cursor-pointer hover:bg-slate-300"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="4.0"
                      max="16.0"
                      step="0.1"
                      value={hemoglobin}
                      onChange={e => setHemoglobin(parseFloat(e.target.value))}
                      className="flex-1 accent-teal-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-full"
                    />
                    <button
                      type="button"
                      onClick={() => setHemoglobin(prev => Math.min(16.0, parseFloat((prev + 0.1).toFixed(1))))}
                      className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 font-black text-slate-900 dark:text-white flex items-center justify-center cursor-pointer hover:bg-slate-300"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">
                    Severe Anemia if &lt; 7.0 g/dL • Moderate: 7.0 - 9.9 g/dL
                  </span>
                </div>

                {/* Blood Pressure */}
                <div className="reference-sub-card p-4 space-y-2">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5 text-xs font-black">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span>Blood Pressure (BP)</span>
                    </span>
                    <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                      systolicBP >= 140 || diastolicBP >= 90
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse'
                        : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                    }`}>
                      {systolicBP}/{diastolicBP} mmHg
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">Systolic</span>
                      <input
                        type="range"
                        min="80"
                        max="200"
                        step="2"
                        value={systolicBP}
                        onChange={e => setSystolicBP(parseInt(e.target.value))}
                        className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-full"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">Diastolic</span>
                      <input
                        type="range"
                        min="50"
                        max="130"
                        step="2"
                        value={diastolicBP}
                        onChange={e => setDiastolicBP(parseInt(e.target.value))}
                        className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-full"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">
                    Pre-eclampsia risk if &ge; 140/90 mmHg
                  </span>
                </div>
              </div>

              {/* Danger Signs Checklist */}
              <div className="reference-sub-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{language === 'mr' ? 'धोक्याची लक्षणे (CHECK DANGER SIGNS):' : language === 'hi' ? 'खतरे के लक्षण (CHECK DANGER SIGNS):' : 'CHECK DANGER SIGNS (RED FLAGS):'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setHasBleeding(!hasBleeding)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      hasBleeding 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 font-bold shadow-xs' 
                        : 'silky-card'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-rose-500" />
                      <span>{language === 'mr' ? 'अंगावरून रक्तस्त्राव (Bleeding)' : language === 'hi' ? 'रक्तस्राव (Bleeding)' : 'Vaginal Bleeding'}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${hasBleeding ? 'bg-rose-600 text-white' : 'bg-slate-300 dark:bg-white/10'}`}>
                      {hasBleeding ? '✓' : ''}
                    </span>
                  </div>

                  <div
                    onClick={() => setHasSevereHeadache(!hasSevereHeadache)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      hasSevereHeadache 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 font-bold shadow-xs' 
                        : 'silky-card'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>{language === 'mr' ? 'तीव्र डोकेदुखी (Severe Headache)' : language === 'hi' ? 'तीव्र सिरदर्द (Severe Headache)' : 'Severe Headache'}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${hasSevereHeadache ? 'bg-rose-600 text-white' : 'bg-slate-300 dark:bg-white/10'}`}>
                      {hasSevereHeadache ? '✓' : ''}
                    </span>
                  </div>

                  <div
                    onClick={() => setHasFacialEdema(!hasFacialEdema)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      hasFacialEdema 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs' 
                        : 'silky-card'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                      <span>{language === 'mr' ? 'चेहऱ्यावर / पायावर सूज (Edema)' : language === 'hi' ? 'चेहरे/पैरों में सूजन (Edema)' : 'Facial / Pedal Edema'}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${hasFacialEdema ? 'bg-amber-600 text-white' : 'bg-slate-300 dark:bg-white/10'}`}>
                      {hasFacialEdema ? '✓' : ''}
                    </span>
                  </div>

                  <div
                    onClick={() => setHasConvulsions(!hasConvulsions)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      hasConvulsions 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 font-bold shadow-xs' 
                        : 'silky-card'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      <span>{language === 'mr' ? 'झटके / चक्कर (Convulsions)' : language === 'hi' ? 'दौरे / झटके (Convulsions)' : 'Convulsions / Fits'}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${hasConvulsions ? 'bg-rose-600 text-white' : 'bg-slate-300 dark:bg-white/10'}`}>
                      {hasConvulsions ? '✓' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Save Action Pill Button */}
              <button
                type="submit"
                className="btn-pill-primary w-full py-3.5 text-xs sm:text-sm font-black shadow-xl cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'mr' ? 'तपासणी सेव्ह करा (Save Vitals & Sync)' : language === 'hi' ? 'जांच सुरक्षित करें (Save Vitals)' : 'Save Vitals & Sync'}</span>
              </button>
            </form>
          )}

          {/* TAB: TIMERS & REMINDERS */}
          {activeTab === 'TIMERS' && (
            <div className="silky-glass rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-white/15 text-xs">
              <div className="border-b border-slate-200/80 dark:border-white/10 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-500" />
                    <span>Live ANC Countdown & Pill Intake Timers</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                    Auto-calculates intervals for next clinical appointments and medication reminders.
                  </p>
                </div>
                <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30 px-2.5 py-1 rounded-full">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PMSMA 9th Countdown */}
                <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-rose-500" />
                      <span>Next PMSMA 9th Camp</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-300">Monthly 9th</span>
                  </div>
                  <div className="text-2xl font-black text-slate-950 dark:text-white font-mono">
                    {pmsmaCountdownDays} Days Remaining
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight font-medium">
                    Specialist OB-GYN camp at {selectedBeneficiary.village} PHC on 9th of next month.
                  </p>
                </div>

                {/* Daily IFA Iron Pill Intake Timer */}
                <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-emerald-500" />
                      <span>Daily IFA Pill Intake</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      Daily 8:00 PM
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    Evening Dose Set
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight font-medium">
                    1 Red IFA tablet (100mg Iron + 500mcg Folic Acid) after dinner.
                  </p>
                </div>
              </div>

              {/* Custom Countdown Timer */}
              <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Live Field Visit Interval Timer:</span>
                </span>

                <div className="flex items-center justify-between bg-white dark:bg-black/40 p-3 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">Time Left:</span>
                    <span className="text-3xl font-black text-slate-950 dark:text-white font-mono">
                      {formatTimerDisplay(activeTimerSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTimerRunning(!timerRunning)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer shadow-md transition ${
                        timerRunning ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {timerRunning ? 'Pause' : 'Start Timer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimerRunning(false);
                        setActiveTimerSeconds(1800);
                      }}
                      className="px-3 py-2 rounded-xl font-bold text-xs bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DUE LIST */}
          {activeTab === 'DUE_LIST' && (
            <div className="silky-glass rounded-3xl p-6 shadow-2xl space-y-3 border border-slate-200 dark:border-white/15 text-xs">
              <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider border-b border-slate-200/80 dark:border-white/10 pb-2.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-rose-500" />
                <span>WHO 8-Contact ANC Schedule ({selectedBeneficiary.name})</span>
              </h4>
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {selectedBeneficiary.ancSchedule.map((c, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-black text-slate-950 dark:text-white text-xs">ANC {c.contactNo}: {c.title[language] || c.title.en}</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-0.5">Due Date: {c.dueDate} (Week {c.targetWeek}) • {c.assignedFacility}</div>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                      c.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30' :
                      c.status === 'OVERDUE' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 font-black border border-rose-300 dark:border-rose-400/30 animate-pulse' :
                      'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/10 font-bold'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: REGISTER */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegisterNewMother} className="silky-glass rounded-3xl p-6 shadow-2xl space-y-3.5 border border-slate-200 dark:border-white/15 text-xs">
              <h3 className="text-sm font-black text-slate-950 dark:text-white border-b border-slate-200/80 dark:border-white/10 pb-2.5 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-rose-500" />
                <span>{language === 'mr' ? 'नवीन गर्भवती मातेची नोंदणी (New Mother Registration)' : language === 'hi' ? 'नई गर्भवती माता का पंजीकरण' : 'New Maternal Beneficiary Registration'}</span>
              </h3>
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:bg-white focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-300 block mb-1">Age *</label>
                  <input
                    type="number"
                    placeholder="Age"
                    value={regAge}
                    onChange={e => setRegAge(parseInt(e.target.value) || 20)}
                    className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:bg-white focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-300 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    placeholder="Phone"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:bg-white focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-2xl border border-rose-200 dark:border-rose-500/30">
                <label className="font-black text-rose-900 dark:text-rose-300 block mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-300" />
                  <span>Last Menstrual Period (LMP Date) *</span>
                </label>
                <input
                  type="date"
                  required
                  value={regLmp}
                  onChange={e => setRegLmp(e.target.value)}
                  className="w-full border border-rose-300 dark:border-rose-400 rounded-xl p-2 bg-white dark:bg-black/40 text-slate-900 dark:text-white text-xs font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black py-3.5 rounded-2xl shadow-xl transition cursor-pointer border border-white/20 text-xs sm:text-sm"
              >
                {language === 'mr' ? 'नोंदणी पूर्ण करा (Schedule 8 ANCs)' : language === 'hi' ? 'पंजीकरण पूर्ण करें' : 'Complete Registration & Schedule 8 ANCs'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ASHA Live QR Scanner & PIN Decryptor Modal */}
      {ashaScanModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-black">
                  {language === 'mr' ? 'मातेचा QR पास स्कॅन करा' : 'Scan Mother\'s Digital MCP Pass'}
                </h3>
              </div>
              <button
                onClick={() => setAshaScanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewfinder & Simulation */}
            <div className="relative bg-slate-950 rounded-2xl h-56 flex flex-col items-center justify-center overflow-hidden border-2 border-dashed border-rose-500/80 p-4 text-center">
              {scanSimulating ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-rose-300 animate-pulse">
                    Decrypting Mother's Digital Pass & Vitals...
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <Scan className="w-12 h-12 text-rose-400 mx-auto animate-pulse" />
                  <p className="text-xs font-bold text-white">Align Mother's QR Code in Camera</p>
                  <p className="text-[11px] text-slate-400">Scans encrypted maternal record & RCH token offline</p>
                  <button
                    type="button"
                    onClick={() => handleAshaScanSimulate(selectedBeneficiary)}
                    className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black py-2.5 px-5 rounded-xl text-xs cursor-pointer shadow-lg mt-1 border border-white/20 transition active:scale-95"
                  >
                    ⚡ 1-Tap Auto-Scan ({selectedBeneficiary.name})
                  </button>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-slate-500 font-bold">— OR ENTER OFFLINE 4-DIGIT PIN —</div>

            {/* Offline PIN fallback input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={4}
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="••••"
                className="flex-1 text-center tracking-widest font-mono text-base font-black border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/50 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAshaUnlockPin}
                className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md"
              >
                Unlock Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
