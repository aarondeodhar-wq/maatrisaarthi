import React, { useState } from 'react';
import { Beneficiary, Language, RiskTier } from '../types';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  PhoneCall, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  ChevronRight, 
  Clock, 
  ShieldCheck, 
  Download, 
  Building2, 
  Sparkles, 
  Laptop,
  Check
} from 'lucide-react';

interface RegistryDueListProps {
  beneficiaries: Beneficiary[];
  selectedBeneficiary: Beneficiary;
  onSelectBeneficiary: (b: Beneficiary) => void;
  language: Language;
  onDispatchReminder: (beneficiaryId: string, channel: 'SMS' | 'WHATSAPP') => void;
}

export const RegistryDueList: React.FC<RegistryDueListProps> = ({
  beneficiaries,
  selectedBeneficiary,
  onSelectBeneficiary,
  language,
  onDispatchReminder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<RiskTier | 'ALL'>('ALL');
  const [selectedDueFilter, setSelectedDueFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY_PMSMA'>('ALL');
  const [scheduleModalBeneficiary, setScheduleModalBeneficiary] = useState<Beneficiary | null>(null);

  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.rchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.phone.includes(searchQuery);

    const matchesRisk = selectedRiskFilter === 'ALL' || b.currentRiskTier === selectedRiskFilter;

    const hasOverdue = b.ancSchedule.some(c => c.status === 'OVERDUE');
    const isPmsmaEligible = b.ancSchedule.some(c => c.isPMSMA);

    const matchesDue = selectedDueFilter === 'ALL' ||
                       (selectedDueFilter === 'OVERDUE' && hasOverdue) ||
                       (selectedDueFilter === 'TODAY_PMSMA' && isPmsmaEligible);

    return matchesSearch && matchesRisk && matchesDue;
  });

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 font-sans">
      {/* Top Banner with Adaptive Light/Dark Glass */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 border border-slate-200 dark:border-teal-500/20 transition">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Maternal Health Master Registry & ANC Due-List Tracker
            </span>
          </div>

          <span className="text-xs bg-pink-100 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border border-pink-300 dark:border-pink-500/30 font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            GoI PMSMA 9th Sync Active
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <ClipboardList className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              <span>{language === 'mr' ? 'माता नोंदणी व तपासणी वेळापत्रक (Due-List)' : 'Antenatal Registry & Due-List Scheduler'}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Automated 8-Contact WHO calendar from LMP date + Monthly 9th PMSMA specialist camp tracking
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px] w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Name, RCH ID, Village..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/20 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-sm font-medium"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
          <button
            onClick={() => { setSelectedRiskFilter('ALL'); setSelectedDueFilter('ALL'); }}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedRiskFilter === 'ALL' && selectedDueFilter === 'ALL'
                ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 shadow-md'
                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-300 dark:border-transparent'
            }`}
          >
            All Mothers ({beneficiaries.length})
          </button>

          <button
            onClick={() => setSelectedDueFilter('OVERDUE')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedDueFilter === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
            <span>Overdue Due-List (थकबाकी यादी)</span>
          </button>

          <button
            onClick={() => setSelectedDueFilter('TODAY_PMSMA')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedDueFilter === 'TODAY_PMSMA'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 hover:bg-blue-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>PMSMA 9th Specialist Cohort</span>
          </button>
        </div>
      </div>

      {/* Main Beneficiaries Registry Table */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-white/15">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[11px] font-black tracking-wider border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="p-4">Beneficiary / RCH ID</th>
                <th className="p-4">Gestational Age & EDD</th>
                <th className="p-4">Risk Tier</th>
                <th className="p-4">Latest Vitals</th>
                <th className="p-4">Next Scheduled ANC</th>
                <th className="p-4">Village / ASHA</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-slate-900 dark:text-slate-200 font-medium bg-white dark:bg-slate-900">
              {filteredBeneficiaries.map(b => {
                const nextContact = b.ancSchedule.find(c => c.status === 'PENDING' || c.status === 'OVERDUE') || b.ancSchedule[b.ancSchedule.length - 1];
                const isSelected = b.id === selectedBeneficiary.id;
                const isHighRisk = b.currentRiskTier === 'RED';
                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelectBeneficiary(b)}
                    className={`transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/40 ring-2 ring-inset ring-rose-500'
                        : isHighRisk
                        ? 'hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-black text-slate-950 dark:text-white text-sm">{b.name}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">RCH: {b.rchId} • Age {b.age}y</div>
                    </td>

                    <td className="p-4">
                      <div className="font-black text-slate-950 dark:text-white text-xs">{b.currentGestationalWeeks} Weeks</div>
                      <div className="text-[11px] text-teal-800 dark:text-teal-400 font-bold">EDD: {b.edd}</div>
                    </td>

                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 shadow-xs ${
                        b.currentRiskTier === 'RED' ? 'bg-rose-600 text-white' :
                        b.currentRiskTier === 'YELLOW' ? 'bg-amber-500 text-slate-950' :
                        'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30'
                      }`}>
                        {b.currentRiskTier === 'RED' && <AlertTriangle className="w-3.5 h-3.5 text-white" />}
                        <span>{b.currentRiskTier}</span>
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-mono font-black text-slate-950 dark:text-white text-xs whitespace-nowrap">
                        Hb <span className={(b.vitalsHistory[0]?.hemoglobin ?? 99) < 7 ? 'text-rose-600 dark:text-rose-400 font-black' : ''}>{b.vitalsHistory[0]?.hemoglobin ?? '-'}</span>
                      </div>
                      <div className="font-mono font-black text-slate-950 dark:text-white text-xs whitespace-nowrap">
                        BP {b.vitalsHistory[0] ? `${b.vitalsHistory[0].systolicBP}/${b.vitalsHistory[0].diastolicBP}` : '-'}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">{b.vitalsHistory[0]?.date || 'No vitals yet'}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-950 dark:text-white">{nextContact.title[language] || nextContact.title.en}</div>
                      <div className={`text-[11px] font-bold ${
                        nextContact.status === 'OVERDUE' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        Due: {nextContact.dueDate} ({nextContact.status})
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-950 dark:text-white">{b.village}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{b.assignedAsha.name}</div>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setScheduleModalBeneficiary(b);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-950 dark:text-white font-black px-3.5 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-white/20 cursor-pointer shadow-xs transition"
                      >
                        View Timeline
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8-CONTACT TIMELINE MODAL */}
      {scheduleModalBeneficiary && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{scheduleModalBeneficiary.name} — WHO 8-Contact ANC Schedule</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">LMP: {scheduleModalBeneficiary.lmp} • EDD: {scheduleModalBeneficiary.edd} • RCH: {scheduleModalBeneficiary.rchId}</p>
              </div>
              <button
                onClick={() => setScheduleModalBeneficiary(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {scheduleModalBeneficiary.ancSchedule.map((c, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition ${
                    c.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200' :
                    c.status === 'OVERDUE' ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200' :
                    'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {c.title[language]} ({c.targetWeek} Weeks)
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{c.assignedFacility}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(c.coreChecklist[language] || c.coreChecklist.en || []).map((t: string, ti: number) => (
                          <span key={ti} className="text-[10px] bg-white dark:bg-black/40 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/15 font-medium">
                            • {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm ${
                      c.status === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                      c.status === 'OVERDUE' ? 'bg-rose-600 text-white animate-pulse' :
                      'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-300'
                    }`}>
                      {c.dueDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
