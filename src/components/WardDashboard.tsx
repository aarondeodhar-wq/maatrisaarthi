import React, { useState } from 'react';
import { Beneficiary, Language } from '../types';
import { computeKAnonymizedWardMetrics, computeSubCentreSummaries, formatPercent, formatSuppressedCount } from '../core/dpdpCompliance';
import { AshaSupervisionPanel } from './AshaSupervisionPanel';
import { ModelEvidencePanel } from './ModelEvidencePanel';
import { exportWardReportToWordDoc } from '../core/wordExportService';
import { 
  BarChart3, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Activity, 
  HeartHandshake, 
  Truck, 
  Pill, 
  CheckCircle2, 
  Building2,
  Lock,
  Laptop,
  FileDown,
  MapPin,
  Heart,
  PhoneCall,
  ChevronDown
} from 'lucide-react';

interface WardDashboardProps {
  beneficiaries: Beneficiary[];
  language: Language;
}


export const WardDashboard: React.FC<WardDashboardProps> = ({ beneficiaries, language }) => {
  const [selectedWard, setSelectedWard] = useState<string>('ALL_WARDS');
  // Wards come from the registered mothers, not a fixed list
  const wardNames = ['ALL_WARDS', ...Array.from(new Set(beneficiaries.map(b => b.ward).filter(Boolean))).sort()];

  const metrics = computeKAnonymizedWardMetrics(selectedWard, beneficiaries);
  const subCentres = computeSubCentreSummaries(
    beneficiaries.filter(b => b.ward === selectedWard || selectedWard === 'ALL_WARDS')
  );
  const totalAshas = new Set(beneficiaries.map(b => b.assignedAsha?.name).filter(Boolean)).size;

  // Status for an indicator: N/A when unavailable, otherwise compare with the target
  const statusFor = (value: number | null, ok: (v: number) => boolean, critical?: (v: number) => boolean) =>
    value === null ? 'N/A' : critical && critical(value) ? 'CRITICAL' : ok(value) ? 'GOOD' : 'WARN';

  const indicatorCards = [
    {
      id: 1,
      title: { mr: '१. सुरुवातीची ANC नोंदणी (<१२ आठवडे)', hi: '1. प्रारंभिक ANC पंजीकरण (<12 सप्ताह)', en: '1. Early ANC Registration (< 12 Weeks)' },
      value: formatPercent(metrics.earlyRegistrationPercent),
      target: 'Target: > 90%',
      status: statusFor(metrics.earlyRegistrationPercent, v => v >= 90),
      desc: 'First contact in 1st trimester ensures early risk detection'
    },
    {
      id: 2,
      title: { mr: '२. ४+ ANC तपासणी पूर्णता दर', hi: '2. 4+ ANC जांच पूर्णता दर', en: '2. 4+ ANC Visit Completion Rate' },
      value: formatPercent(metrics.anc4CompletionPercent),
      target: 'Target: > 80%',
      status: statusFor(metrics.anc4CompletionPercent, v => v >= 80),
      desc: 'WHO minimum standard for maternal mortality reduction'
    },
    {
      id: 3,
      title: { mr: '३. उच्च जोखीम माता शोध व ट्रॅकिंग', hi: '3. उच्च जोखिम गर्भवती पहचान व ट्रैकिंग', en: '3. High-Risk Pregnancy (HRP) Tracking' },
      value: formatPercent(metrics.highRiskDetectionPercent),
      target: 'Benchmark: 15-20%',
      status: statusFor(metrics.highRiskDetectionPercent, () => true),
      desc: 'Percentage of maternal cohort receiving enhanced clinical tracking'
    },
    {
      id: 4,
      title: { mr: '४. तीव्र ॲनिमिया प्रमाण (Hb < ७ g/dL)', hi: '4. गंभीर एनीमिया दर (Hb < 7 g/dL)', en: '4. Severe Anemia Prevalence (Hb < 7)' },
      value: formatPercent(metrics.severeAnemiaPercent),
      target: 'Target: < 2.0%',
      status: statusFor(metrics.severeAnemiaPercent, v => v < 2, v => v > 5),
      desc: 'Primary clinical indicator for IV Iron Sucrose & blood readiness'
    },
    {
      id: 5,
      title: { mr: '५. गर्भास्थ उच्च रक्तदाब तपासणी दर', hi: '5. गर्भावधि उच्च रक्तचाप जांच दर', en: '5. Gestational Hypertension (BP >= 140/90)' },
      value: formatPercent(metrics.gestationalHypertensionPercent),
      target: 'Share of latest readings',
      status: statusFor(metrics.gestationalHypertensionPercent, () => true),
      desc: 'Mothers whose latest recorded BP is >= 140/90 mmHg'
    },
    {
      id: 6,
      title: { mr: '६. गर्भधारणेतील मधुमेह (GDM) तपासणी', hi: '6. जेस्टेशनल डायबिटीज जांच दर', en: '6. Possible GDM (Blood Sugar >= 140)' },
      value: formatPercent(metrics.gestationalDiabetesPercent),
      target: 'Share of latest readings',
      status: statusFor(metrics.gestationalDiabetesPercent, () => true),
      desc: 'Mothers whose latest random blood sugar is >= 140 mg/dL (needs OGTT confirmation)'
    },
    {
      id: 7,
      title: { mr: '७. सोनोग्राफी (TIFFA / USG) स्कॅन व्याप्ती', hi: '7. सोनोग्राफी (TIFFA Scan) कवरेज', en: '7. Ultrasound (TIFFA Scan) Coverage' },
      value: formatPercent(metrics.ultrasoundScanCoveragePercent),
      target: 'Not collected yet',
      status: statusFor(metrics.ultrasoundScanCoveragePercent, v => v >= 85),
      desc: '20-week anomaly detection & dating ultrasound compliance'
    },
    {
      id: 8,
      title: { mr: '८. संस्थागत प्रसूती पूर्वतयारी व १०८ जोडणी', hi: '8. संस्थागत प्रसव तैयारी व 108 जुड़ाव', en: '8. Institutional Delivery Preparedness' },
      value: formatPercent(metrics.institutionalDeliveryPlanPercent),
      target: 'Not collected yet',
      status: statusFor(metrics.institutionalDeliveryPlanPercent, v => v >= 100),
      desc: 'Hospital birth plan, blood donor tagging & 108 ambulance link'
    }
  ];

  return (
    <div id="tour-ward-dashboard" className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 font-sans">
      {/* Top Executive Header */}
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
              <Laptop className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Public Health Administration & MCH Ward Executive Command Center
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-black px-3 py-1 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Aggregate-only (groups &lt; {metrics.kThreshold} withheld)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 border border-white/20">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                {language === 'mr' ? 'प्रभाग व सार्वजनिक आरोग्य प्रशासन डॅशबोर्ड' : 'Ward & District MCH Public Health Command'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                Aggregates computed from the records in this app. Groups smaller than {metrics.kThreshold} are withheld.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Ward Report to Word */}
            <button
              id="tour-ward-export"
              type="button"
              onClick={() => exportWardReportToWordDoc(selectedWard, metrics)}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer border border-white/20 transition hover:scale-105 active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span>{language === 'mr' ? '📄 प्रभाग अहवाल (.doc)' : '📄 Export Ward Report (.doc)'}</span>
            </button>

            {/* Ward Filter */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-300 dark:border-white/15 shadow-xs">
                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <select
                  value={selectedWard}
                  onChange={e => setSelectedWard(e.target.value)}
                  className="text-xs font-black text-slate-950 dark:text-white bg-transparent cursor-pointer outline-none pr-4"
                >
                  {wardNames.map((w, idx) => (
                    <option key={idx} value={w} className="bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold">
                      {w === 'ALL_WARDS' ? 'All PHC Wards Combined (सर्व प्रभाग)' : w}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 pointer-events-none -ml-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Overview Counters */}
      {metrics.suppressed && (
        <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 text-xs font-bold text-amber-900 dark:text-amber-200">
          Fewer than {metrics.kThreshold} mothers in this selection. All figures are withheld to protect privacy.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="silky-glass p-4 sm:p-5 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-bold mb-1">
            <span>Total Cohort</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white font-mono">{formatSuppressedCount(metrics.totalPregnantMothers, metrics.kThreshold)}</span>
          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium block mt-0.5">Active Mothers Monitored</span>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/20 p-4 sm:p-5 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-900 dark:text-rose-300 font-black mb-1">
            <span>🔴 High-Risk (HRP)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400 font-mono">{formatSuppressedCount(metrics.highRiskCount, metrics.kThreshold)}</span>
          <span className="text-[10px] text-rose-800/80 dark:text-rose-300/80 font-bold block mt-0.5">Under Specialist Care</span>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 sm:p-5 rounded-3xl shadow-xl border border-amber-200 dark:border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-900 dark:text-amber-300 font-black mb-1">
            <span>🟡 Moderate Watch</span>
            <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 font-mono">{formatSuppressedCount(metrics.moderateRiskCount, metrics.kThreshold)}</span>
          <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-bold block mt-0.5">PMSMA 9th Eligible</span>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 sm:p-5 rounded-3xl shadow-xl border border-emerald-200 dark:border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300 font-black mb-1">
            <span>🟢 Routine (Safe)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{formatSuppressedCount(metrics.normalRiskCount, metrics.kThreshold)}</span>
          <span className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 font-bold block mt-0.5">Safe Delivery Pathway</span>
        </div>
      </div>

      {/* Sub-Centre Health Post Matrix */}
      <div id="tour-ward-matrix" className="silky-glass rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/15 space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3 gap-2">
          <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Sub-Centre & Village Health Post Operational Matrix</span>
          </h3>
          <span className="text-xs text-teal-900 dark:text-teal-300 font-black bg-teal-100 dark:bg-teal-950/80 px-3 py-1 rounded-full border border-teal-300 dark:border-teal-500/30">
            {subCentres.length} {subCentres.length === 1 ? 'village group' : 'village groups'} • {totalAshas} ASHA {totalAshas === 1 ? 'worker' : 'workers'} on record
          </span>
        </div>

        {/* Responsive Table Container with Min Width for Pristine Rendering */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs border-collapse min-w-[580px] bg-white dark:bg-slate-900">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950/80 text-slate-800 dark:text-slate-300 font-black text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                <th className="p-3.5">Village</th>
                <th className="p-3.5">Monitored Mothers</th>
                <th className="p-3.5">High Risk (🔴)</th>
                <th className="p-3.5">ANC-4 Rate</th>
                <th className="p-3.5">ASHA Force</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-slate-900 dark:text-slate-200 font-medium">
              {subCentres.map((sc, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                  <td className="p-3.5 font-black text-slate-950 dark:text-white flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <span>{sc.name}</span>
                  </td>
                  <td className="p-3.5 font-mono font-black text-slate-900 dark:text-slate-200 text-xs">
                    {formatSuppressedCount(sc.mothers)}
                  </td>
                  <td className="p-3.5">
                    {sc.highRisk > 0 ? (
                      <span className="font-black text-rose-800 dark:text-rose-300 font-mono bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 px-2.5 py-1 rounded-xl text-xs inline-flex items-center gap-1 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                        {formatSuppressedCount(sc.highRisk)} High risk
                      </span>
                    ) : (
                      <span className="font-bold text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-xl text-xs">
                        0 High risk
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-mono font-black text-teal-800 dark:text-teal-300 text-xs">
                    {formatPercent(sc.anc4Percent)}
                  </td>
                  <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {sc.ashaCount}
                  </td>
                  <td className="p-3.5 text-right">
                    <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 px-3 py-1 rounded-full text-[10px] font-black inline-block shadow-xs">
                      {sc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8 STANDARD MCH INDICATOR TILES */}
      <div id="tour-ward-indicators" className="space-y-3">
        <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center justify-between">
          <span>8 Standard Maternal & Child Health (MCH) Indicators (GoI Protocol)</span>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Computed from records in this app</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {indicatorCards.map(card => (
            <div
              key={card.id}
              className="silky-glass p-4 sm:p-5 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 hover:border-teal-500/40 transition space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-black text-slate-950 dark:text-white leading-tight">
                  {card.title[language]}
                </h4>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                  card.status === 'GOOD' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30' :
                  card.status === 'CRITICAL' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-400/30 animate-pulse' :
                  'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30'
                }`}>
                  {card.status}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white font-mono">{card.value}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">{card.target}</span>
              </div>

              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight pt-1.5 border-t border-slate-200/80 dark:border-white/10 font-medium">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Resource & Logistics Forecasting Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* IFA & Calcium Medicine Inventory */}
        <div className="silky-glass p-5 sm:p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>IFA & Calcium Supply Buffer (औषध साठा)</span>
            </h4>
            <span className="text-xs font-mono font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-xl">
              Not tracked
            </span>
          </div>

          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
            No medicine stock feed is connected, so IFA and calcium stock levels are not available here.
          </p>
        </div>

        {/* ASHA field supervision: visits, GPS distance, unscanned edits, overdue ANC */}
        <AshaSupervisionPanel beneficiaries={beneficiaries} />
        <ModelEvidencePanel />

        {/* 108 Emergency Ambulance Readiness */}
        <div className="silky-glass p-5 sm:p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>108 Emergency Ambulance Dispatches (१०८ आपत्कालीन)</span>
            </h4>
            <span className="text-xs font-mono font-black text-rose-900 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/30 px-3 py-1 rounded-xl">
              Not tracked
            </span>
          </div>

          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
            108 dispatches are not integrated with this app, so transfer counts are not available here.
          </p>
        </div>
      </div>
    </div>
  );
};
