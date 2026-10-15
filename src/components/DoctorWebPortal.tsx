import React, { useState } from 'react';
import { Beneficiary, Language, DoctorPrescription, RiskTier } from '../types';
import { exportBeneficiaryToWordDoc } from '../core/wordExportService';
import { toLocalDateString } from '../core/protocolEngine';
import { sendFreeWhatsAppAlert, sendFreeSmsAlert, describeAlertOutcome } from '../core/freeAlertsService';
import { LiveCameraScannerModal } from './LiveCameraScannerModal';
import {
  evaluatePregnancyFactors,
  PRE_EXISTING_CONDITIONS,
  CONCEPTION_EVENTS,
  PRIOR_COMPLICATIONS
} from '../core/pregnancyRisk';
import { 
  Stethoscope, 
  QrCode, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Send, 
  PhoneCall, 
  Calendar, 
  User, 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  Clock, 
  Lock, 
  Unlock, 
  Volume2,
  Building2,
  ChevronRight,
  TrendingUp,
  Award,
  Laptop,
  Maximize2,
  FileDown,
  Baby,
  HeartPulse,
  Info
} from 'lucide-react';

interface DoctorWebPortalProps {
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary;
  onSelectBeneficiary: (b: Beneficiary) => void;
  language: Language;
  onIssuePrescription: (beneficiaryId: string, rx: DoctorPrescription) => void;
  onDispatchNotification: (beneficiaryId: string, templateType: any, channel: 'SMS' | 'WHATSAPP') => void;
  // Signed-in doctor (used on prescriptions and in the header)
  doctorId?: string;
  doctorName?: string;
  facility?: string;
}

