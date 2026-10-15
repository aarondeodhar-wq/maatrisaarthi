import React, { useState } from 'react';
import { Calendar, PlusCircle } from 'lucide-react';
import { Beneficiary, Language } from '../types';
import { predictMaternalRisk, buildClinicalVitals } from '../core/mlRiskEngine';
import { calculateEDD, calculateGestationalWeeks, generateANCSchedule, toLocalDateString } from '../core/protocolEngine';
import { createDefaultDPDPConsent } from '../core/dpdpCompliance';
import { getCurrentGeo } from '../core/visitLog';
import { UserProfile } from '../core/firebaseAuth';

interface MotherRegistrationFormProps {
  profile: UserProfile | null;
  language: Language;
  onRegistered: (b: Beneficiary) => void;
}

/**
 * ASHA worker registers a pregnant mother. Only what is entered is stored: no first visit,
 * RCH/ABHA id or blood group is made up. The starting risk tier comes from her history.
 */
export const MotherRegistrationForm: React.FC<MotherRegistrationFormProps> = ({ profile, language, onRegistered }) => {
  // New Mother Registration State
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regHusband, setRegHusband] = useState('');
  const [regVillage, setRegVillage] = useState(profile?.village || '');
  const [regLmp, setRegLmp] = useState('');
  const [regGravidity, setRegGravidity] = useState(1);
  const [regParity, setRegParity] = useState(0);
  const [regPrevCesarean, setRegPrevCesarean] = useState(false);
  const [regPastStillbirth, setRegPastStillbirth] = useState(false);
  const [regBloodGroup, setRegBloodGroup] = useState('');   // '' = not known yet
  const [regRchId, setRegRchId] = useState('');
  const [regAbhaId, setRegAbhaId] = useState('');

  const handleRegisterNewMother = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = Number(regAge);
    if (!regName.trim() || !regLmp || !(age >= 12 && age <= 55)) {
      alert(language === 'mr' ? 'नाव, वय (१२-५५) आणि LMP तारीख भरा.' : language === 'hi' ? 'नाम, उम्र (12-55) और LMP तारीख भरें।' : 'Enter name, age (12-55) and LMP date.');
      return;
    }

    // The registration GPS fix is the mother's home; later visits are measured from it
    const homeLocation = await getCurrentGeo();

    const weeks = calculateGestationalWeeks(regLmp);
    const edd = calculateEDD(regLmp);
    const facility = regVillage.trim() ? `${regVillage.trim()} PHC` : 'Assigned PHC';
    const schedule = generateANCSchedule(regLmp, facility);

    // No first visit is created here: readings are added only when they are actually measured
    const draft: Beneficiary = {
      id: 'ben_' + Math.random().toString(36).substring(2, 9),
      // RCH / ABHA are government ids: stored only when the ASHA worker enters them
      rchId: regRchId.trim() || 'RCH pending',
      ...(regAbhaId.trim() ? { abhaId: regAbhaId.trim() } : {}),
      name: regName.trim(),
      age,
      phone: regPhone.trim(),
      husbandName: regHusband.trim(),
      village: regVillage.trim(),
      ward: '',
      district: '',
      assignedAsha: {
        name: profile?.name || '',
        phone: profile?.phone || ''
      },
      lmp: regLmp,
      edd,
      currentGestationalWeeks: weeks,
      gravidity: Number(regGravidity),
      parity: Number(regParity),
      hasPrevCesarean: regPrevCesarean,
      hasPastStillbirth: regPastStillbirth,
      bloodGroup: regBloodGroup,
      currentRiskTier: 'GREEN',
      mlRiskScore: 0,
      riskFactors: [],
      ancSchedule: schedule,
      vitalsHistory: [],
      prescriptions: [],
      audioNotes: [],
      pregnancy: {
        fetusCount: 1,
        presentation: 'UNKNOWN',
        growth: 'NORMAL',
        conditions: [],
        conceptionEvents: [],
        priorComplications: []
      },
      dpdpConsent: createDefaultDPDPConsent(language, true, true, true),
      qrAuthToken: `MS-AUTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      accessPin: `${Math.floor(1000 + Math.random() * 9000)}`,
      ...(homeLocation ? { homeLocation } : {}),
      registeredAt: toLocalDateString(),
      lastSyncedAt: new Date().toISOString()
    };
    // Starting tier from history alone (age, parity, previous CS, stillbirth, blood group)
    const initial = predictMaternalRisk(buildClinicalVitals(draft));
    const newB: Beneficiary = {
      ...draft,
      currentRiskTier: initial.riskTier,
      mlRiskScore: initial.riskProbability,
      riskFactors: initial.explainability.filter(x => x.contribution !== 'NORMAL').map(x => x.reason[language])
    };

    onRegistered(newB);
  };

  return (
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
            required
            min={12}
            max={55}
            placeholder="Age"
            value={regAge}
            onChange={e => setRegAge(e.target.value)}
            className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:bg-white focus:border-teal-500"
          />
        </div>
        <div>
          <label className="font-bold text-slate-800 dark:text-slate-300 block mb-1">Phone Number *</label>
          <input
            type="tel"
            required
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

      {/* Household and ids (optional: blank stays blank) */}
      <div className="grid grid-cols-2 gap-3">
        {([
          ['Village', regVillage, setRegVillage, 'Village'],
          ["Husband's name", regHusband, setRegHusband, 'Optional'],
          ['RCH ID', regRchId, setRegRchId, 'If issued'],
          ['ABHA ID', regAbhaId, setRegAbhaId, 'If issued']
        ] as [string, string, (v: string) => void, string][]).map(([label, value, set, ph]) => (
          <div key={label}>
            <label className="font-bold text-slate-800 dark:text-slate-300 block mb-1">{label}</label>
            <input
              type="text"
              placeholder={ph}
              value={value}
              onChange={e => set(e.target.value)}
              className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:bg-white focus:border-teal-500"
            />
          </div>
        ))}
      </div>

      {/* Obstetric history: used by the AI risk analysis from the first day */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="font-bold text-slate-800 dark:text-slate-300 block mb-1">Gravida (G)</label>
          <input type="number" min={1} max={15} value={regGravidity} onChange={e => setRegGravidity(Math.max(1, Number(e.target.value) || 1))}
            className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-bold" />
        </div>
        <div>
          <label className="font-bold text-slate-800 dark:text-slate-300 block mb-1">Para (P)</label>
          <input type="number" min={0} max={14} value={regParity} onChange={e => setRegParity(Math.max(0, Number(e.target.value) || 0))}
            className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-bold" />
        </div>
        <div>
          <label className="font-bold text-slate-800 dark:text-slate-300 block mb-1">Blood group</label>
          <select value={regBloodGroup} onChange={e => setRegBloodGroup(e.target.value)}
            className="w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-bold">
            <option value="">Not known</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {([
          ['Previous C-section', regPrevCesarean, setRegPrevCesarean],
          ['Past stillbirth', regPastStillbirth, setRegPastStillbirth]
        ] as [string, boolean, (v: boolean) => void][]).map(([label, on, set]) => (
          <button
            key={label}
            type="button"
            onClick={() => set(!on)}
            aria-pressed={on}
            className={`px-3 py-2 rounded-xl border font-black cursor-pointer ${on ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white dark:bg-black/30 border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200'}`}
          >
            {label} {on ? '✓' : ''}
          </button>
        ))}
      </div>
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black py-3.5 rounded-2xl shadow-xl transition cursor-pointer border border-white/20 text-xs sm:text-sm"
      >
        {language === 'mr' ? 'नोंदणी पूर्ण करा (Schedule 8 ANCs)' : language === 'hi' ? 'पंजीकरण पूर्ण करें' : 'Complete Registration & Schedule 8 ANCs'}
      </button>
    </form>
  );
};
