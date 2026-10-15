import React, { useState, useEffect } from 'react';
import { Beneficiary, Language, VitalRecord, RiskTier } from '../types';
import { predictMaternalRisk } from '../core/mlRiskEngine';
import { speakTutorialAudio, stopTutorialAudio } from '../core/voiceTutorialService';
import { toLocalDateString, daysUntilNextPmsma } from '../core/protocolEngine';
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
import { HealthPassQr } from './HealthPassQr';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';
import { VisitConfirmModal } from './VisitConfirmModal';
import { UserProfile } from '../core/firebaseAuth';
import { DoctorPrescription } from '../types';
import { WriteAccessBanner } from './WriteAccessBanner';
import { MedicationPanel } from './MedicationPanel';
import { PregnancyProfileCard } from './PregnancyProfileCard';
import { VitalsSafetyPanel } from './VitalsSafetyPanel';
import { ExplainableAiPanel } from './ExplainableAiPanel';
import { MotherRegistrationForm } from './MotherRegistrationForm';
import type { PregnancyProfile } from '../core/pregnancyRisk';

interface FieldWorkerMobileViewProps {
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary;
  onSelectBeneficiary: (b: Beneficiary) => void;
  onLogVisit: (b: Beneficiary, action: 'SCAN_QR' | 'PIN_UNLOCK' | 'VISIT_CONFIRMED', verified: boolean, motherConfirmed?: boolean) => void;
  profile: UserProfile | null;
  language: Language;
  onAddVitalsRecord: (beneficiaryId: string, vital: VitalRecord) => void;
  onAddMedication?: (beneficiaryId: string, rx: DoctorPrescription) => void;
  onUpdatePregnancy?: (beneficiaryId: string, profile: PregnancyProfile) => void;
  onRegisterBeneficiary: (newB: Beneficiary) => void;
  onSendEmergencySOS: (b: Beneficiary) => void;
  isOnline: boolean;
}