export const DoctorWebPortal: React.FC<DoctorWebPortalProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  language,
  onIssuePrescription,
  onDispatchNotification,
  doctorId = '',
  doctorName = 'Medical Officer',
  facility = 'PHC'
}) => {
  const [queueSearch, setQueueSearch] = useState('');
  const riskOrder: Record<string, number> = { RED: 0, YELLOW: 1, GREEN: 2 };
  const queue = beneficiaries
    .filter(b => {
      const q = queueSearch.trim().toLowerCase();
      return !q || b.name.toLowerCase().includes(q) || b.rchId.toLowerCase().includes(q) || b.village.toLowerCase().includes(q);
    })
    .sort((a, b) => (riskOrder[a.currentRiskTier] ?? 3) - (riskOrder[b.currentRiskTier] ?? 3));
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [scanSimulating, setScanSimulating] = useState(false);
  const [patientConsentGranted, setPatientConsentGranted] = useState(true);
  const [showConsentPrompt, setShowConsentPrompt] = useState(false);

  // e-Prescription Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedMedPreset, setSelectedMedPreset] = useState<'IV_IRON' | 'LABETALOL_HTN' | 'ROUTINE_IFA' | 'INSULIN_GDM' | 'CUSTOM'>('ROUTINE_IFA');
  const [referralRequired, setReferralRequired] = useState(false);
  const [referralFacility, setReferralFacility] = useState('Sub-District Hospital Shirur (FRU)');
  const [pmsmaDate, setPmsmaDate] = useState('2026-09-09');
  const [rxSuccessNotice, setRxSuccessNotice] = useState(false);
  const [rxAlertOutcome, setRxAlertOutcome] = useState<string | null>(null);

  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // High Risk Priority Queue
  const highRiskQueue = beneficiaries.filter(b => b.currentRiskTier === 'RED');

  // Obstetric & Preterm Risk Evaluation
  const pregnancyEval = evaluatePregnancyFactors({
    gestationalWeeks: selectedBeneficiary.currentGestationalWeeks,
    pregnancy: selectedBeneficiary.pregnancy
  });
  const pregProfile = selectedBeneficiary.pregnancy;

  const handleScanQRSimulate = (b: Beneficiary) => {
    setScanSimulating(true);
    setTimeout(() => {
      setScanSimulating(false);
      setShowConsentPrompt(true);
    }, 700);
  };

  const handleGrantConsent = () => {
    setPatientConsentGranted(true);
    setShowConsentPrompt(false);
    setQrModalOpen(false);
  };

  const handleApplyPreset = (preset: typeof selectedMedPreset) => {
    setSelectedMedPreset(preset);
    if (preset === 'IV_IRON') {
      setDiagnosis('Severe Nutritional Anemia in Pregnancy (Hb < 7.0 g/dL)');
      setSpecialInstructions('Administer IV Iron Sucrose 100mg in 100ml Normal Saline on alternate days for 3 doses at Sub-District Hospital under observation. Repeat Hb in 14 days.');
      setReferralRequired(true);
      setReferralFacility('Sub-District Hospital Shirur (FRU)');
    } else if (preset === 'LABETALOL_HTN') {
      setDiagnosis('Gestational Hypertension / Impending Pre-eclampsia');
      setSpecialInstructions('Tab Labetalol 100mg twice daily after meals. Daily BP charting by ASHA. Immediate 108 transfer if BP > 150/100 or severe headache occurs.');
      setReferralRequired(true);
      setReferralFacility('Sassoon General Hospital Pune (NICU Ready)');
    } else if (preset === 'INSULIN_GDM') {
      setDiagnosis('Gestational Diabetes Mellitus (Uncontrolled Hyperglycemia)');
      setSpecialInstructions('Human Mixtard Insulin 10 units SC morning, 6 units night before food. Strict fasting and post-prandial glucose log.');
      setReferralRequired(true);
      setReferralFacility('Government Medical College & Hospital');
    } else {
      setDiagnosis('Routine Antenatal Care Supplementation & Prophylaxis');
      setSpecialInstructions('Daily 1 IFA tablet (100mg elemental iron + 500mcg folic acid) after lunch. 1 Calcium tablet (500mg) after dinner. Adequate hydration.');
      setReferralRequired(false);
    }
  };

  const handleSubmitPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    const newRx: DoctorPrescription = {
      id: 'rx_' + Math.random().toString(36).substring(2, 9),
      date: toLocalDateString(),
      doctorId,
      doctorName,
      facility,
      diagnosis: diagnosis || 'Clinical Review & ANC Management',
      medications: selectedMedPreset === 'IV_IRON' ? [
        { name: 'IV Iron Sucrose 100mg in 100ml NS', dosage: 'Alternate days x 3 doses', durationDays: 6 },
        { name: 'Tab Calcium Carbonate 500mg', dosage: '1 tab daily after lunch', durationDays: 30 }
      ] : selectedMedPreset === 'LABETALOL_HTN' ? [
        { name: 'Tab Labetalol 100mg', dosage: '1 tablet twice daily', durationDays: 14 },
        { name: 'Calcium Carbonate 500mg', dosage: '1 tablet daily', durationDays: 30 }
      ] : [
        { name: 'IFA (Iron Folic Acid) 100mg Red Tablet', dosage: '1 tablet daily after lunch', durationDays: 60 },
        { name: 'Calcium Carbonate 500mg', dosage: '1 tablet daily after dinner', durationDays: 60 }
      ],
      specialInstructions,
      referral: referralRequired ? {
        required: true,
        referralFacility,
        reason: diagnosis,
        urgency: selectedBeneficiary.currentRiskTier === 'RED' ? 'URGENT' : 'ROUTINE'
      } : undefined,
      pmsmaNextSlotDate: pmsmaDate
    };

    onIssuePrescription(selectedBeneficiary.id, newRx);
    setRxSuccessNotice(true);
    setTimeout(() => setRxSuccessNotice(false), 4000);

    onDispatchNotification(selectedBeneficiary.id, 'HIGH_RISK_ALERT', 'SMS');
  };

  return (
    <div id="tour-doctor-portal" className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 font-sans">
      {/* macOS Window Header Chrome */}
      <div className="silky-glass rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden border border-slate-200 dark:border-white/15">
        {/* Window Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="macos-traffic-light">
              <span className="macos-dot-red" />
              <span className="macos-dot-yellow" />
              <span className="macos-dot-green" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-blue-500" />
              Medical Officer Station • {facility}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-full shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>DPDP 2023 Verified</span>
          </div>
        </div>

        {/* Doctor Banner Info */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                  {doctorName}
                </h2>
                <span className="text-[11px] bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-400/30 font-black px-2.5 py-0.5 rounded-full">
                  PHC Medical Officer
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                {facility}
              </p>
            </div>
          </div>

          {/* Action Controls: Live Patient QR Scanner */}
          <div className="flex items-center gap-3">
            <button
              id="tour-doctor-scan"
              onClick={() => setQrModalOpen(true)}
              className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black py-3 px-5 rounded-2xl shadow-xl shadow-rose-600/30 border border-white/25 transition cursor-pointer flex items-center gap-2 text-xs sm:text-sm"
            >
              <QrCode className="w-4 h-4 animate-pulse" />
              <span>{language === 'mr' ? '📷 मातेचा QR कोड स्कॅन करा' : '📷 Scan Patient QR Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Triage Queue & Right Clinical Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: HIGH RISK TRIAGE PRIORITY INBOX (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 self-start">
          <div id="tour-doctor-queue" className="silky-glass rounded-3xl p-5 shadow-xl space-y-3 border border-slate-200 dark:border-white/15">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <h3 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>{language === 'mr' ? 'उच्च जोखीम प्राधान्य यादी' : 'High-Risk Priority Queue'}</span>
              </h3>
              <span className="text-xs bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-400/30 font-black px-2.5 py-0.5 rounded-full">
                {highRiskQueue.length} {language === 'mr' ? 'धोकादायक' : 'Critical'}
              </span>
            </div>

            <input
              type="search"
              value={queueSearch}
              onChange={e => setQueueSearch(e.target.value)}
              placeholder={language === 'mr' ? 'नाव, RCH किंवा गाव शोधा' : language === 'hi' ? 'नाम, RCH या गाँव खोजें' : 'Search name, RCH ID or village'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
            />

            {/* Queue List (highest risk first) */}
            <div className="space-y-2.5 max-h-[calc(100vh-16rem)] min-h-[200px] overflow-y-auto pr-1">
              {queue.length === 0 && (
                <p className="text-xs font-bold text-slate-500 text-center py-6">No mothers match your search.</p>
              )}
              {queue.map(b => {
                const isSelected = b.id === selectedBeneficiary.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => onSelectBeneficiary(b)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-100 dark:bg-rose-500/25 shadow-md ring-2 ring-rose-500'
                        : b.currentRiskTier === 'RED'
                        ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/90 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                        : b.currentRiskTier === 'YELLOW'
                        ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                        : 'border-emerald-200 dark:border-white/10 bg-emerald-50/50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            b.currentRiskTier === 'RED' ? 'bg-rose-500 animate-ping' : b.currentRiskTier === 'YELLOW' ? 'bg-amber-400' : 'bg-emerald-400'
                          }`} />
                          <h4 className={`text-xs font-black ${isSelected ? 'text-rose-950 dark:text-white' : 'text-slate-950 dark:text-white'}`}>{b.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-bold">
                          RCH: {b.rchId} • {b.village} • {b.currentGestationalWeeks} wks
                        </p>
                      </div>

                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        b.currentRiskTier === 'RED' ? 'bg-rose-600 text-white shadow-xs' :
                        b.currentRiskTier === 'YELLOW' ? 'bg-amber-500 text-slate-950' :
                        'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30'
                      }`}>
                        {b.currentRiskTier}
                      </span>
                    </div>

                    {/* Vitals Summary Pills */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-lg font-mono font-bold border ${
                        (b.vitalsHistory[0]?.hemoglobin ?? 99) < 7 ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-white/10'
                      }`}>
                        Hb: {b.vitalsHistory[0]?.hemoglobin || '--'} g/dL
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg font-mono font-bold border ${
                        b.vitalsHistory[0]?.systolicBP >= 140 ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-white/10'
                      }`}>
                        BP: {b.vitalsHistory[0]?.systolicBP || '--'}/{b.vitalsHistory[0]?.diastolicBP || '--'}
                      </span>
                      {b.hasPrevCesarean && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30 rounded-lg font-bold">
                          Prev C-Sec
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLINICAL DOSSIER & e-PRESCRIPTION (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Patient Overview Dossier Banner */}
          <div className={`p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden ${
            selectedBeneficiary.currentRiskTier === 'RED'
              ? 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 dark:from-rose-900 dark:via-red-950 dark:to-slate-900 border border-rose-400/30'
              : selectedBeneficiary.currentRiskTier === 'YELLOW'
              ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 dark:from-amber-900 dark:via-amber-950 dark:to-slate-900 border border-amber-400/30'
              : 'bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 dark:from-teal-900 dark:via-slate-900 dark:to-slate-950 border border-teal-400/30'
          }`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-2xl font-black tracking-tight">{selectedBeneficiary.name}</h3>
                  <span className="text-xs bg-black/40 border border-white/20 px-3 py-1 rounded-full font-mono text-white font-bold">
                    RCH: {selectedBeneficiary.rchId}
                  </span>
                </div>
                <p className="text-xs text-white/90 font-medium mt-1">
                  {selectedBeneficiary.age} yrs • Gravida {selectedBeneficiary.gravidity}, Para {selectedBeneficiary.parity} • Blood Group <strong className="text-white font-black">{selectedBeneficiary.bloodGroup}</strong> • ASHA: {selectedBeneficiary.assignedAsha.name}
                </p>

                {/* Download Word Document Action */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => exportBeneficiaryToWordDoc(selectedBeneficiary)}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition hover:bg-slate-100"
                  >
                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                    <span>{language === 'mr' ? '📄 वर्ड दस्तऐवज डाउनलोड (.doc)' : language === 'hi' ? '📄 वर्ड डॉक्यूमेंट डाउनलोड (.doc)' : '📄 Download Clinical Word Doc (.doc)'}</span>
                  </button>
                </div>
              </div>

              <div className="text-right bg-black/40 border border-white/15 p-3 rounded-2xl backdrop-blur-md">
                <span className="text-[10px] text-slate-200 uppercase font-bold tracking-wider block">{language === 'mr' ? 'गर्भधारणा आठवडे:' : 'Gestational Age:'}</span>
                <span className="text-3xl font-black text-white font-mono">{selectedBeneficiary.currentGestationalWeeks} wks</span>
                <span className="text-[10px] block text-slate-200 font-semibold mt-0.5">EDD: {selectedBeneficiary.edd}</span>
              </div>
            </div>

            {/* Risk Factor Breakdown */}
            {selectedBeneficiary.riskFactors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <span className="text-[10px] uppercase font-black tracking-wider text-white block mb-1.5">
                  🚨 {language === 'mr' ? 'धोकादायक घटक (High-Risk Biomarkers):' : 'Identified High-Risk Factors:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedBeneficiary.riskFactors.map((r, i) => (
                    <span key={i} className="text-xs bg-white/20 border border-white/30 px-3 py-1 rounded-xl font-bold backdrop-blur-xs text-white">
                      • {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OBSTETRIC & FETAL RISK DOSSIER (Multiple pregnancy, presentation, growth, pre-existing diseases, preterm risk) */}
          <div className="silky-glass rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-white/15 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-pink-500" />
                <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
                  {language === 'mr' ? 'गर्भस्थिती व अकाली प्रसूती जोखीम (Obstetric & Preterm Dossier)' : 'Obstetric, Fetal & Preterm Risk Dossier'}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-3 py-1 rounded-full ${
                  pregnancyEval.pretermRisk.level === 'HIGH' ? 'bg-rose-600 text-white shadow-xs animate-pulse' :
                  pregnancyEval.pretermRisk.level === 'MODERATE' ? 'bg-amber-500 text-slate-950 font-black' :
                  'bg-emerald-600 text-white'
                }`}>
                  Preterm Risk: {pregnancyEval.pretermRisk.level}
                </span>
                <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-300">
                  {selectedBeneficiary.currentGestationalWeeks} wks
                </span>
              </div>
            </div>

            {/* Preterm Labor Definition & Clinical Risk Callout */}
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-black text-indigo-950 dark:text-indigo-200">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Preterm Labor Definition & Evaluation (&lt; 37 Weeks):</span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                <strong>Preterm labor:</strong> Labor that starts before 37 completed weeks of pregnancy. <strong>Preterm-labor risk:</strong> Clinical factors suggesting a pregnant woman has an elevated probability of early delivery.
              </p>
              {pregnancyEval.pretermRisk.reasons.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pregnancyEval.pretermRisk.reasons.map((r, i) => (
                    <span key={i} className="text-[10px] font-black bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 px-2.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/30">
                      ⚠️ {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">No preterm labor risk factors detected.</p>
              )}
            </div>

            {/* 3 Key Obstetric Metrics: Multiple pregnancy, Presentation, Growth */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Fetus Count</span>
                <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  {pregProfile?.fetusCount === 2 ? '♊ Twins (Multiple Pregnancy)' :
                   pregProfile?.fetusCount === 3 ? 'Triplets or more' :
                   'Singleton (1 Baby)'}
                </div>
                {pregProfile?.fetusCount && pregProfile.fetusCount > 1 && (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">Higher preterm & growth risk</span>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Fetal Presentation (Placement)</span>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {pregProfile?.presentation === 'CEPHALIC' ? 'Head Down (Cephalic - Normal)' :
                   pregProfile?.presentation === 'BREECH' ? 'Breech (Bottom Down)' :
                   pregProfile?.presentation === 'TRANSVERSE' ? 'Transverse Lie (Across)' :
                   'Not Checked / Unknown'}
                </div>
                {selectedBeneficiary.currentGestationalWeeks >= 36 && (pregProfile?.presentation === 'BREECH' || pregProfile?.presentation === 'TRANSVERSE') && (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">Delivery referral indicated</span>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Fetal Growth</span>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {pregProfile?.growth === 'SMALL_FOR_DATES' ? 'Small for Dates (IUGR Risk)' :
                   pregProfile?.growth === 'LARGE_FOR_DATES' ? 'Large for Dates (Macrosomia)' :
                   pregProfile?.growth === 'NORMAL' ? 'Normal for Dates' :
                   'Not Checked / Unknown'}
                </div>
                {pregProfile?.growth === 'SMALL_FOR_DATES' && (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">Doppler & specialist review needed</span>
                )}
              </div>
            </div>

            {/* Active Pre-Existing Conditions, Conception Events, & Past Complications */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Pre-Existing Conditions */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                  Pre-Existing Diseases ({pregProfile?.conditions?.length || 0})
                </span>
                {(!pregProfile?.conditions || pregProfile.conditions.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic">None recorded</p>
                ) : (
                  <div className="space-y-1">
                    {pregProfile.conditions.map(id => {
                      const def = PRE_EXISTING_CONDITIONS.find(c => c.id === id);
                      return (
                        <div key={id} className="p-1.5 rounded-lg bg-white dark:bg-black/40 border border-slate-200/80 dark:border-white/10 text-[11px]">
                          <span className="font-black text-rose-700 dark:text-rose-300">{def?.label || id}</span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{def?.babyEffect}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Conception Events */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                  Conception Events ({pregProfile?.conceptionEvents?.length || 0})
                </span>
                {(!pregProfile?.conceptionEvents || pregProfile.conceptionEvents.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic">None recorded</p>
                ) : (
                  <div className="space-y-1">
                    {pregProfile.conceptionEvents.map(id => {
                      const def = CONCEPTION_EVENTS.find(c => c.id === id);
                      return (
                        <div key={id} className="p-1.5 rounded-lg bg-white dark:bg-black/40 border border-slate-200/80 dark:border-white/10 text-[11px]">
                          <span className="font-black text-amber-700 dark:text-amber-300">{def?.label || id}</span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{def?.babyEffect}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past Pregnancy Complications */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                  Past Complications ({pregProfile?.priorComplications?.length || 0})
                </span>
                {(!pregProfile?.priorComplications || pregProfile.priorComplications.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic">None recorded</p>
                ) : (
                  <div className="space-y-1">
                    {pregProfile.priorComplications.map(id => {
                      const def = PRIOR_COMPLICATIONS.find(c => c.id === id);
                      return (
                        <div key={id} className="p-1.5 rounded-lg bg-white dark:bg-black/40 border border-slate-200/80 dark:border-white/10 text-[11px]">
                          <span className="font-black text-rose-700 dark:text-rose-300">{def?.label || id}</span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{def?.babyEffect}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Explainable AI Trace */}
            {pregnancyEval.explainability.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-teal-500" />
                  <span>Explainable AI Risk Rationale:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {pregnancyEval.explainability.map((e, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] flex justify-between gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{e.reason[language] || e.reason.en}</span>
                      <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">+{Math.round(e.impactScore)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Vitals History & Audio Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vitals History Timeline */}
            <div className="silky-glass rounded-3xl p-5 shadow-xl space-y-3 border border-slate-200 dark:border-white/15">
              <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/80 dark:border-white/10 pb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>{language === 'mr' ? 'तपासणी इतिहास (Vitals Progression)' : 'Vitals History & Trajectory'}</span>
              </h4>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {selectedBeneficiary.vitalsHistory.map((v, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-xs space-y-1">
                    <div className="flex justify-between font-black text-slate-950 dark:text-white">
                      <span>{v.date} ({v.gestationalWeek} wks)</span>
                      <span className={(v.hemoglobin ?? 99) < 7 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-800 dark:text-slate-200'}>
                        Hb: {v.hemoglobin ?? 'not measured'}{v.hemoglobin !== undefined ? ' g/dL' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                      <span>BP: {v.systolicBP}/{v.diastolicBP} mmHg</span>
                      <span>Sugar: {v.bloodSugar !== undefined ? `${v.bloodSugar} mg/dL` : 'not measured'}</span>
                      <span>Weight: {v.weightKg !== undefined ? `${v.weightKg} kg` : 'not measured'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ASHA Audio Notes Player */}
            <div className="silky-glass rounded-3xl p-5 shadow-xl space-y-3 border border-slate-200 dark:border-white/15">
              <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/80 dark:border-white/10 pb-2">
                <Volume2 className="w-4 h-4 text-amber-500" />
                <span>{language === 'mr' ? 'आशा व्हॉईस नोट्स (Audio Field Memos)' : 'ASHA Field Audio Memos'}</span>
              </h4>

              {selectedBeneficiary.audioNotes.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-8 text-center font-medium">
                  {language === 'mr' ? 'कोणतीही व्हॉईस नोट नाही' : 'No audio memos recorded for this patient'}
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedBeneficiary.audioNotes.map((note, idx) => (
                    <div key={idx} className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-500/30 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-950 dark:text-amber-200">{note.title}</span>
                        <span className="text-[10px] text-amber-800 dark:text-slate-400 font-bold">{note.durationSec} sec</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 text-[11px] italic bg-white dark:bg-black/30 p-2.5 rounded-xl border border-amber-200/80 dark:border-white/10 font-medium leading-relaxed">
                        "{note.transcript[language] || note.transcript.mr}"
                      </p>
                      <button
                        onClick={() => setPlayingAudioId(playingAudioId === note.id ? null : note.id)}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{playingAudioId === note.id ? 'Playing memo...' : 'Play Voice Memo'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* e-Prescription & PMSMA Referral Generator */}
          <form id="tour-doctor-rx" onSubmit={handleSubmitPrescription} className="silky-glass rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-white/15">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span>{language === 'mr' ? 'डिजिटल औषध चिठ्ठी व संदर्भ (e-Prescription & Referral)' : 'Issue Digital e-Prescription & Referral'}</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  Directly synced with Mother's app & dispatches Marathi/Hindi SMS
                </p>
              </div>

              {rxSuccessNotice && (
                <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/40 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Prescription Saved
                </span>
              )}
              {rxAlertOutcome && (
                <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-400/40 text-xs font-bold px-3 py-1 rounded-full">
                  {rxAlertOutcome}
                </span>
              )}
            </div>

            {/* Presets Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 dark:text-slate-300">
                ⚡ {language === 'mr' ? 'क्लिनिकल प्रीसेट्स (1-क्लिक औषधोपचार):' : 'Instant Clinical Presets:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('IV_IRON')}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer text-left ${
                    selectedMedPreset === 'IV_IRON'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  🩸 IV Iron (Hb &lt; 7)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('LABETALOL_HTN')}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer text-left ${
                    selectedMedPreset === 'LABETALOL_HTN'
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  💓 Labetalol (BP &ge; 140)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('INSULIN_GDM')}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer text-left ${
                    selectedMedPreset === 'INSULIN_GDM'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  🍬 Insulin Protocol (GDM)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('ROUTINE_IFA')}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer text-left ${
                    selectedMedPreset === 'ROUTINE_IFA'
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-teal-500 shadow-lg'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  🟢 Routine IFA + Calcium
                </button>
              </div>
            </div>

            {/* Diagnosis Field */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-300 block mb-1">
                {language === 'mr' ? 'निदान (Diagnosis / Clinical Impression) *' : 'Diagnosis *'}
              </label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="e.g. Severe Nutritional Anemia + Gestational Hypertension"
                className="w-full border border-slate-300 dark:border-white/20 rounded-2xl p-3 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-black/30 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none shadow-inner"
              />
            </div>

            {/* Special Instructions */}
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-300 block mb-1">
                {language === 'mr' ? 'विशेष सूचना व औषध मात्रा (Instructions & Dosage) *' : 'Clinical Instructions & Dosage *'}
              </label>
              <textarea
                rows={3}
                required
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                placeholder="Dosage details, dietary counseling, danger sign alert..."
                className="w-full border border-slate-300 dark:border-white/20 rounded-2xl p-3 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-black/30 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none shadow-inner"
              />
            </div>

            {/* Referral & PMSMA Alignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={referralRequired}
                    onChange={e => setReferralRequired(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <span>🚨 {language === 'mr' ? 'उच्च रुग्णालयात संदर्भ (Hospital Referral)' : 'Hospital Referral Required'}</span>
                </label>

                {referralRequired && (
                  <input
                    type="text"
                    value={referralFacility}
                    onChange={e => setReferralFacility(e.target.value)}
                    className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 text-xs bg-white dark:bg-black/40 text-slate-900 dark:text-white font-bold"
                  />
                )}
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-1">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  📅 {language === 'mr' ? 'PMSMA ९ तारीख तज्ज्ञ तपासणी' : 'PMSMA 9th Specialist Slot'}
                </label>
                <input
                  type="date"
                  value={pmsmaDate}
                  onChange={e => setPmsmaDate(e.target.value)}
                  className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 text-xs bg-white dark:bg-black/40 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            {/* Submit & Real WhatsApp / SMS Dispatch Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black py-3.5 rounded-2xl shadow-xl shadow-rose-600/30 transition cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/20"
              >
                <Send className="w-4 h-4" />
                <span>{language === 'mr' ? 'औषध चिठ्ठी जतन करा (Save Rx)' : 'Save & Issue E-Prescription'}</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const medText = selectedMedPreset === 'IV_IRON' ? 'IV Iron Sucrose 100mg + Calcium 500mg' : selectedMedPreset === 'LABETALOL_HTN' ? 'Tab Labetalol 100mg BD' : selectedMedPreset === 'INSULIN_GDM' ? 'Human Mixtard Insulin SC' : 'Tab IFA Red (100mg Iron) + Tab Calcium 500mg';
                    const text = `🏥 *PHC E-Prescription / औषध चिठ्ठी*\nPatient: ${selectedBeneficiary.name} (RCH: ${selectedBeneficiary.rchId})\nDiagnosis: ${diagnosis || 'Maternal ANC Checkup'}\nRx Medicines: ${medText}\nAdvice: ${specialInstructions || 'Take nutritious food & rest.'}\n- ${doctorName} (${facility})`;
                    const res = await sendFreeWhatsAppAlert({
                      recipientPhone: selectedBeneficiary.phone,
                      recipientName: selectedBeneficiary.name,
                      messageType: 'PRESCRIPTION_DISPATCH',
                      language: language,
                      customText: text,
                      rchId: selectedBeneficiary.rchId
                    });
                    setRxAlertOutcome(describeAlertOutcome(res, selectedBeneficiary.name));
                    setTimeout(() => setRxAlertOutcome(null), 6000);
                  }}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  <span>📱 WhatsApp Rx (gateway)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const medText = selectedMedPreset === 'IV_IRON' ? 'IV Iron Sucrose' : selectedMedPreset === 'LABETALOL_HTN' ? 'Tab Labetalol 100mg' : selectedMedPreset === 'INSULIN_GDM' ? 'Insulin' : 'Tab IFA + Calcium';
                    const text = `PHC Rx for ${selectedBeneficiary.name}: ${diagnosis || 'ANC'}. Meds: ${medText}. Advice: ${specialInstructions || 'Take IFA daily'}. - ${doctorName}`;
                    const res = await sendFreeSmsAlert({
                      recipientPhone: selectedBeneficiary.phone,
                      recipientName: selectedBeneficiary.name,
                      messageType: 'PRESCRIPTION_DISPATCH',
                      language: language,
                      customText: text,
                      rchId: selectedBeneficiary.rchId
                    });
                    setRxAlertOutcome(describeAlertOutcome(res, selectedBeneficiary.name));
                    setTimeout(() => setRxAlertOutcome(null), 6000);
                  }}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  <span>💬 SMS Rx (gateway)</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* REAL CAMERA QR SCANNER MODAL */}
      <LiveCameraScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        language={language}
        beneficiaries={beneficiaries}
        onSelectBeneficiary={(b) => {
          onSelectBeneficiary(b);
          setPatientConsentGranted(true);
        }}
        scannerTitle={language === 'mr' ? 'डॉक्टर रुग्ण QR कॅमेरा स्कॅनर' : 'Doctor OPD Patient QR Scanner'}
      />
    </div>
  );
};
