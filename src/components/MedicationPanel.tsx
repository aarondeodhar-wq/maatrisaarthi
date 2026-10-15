import React, { useEffect, useState } from 'react';
import { Pill, PlusCircle } from 'lucide-react';
import { Beneficiary, DoctorPrescription } from '../types';
import { writeAccessUntil } from '../core/accessWindow';

interface MedicationPanelProps {
  beneficiary: Beneficiary;
  signedInName: string;
  onAdd: (rx: DoctorPrescription) => void;
}

// Lets a field worker record medicines a mother is taking (IFA, calcium, prescribed drugs).
// Re-checks the 15-minute editing window every second, so the form locks on its own.
export const MedicationPanel: React.FC<MedicationPanelProps> = ({ beneficiary, signedInName, onAdd }) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [days, setDays] = useState(30);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const canWrite = writeAccessUntil(beneficiary.id, now) !== null;

  const history = beneficiary.prescriptions.flatMap(p =>
    p.medications.map(m => ({ key: `${p.id}-${m.name}`, date: p.date, ...m }))
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !name.trim()) return;
    const rx: DoctorPrescription = {
      id: 'rx_' + Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString().slice(0, 10),
      doctorId: '',
      doctorName: signedInName,
      facility: beneficiary.ward || 'PHC Koregaon Bhima',
      diagnosis: 'Medicine recorded by field worker',
      medications: [{ name: name.trim(), dosage: dosage.trim() || 'As directed', durationDays: days }],
      specialInstructions: ''
    };
    onAdd(rx);
    setName('');
    setDosage('');
  };

  return (
    <div className="reference-hero-card p-6 sm:p-8 space-y-4 text-xs">
      <h3 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-2">
        <Pill className="w-4 h-4 text-amber-500" /> Medicines for {beneficiary.name}
      </h3>

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="sm:col-span-2 font-bold text-slate-700 dark:text-slate-300">
          Medicine name
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!canWrite}
            placeholder="e.g. IFA 100 mg, Calcium 500 mg"
            className="mt-1 w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 disabled:opacity-50"
          />
        </label>
        <label className="font-bold text-slate-700 dark:text-slate-300">
          Dose
          <input
            value={dosage}
            onChange={e => setDosage(e.target.value)}
            disabled={!canWrite}
            placeholder="1 tablet daily"
            className="mt-1 w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 disabled:opacity-50"
          />
        </label>
        <label className="font-bold text-slate-700 dark:text-slate-300">
          Days
          <input
            type="number"
            min={1}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            disabled={!canWrite}
            className="mt-1 w-full border border-slate-300 dark:border-white/20 rounded-xl p-2.5 bg-white dark:bg-black/40 disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={!canWrite || !name.trim()}
          className="sm:col-span-4 btn-pill-primary py-2.5 text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" /> Add medicine
        </button>
      </form>

      <div className="space-y-2">
        {history.length === 0 && <p className="font-bold text-slate-600 dark:text-slate-400">No medicines recorded yet.</p>}
        {history.map(h => (
          <div key={h.key} className="flex justify-between gap-2 rounded-xl border border-slate-200 dark:border-white/10 p-2.5">
            <span className="font-black text-slate-900 dark:text-white">{h.name}</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{h.dosage} • {h.durationDays} days • {h.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