export const FieldWorkerMobileView: React.FC<FieldWorkerMobileViewProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  onLogVisit,
  profile,
  language,
  onAddVitalsRecord,
  onAddMedication,
  onUpdatePregnancy,
  onRegisterBeneficiary,
  onSendEmergencySOS,
  isOnline
}) => {
  const [activeTab, setActiveTab] = useState<'CARD_TRIAGE' | 'ENTER_VITALS' | 'DUE_LIST' | 'TIMERS' | 'REGISTER'>('CARD_TRIAGE');
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneFramePreview, setPhoneFramePreview] = useState(false);

  // Vitals Entry Form State. Every reading starts blank: blank = not measured, so nothing
  // is saved or scored for it. Last visit's values are shown as hints, never copied in.
  const [systolicInput, setSystolicInput] = useState<string>('');
  const [diastolicInput, setDiastolicInput] = useState<string>('');
  const [hemoglobinInput, setHemoglobinInput] = useState<string>('');
  const [bloodSugarInput, setBloodSugarInput] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  // SpO2 is typed in from a pulse oximeter
  const [spO2Input, setSpO2Input] = useState<string>('');
  const [bodyTempInput, setBodyTempInput] = useState<string>('');
  const [heartRateInput, setHeartRateInput] = useState<string>('');
  const [urineInput, setUrineInput] = useState<'' | 'NIL' | 'TRACE' | '1+' | '2+' | '3+'>('');
  const reading = (s: string): number | undefined => (s.trim() && Number.isFinite(Number(s)) ? Number(s) : undefined);
  const systolicBP = reading(systolicInput) ?? 0;
  const diastolicBP = reading(diastolicInput) ?? 0;
  const hemoglobin = reading(hemoglobinInput) ?? 0;
  const bloodSugar = reading(bloodSugarInput) ?? 0;
  const weightKg = reading(weightInput);
  const lastVisit = selectedBeneficiary.vitalsHistory[0];
  const [hasBleeding, setHasBleeding] = useState(false);
  const [hasSevereHeadache, setHasSevereHeadache] = useState(false);
  const [hasBlurredVision, setHasBlurredVision] = useState(false);
  const [hasFacialEdema, setHasFacialEdema] = useState(false);
  const [hasReducedFetalMovement, setHasReducedFetalMovement] = useState(false);
  const [hasConvulsions, setHasConvulsions] = useState(false);
  // Preterm-labour signs: only changes the result before 37 completed weeks
  const [hasRegularContractions, setHasRegularContractions] = useState(false);
  const [hasLeakingFluid, setHasLeakingFluid] = useState(false);
  const [hasLowerAbdominalPain, setHasLowerAbdominalPain] = useState(false);

  // Read-aloud of the live AI result (native text-to-speech in the app, browser voice on the web)
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  useEffect(() => () => stopTutorialAudio(), []);

  // ASHA QR Camera Scanner & Offline PIN State
  const [ashaScanModalOpen, setAshaScanModalOpen] = useState(false);
  const [showPassQr, setShowPassQr] = useState(false);
  const [showVisitCode, setShowVisitCode] = useState(false);
  const [scanSuccessToast, setScanSuccessToast] = useState<string | null>(null);

  // Live Timer state. PMSMA camps run on the 9th of every month.
  const pmsmaCountdownDays = daysUntilNextPmsma();
  const [activeTimerSeconds, setActiveTimerSeconds] = useState(1800);
  const [timerRunning, setTimerRunning] = useState(false);

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

  // A different mother means a new visit: clear the form
  const resetVitalsForm = () => {
    setSystolicInput('');
    setDiastolicInput('');
    setHemoglobinInput('');
    setBloodSugarInput('');
    setWeightInput('');
    setSpO2Input('');
    setBodyTempInput('');
    setHeartRateInput('');
    setUrineInput('');
    setHasBleeding(false);
    setHasSevereHeadache(false);
    setHasBlurredVision(false);
    setHasFacialEdema(false);
    setHasReducedFetalMovement(false);
    setHasConvulsions(false);
    setHasRegularContractions(false);
    setHasLeakingFluid(false);
    setHasLowerAbdominalPain(false);
  };
  useEffect(resetVitalsForm, [selectedBeneficiary.id]);

  // Live AI analysis of the form: readings, danger signs, history, pregnancy profile and the
  // trend against her last saved visit
  const liveTriage = predictMaternalRisk({
    age: selectedBeneficiary.age,
    systolicBP,
    diastolicBP,
    hemoglobin,
    bloodSugar,
    weightKg,
    parity: selectedBeneficiary.parity,
    gravidity: selectedBeneficiary.gravidity,
    hasPastStillbirth: selectedBeneficiary.hasPastStillbirth,
    bloodGroup: selectedBeneficiary.bloodGroup,
    previous: lastVisit
      ? { systolicBP: lastVisit.systolicBP, diastolicBP: lastVisit.diastolicBP, hemoglobin: lastVisit.hemoglobin, date: lastVisit.date }
      : undefined,
    hasPrevCesarean: selectedBeneficiary.hasPrevCesarean,
    hasBleeding,
    hasSevereHeadache,
    hasBlurredVision,
    hasFacialEdema,
    hasReducedFetalMovement,
    hasConvulsions,
    gestationalWeeks: selectedBeneficiary.currentGestationalWeeks,
    pregnancy: selectedBeneficiary.pregnancy,
    hasRegularContractions,
    hasLeakingFluid,
    hasLowerAbdominalPain,
    spO2: spO2Input.trim() ? Number(spO2Input) : undefined,
    bodyTempF: bodyTempInput.trim() ? Number(bodyTempInput) : undefined,
    heartRate: heartRateInput.trim() ? Number(heartRateInput) : undefined,
    urineProtein: urineInput || undefined
  });

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    // BP is taken at every ANC visit; the other readings may be left blank (not measured)
    if (!(systolicBP > 0 && diastolicBP > 0)) {
      alert(language === 'mr' ? 'रक्तदाब (वरचा व खालचा) भरा.' : language === 'hi' ? 'रक्तचाप (ऊपरी और निचला) भरें।' : 'Enter blood pressure (systolic and diastolic).');
      return;
    }
    const newVital: VitalRecord = {
      id: 'vit_' + Math.random().toString(36).substring(2, 9),
      date: toLocalDateString(),
      gestationalWeek: selectedBeneficiary.currentGestationalWeeks,
      systolicBP,
      diastolicBP,
      ...(hemoglobin > 0 ? { hemoglobin } : {}),
      ...(bloodSugar > 0 ? { bloodSugar } : {}),
      ...(weightKg !== undefined ? { weightKg } : {}),
      ...(spO2Input.trim() ? { spO2: Math.round(Number(spO2Input)) } : {}),
      ...(urineInput ? { urineProtein: urineInput } : {}),
      ...(bodyTempInput.trim() ? { bodyTempF: Number(bodyTempInput) } : {}),
      ...(heartRateInput.trim() ? { heartRate: Math.round(Number(heartRateInput)) } : {}),
      symptoms: {
        hasVaginalBleeding: hasBleeding,
        hasSevereHeadache,
        hasBlurredVision,
        hasFacialEdema,
        hasReducedFetalMovement,
        hasConvulsions,
        hasRegularContractions,
        hasLeakingFluid,
        hasLowerAbdominalPain,
        hasHighFever: reading(bodyTempInput) !== undefined && Number(bodyTempInput) >= 100.4
      },
      mlRiskScore: liveTriage.riskProbability,
      riskTier: liveTriage.riskTier,
      riskReasons: liveTriage.explainability.filter(e => e.contribution !== 'NORMAL').map(e => e.reason[language]),
      recordedBy: profile?.name || selectedBeneficiary.assignedAsha.name,
      facility: selectedBeneficiary.village + ' Anganwadi / Sub-Centre',
      syncStatus: isOnline ? 'SYNCED' : 'LOCAL'
    };

    onAddVitalsRecord(selectedBeneficiary.id, newVital);
    setActiveTab('CARD_TRIAGE');
  };

  const handleReadAloud = () => {
    if (isReadingAloud) {
      stopTutorialAudio();
      setIsReadingAloud(false);
      return;
    }
    const reasons = liveTriage.explainability
      .filter(x => x.contribution !== 'NORMAL' && !x.feature.startsWith('Trained ML Model'))
      .slice(0, 4)
      .map(x => x.reason[language]);
    const text = [selectedBeneficiary.name, liveTriage.triageBadge[language], ...reasons, liveTriage.triageAction[language]].join('. ');
    speakTutorialAudio(text, language, () => setIsReadingAloud(true), () => setIsReadingAloud(false));
    setIsReadingAloud(true);
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
                {profile?.name || selectedBeneficiary.assignedAsha.name} <span className="text-xs text-rose-600 dark:text-rose-300 font-bold">{language === 'mr' ? '(आशा कार्यकर्ती)' : language === 'hi' ? '(आशा कार्यकर्ता)' : '(ASHA Worker)'}</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {profile?.village ? `${profile.village} • ` : ''}{language === 'mr' ? 'सध्याची माता' : language === 'hi' ? 'चयनित माता' : 'Selected mother'}: {selectedBeneficiary.name}, {selectedBeneficiary.village || '-'}
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

            {/* Preterm-Labor Risk Alert Strip */}
            {selectedBeneficiary.currentGestationalWeeks < 37 && (
              <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/20 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-amber-300 font-black shrink-0">⏳ {language === 'mr' ? 'अकाली प्रसूती धोका (<३७ आठवडे):' : 'Preterm Risk (<37 Wks):'}</span>
                  <span className="truncate text-[11px] font-bold text-white/90">
                    {liveTriage.pretermRisk.reasons.length > 0 ? liveTriage.pretermRisk.reasons.join(', ') : (language === 'mr' ? 'नियमित देखरेख' : 'Standard monitoring')}
                  </span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                  liveTriage.pretermRisk.level === 'HIGH' ? 'bg-rose-500 text-white' : liveTriage.pretermRisk.level === 'MODERATE' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-emerald-500 text-white'
                }`}>
                  {liveTriage.pretermRisk.level}
                </span>
              </div>
            )}

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
                onClick={handleReadAloud}
                aria-pressed={isReadingAloud}
                className={`flex items-center justify-center gap-2 font-black py-2.5 px-3 rounded-2xl shadow-lg text-xs cursor-pointer border border-white/25 backdrop-blur-md transition ${
                  isReadingAloud ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-white/20 hover:bg-white/30 !text-white'
                }`}
              >
                {isReadingAloud ? <MicOff className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isReadingAloud ? (language === 'mr' ? 'थांबा' : language === 'hi' ? 'रोकें' : 'Stop') : language === 'mr' ? 'धोका मोठ्याने ऐका' : language === 'hi' ? 'जोखिम सुनें' : 'Read risk aloud'}</span>
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
                onClick={() => setShowPassQr(true)}
                className="bg-teal-500/15 hover:bg-teal-500/25 px-3 py-2 rounded-xl border border-teal-500/30 text-teal-900 dark:text-teal-200 shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-black transition"
                title="Show this mother's MCP pass QR"
              >
                <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>{language === 'mr' ? 'QR दाखवा' : language === 'hi' ? 'QR दिखाएं' : 'Show QR'}</span>
              </button>

              {profile && (
                <button
                  type="button"
                  onClick={() => setShowVisitCode(true)}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-black transition"
                  title="Generate a one-time visit code for the mother to confirm"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'mr' ? 'भेट कोड' : language === 'hi' ? 'विज़िट कोड' : 'Visit code'}</span>
                </button>
              )}
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
            <>
            <WriteAccessBanner beneficiaryId={selectedBeneficiary.id} />
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
                {/* Temperature, pulse, urine protein (blank = not measured) */}
                <div className="reference-sub-card p-4 space-y-2">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200">Temperature (°F)</label>
                  <input type="number" step="0.1" min={95} max={110} value={bodyTempInput} onChange={e => setBodyTempInput(e.target.value)}
                    placeholder="e.g. 98.6" className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold" />
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200">Pulse / heart rate (bpm)</label>
                  <input type="number" min={30} max={220} value={heartRateInput} onChange={e => setHeartRateInput(e.target.value)}
                    placeholder="e.g. 80" className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold" />
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200">Urine protein (dipstick)</label>
                  <select value={urineInput} onChange={e => setUrineInput(e.target.value as typeof urineInput)}
                    className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold">
                    <option value="">Not tested</option>
                    <option value="NIL">Nil</option>
                    <option value="TRACE">Trace</option>
                    <option value="1+">1+</option>
                    <option value="2+">2+</option>
                    <option value="3+">3+</option>
                  </select>
                </div>

                {/* SpO2 (manual entry, typed from the device; display only) */}
                <div className="reference-sub-card p-4 space-y-2">
                  <label className="flex justify-between font-bold text-slate-800 dark:text-slate-200 text-xs font-black">
                    <span>SpO2 (%)</span>
                    <span className="text-[10px] text-slate-500">optional</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={50}
                    max={100}
                    value={spO2Input}
                    onChange={e => setSpO2Input(e.target.value)}
                    placeholder="e.g. 98"
                    className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold"
                  />
                  {spO2Input !== '' && (Number(spO2Input) < 50 || Number(spO2Input) > 100) && (
                    <p className="text-[11px] font-bold text-rose-600">Enter a value between 50 and 100.</p>
                  )}
                </div>

                {/* Blood Pressure (required at every visit) */}
                <div className="reference-sub-card p-4 space-y-2">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5 text-xs font-black">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span>Blood Pressure (mmHg) *</span>
                    </span>
                    {lastVisit && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        last: {lastVisit.systolicBP}/{lastVisit.diastolicBP}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" inputMode="numeric" min={60} max={250} required
                      value={systolicInput} onChange={e => setSystolicInput(e.target.value)}
                      placeholder="Systolic e.g. 118" aria-label="Systolic BP"
                      className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold"
                    />
                    <input
                      type="number" inputMode="numeric" min={30} max={160} required
                      value={diastolicInput} onChange={e => setDiastolicInput(e.target.value)}
                      placeholder="Diastolic e.g. 76" aria-label="Diastolic BP"
                      className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold"
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">
                    Pre-eclampsia risk if &ge; 140/90 mmHg
                  </span>
                </div>

                {/* Hemoglobin, blood sugar, weight (blank = not measured) */}
                <div className="reference-sub-card p-4 space-y-2">
                  <label className="flex justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-rose-500" />Hemoglobin (g/dL)</span>
                    {lastVisit?.hemoglobin !== undefined && <span className="text-[10px] text-slate-500 font-bold">last: {lastVisit.hemoglobin}</span>}
                  </label>
                  <input
                    type="number" inputMode="decimal" step="0.1" min={3} max={20}
                    value={hemoglobinInput} onChange={e => setHemoglobinInput(e.target.value)}
                    placeholder="Not measured" className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold"
                  />
                  <label className="flex justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                    <span>Blood sugar (mg/dL)</span>
                    {lastVisit?.bloodSugar !== undefined && <span className="text-[10px] text-slate-500 font-bold">last: {lastVisit.bloodSugar}</span>}
                  </label>
                  <input
                    type="number" inputMode="numeric" min={30} max={600}
                    value={bloodSugarInput} onChange={e => setBloodSugarInput(e.target.value)}
                    placeholder="Not measured" className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold"
                  />
                  <label className="flex justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                    <span>Weight (kg)</span>
                    {lastVisit?.weightKg !== undefined && <span className="text-[10px] text-slate-500 font-bold">last: {lastVisit.weightKg}</span>}
                  </label>
                  <input
                    type="number" inputMode="decimal" step="0.1" min={25} max={200}
                    value={weightInput} onChange={e => setWeightInput(e.target.value)}
                    placeholder="Not measured" className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 font-bold"
                  />
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">
                    Severe anaemia if Hb &lt; 7.0 g/dL • GDM check if sugar &ge; 140 mg/dL
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

              {/* Each reading against its safe range (if/else rules, vitalRanges.ts) */}
              <VitalsSafetyPanel
                systolicBP={systolicBP}
                diastolicBP={diastolicBP}
                hemoglobin={hemoglobin}
                bloodSugar={bloodSugar}
                weightKg={weightKg}
                spO2={spO2Input}
                bodyTemp={bodyTempInput}
                heartRate={heartRateInput}
                urine={urineInput}
              />

              {/* Preterm-labour warning signs (<37 completed weeks) */}
              <div className="reference-sub-card p-4 space-y-2.5 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>
                      {language === 'mr'
                        ? 'अकाली प्रसूती धोक्याची लक्षणे (<३७ पूर्ण आठवडे)'
                        : language === 'hi'
                        ? 'समय से पूर्व प्रसव के लक्षण (<37 पूर्ण सप्ताह)'
                        : 'Preterm Labor Warning Signs (<37 Completed Weeks)'}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    &lt; 37 Weeks Threshold
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
                  {language === 'mr'
                    ? 'अकाली प्रसूती म्हणजे ३७ पूर्ण आठवड्यांपूर्वी सुरू होणारी प्रसूती. ही लक्षणे दिसल्यास तातडीने रुग्णालय संदर्भ करा.'
                    : language === 'hi'
                    ? 'प्रीटर्म लेबर 37 पूर्ण सप्ताह से पहले प्रसव शुरू होना है। लक्षण दिखते ही तत्काल रेफरल करें।'
                    : 'Preterm labor means labor starting before 37 completed weeks. Immediately evaluate for emergency referral.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    [
                      language === 'mr' ? 'नियमित आकुंचन (Contractions)' : language === 'hi' ? 'नियमित संकुचन' : 'Regular Contractions',
                      hasRegularContractions,
                      setHasRegularContractions
                    ],
                    [
                      language === 'mr' ? 'पाणी जाणे (Leaking fluid)' : language === 'hi' ? 'पानी छूटना' : 'Leaking Amniotic Fluid',
                      hasLeakingFluid,
                      setHasLeakingFluid
                    ],
                    [
                      language === 'mr' ? 'ओटीपोटात दुखणे (Abdominal pain)' : language === 'hi' ? 'निचले पेट में दर्द' : 'Lower Abdominal Pain',
                      hasLowerAbdominalPain,
                      setHasLowerAbdominalPain
                    ]
                  ] as [string, boolean, (v: boolean) => void][]).map(([text, on, set]) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => set(!on)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-black cursor-pointer transition ${
                        on
                          ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {text} {on ? '✓' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live explainable-AI analysis of everything entered above plus her history */}
              <ExplainableAiPanel
                result={liveTriage}
                language={language}
                title={language === 'mr' ? 'AI जोखीम विश्लेषण (स्पष्टीकरणासह)' : language === 'hi' ? 'AI जोखिम विश्लेषण (कारण सहित)' : 'AI risk analysis (explainable)'}
              />

              {/* Primary Save Action Pill Button */}
              <button
                type="submit"
                className="btn-pill-primary w-full py-3.5 text-xs sm:text-sm font-black shadow-xl cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'mr' ? 'तपासणी सेव्ह करा (Save Vitals & Sync)' : language === 'hi' ? 'जांच सुरक्षित करें (Save Vitals)' : 'Save Vitals & Sync'}</span>
              </button>
            </form>
            </>
          )}

          {/* MEDICINES: shown with the vitals form */}
          {(activeTab === 'ENTER_VITALS' || activeTab === 'CARD_TRIAGE') && onAddMedication && (
            <MedicationPanel
              beneficiary={selectedBeneficiary}
              signedInName={profile?.name || selectedBeneficiary.assignedAsha.name || 'ASHA Worker'}
              onAdd={rx => onAddMedication(selectedBeneficiary.id, rx)}
            />
          )}

          {/* PREGNANCY PROFILE: multiple pregnancy, placement, growth, diseases, complications */}
          {(activeTab === 'ENTER_VITALS' || activeTab === 'CARD_TRIAGE') && onUpdatePregnancy && (
            <PregnancyProfileCard
              beneficiary={selectedBeneficiary}
              requiresWindow={profile?.role === 'ASHA_WORKER'}
              language={language}
              onChange={p => onUpdatePregnancy(selectedBeneficiary.id, p)}
            />
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
                    {pmsmaCountdownDays === 0 ? 'Today' : `${pmsmaCountdownDays} ${pmsmaCountdownDays === 1 ? 'Day' : 'Days'} Remaining`}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight font-medium">
                    {pmsmaCountdownDays === 0 ? 'PMSMA specialist camp is today (9th).' : 'Specialist OB-GYN camp at the PHC on the 9th.'}
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
            <MotherRegistrationForm
              profile={profile}
              language={language}
              onRegistered={b => {
                onRegisterBeneficiary(b);
                onSelectBeneficiary(b);
                setActiveTab('CARD_TRIAGE');
              }}
            />
          )}
        </div>
      </div>

      {/* Real camera QR scanner (with PIN fallback) */}
      <LiveCameraScannerModal
        isOpen={ashaScanModalOpen}
        onClose={() => setAshaScanModalOpen(false)}
        language={language}
        beneficiaries={beneficiaries}
        onSelectBeneficiary={onSelectBeneficiary}
        onVisitVerified={onLogVisit}
        onScanSuccessToast={(msg) => {
          setScanSuccessToast(msg);
          setTimeout(() => setScanSuccessToast(null), 3500);
        }}
        scannerTitle={language === 'mr' ? 'मातेचा QR पास स्कॅन करा' : "Scan Mother's MCP Pass"}
      />

      {/* One-time visit code: the mother confirms it, which makes the visit "mother-confirmed" */}
      {showVisitCode && profile && (
        <VisitConfirmModal
          profile={profile}
          beneficiary={selectedBeneficiary}
          language={language}
          onClose={() => setShowVisitCode(false)}
          onConfirmed={b => onLogVisit(b, 'VISIT_CONFIRMED', true, true)}
        />
      )}

      {/* Selected mother's unique MCP pass QR (for mothers without the app) */}
      {showPassQr && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-3 text-center border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black truncate">{selectedBeneficiary.name}</h3>
              <button
                type="button"
                onClick={() => setShowPassQr(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white p-3 rounded-2xl inline-flex">
              <HealthPassQr beneficiary={selectedBeneficiary} className="w-52 h-52" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">RCH: {selectedBeneficiary.rchId}</p>
          </div>
        </div>
      )}
    </div>
  );
};
