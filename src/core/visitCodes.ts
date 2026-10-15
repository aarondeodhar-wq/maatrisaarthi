// One-time visit codes: the second factor for an ASHA visit.
// Factor 1 is the ASHA scanning the mother's pass QR. Factor 2 is the mother confirming
// a fresh 6-digit code the ASHA issues for that visit (shown as a QR and as digits).
// Every "new code" replaces the old one, a code lasts 15 minutes and works once.
//
// Real accounts store the code in Firestore (visit_codes/{beneficiaryId}); firestore.rules
// check the code and expiry on the mother's confirmation. Demo accounts keep it in
// localStorage so the flow works without Firebase.

import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { VisitCode } from '../types';
import { db, UserProfile, isDemoProfile } from './firebaseAuth';
import { PASS_TTL_MS } from './qrEngine';

const DEMO_KEY = 'maatrisaarthi_demo_visit_codes';

function randomCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1000000).padStart(6, '0');
}

function readDemo(): Record<string, VisitCode> {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function writeDemo(all: Record<string, VisitCode>) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(all));
  } catch (e) {}
}

// Firestore returns server timestamps as Timestamp objects
function toMillis(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  return null;
}

function fromFirestore(id: string, data: any): VisitCode {
  return {
    id,
    ashaUid: data.ashaUid,
    ashaName: data.ashaName,
    code: data.code,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
    confirmedAt: toMillis(data.confirmedAt),
    confirmedByUid: data.confirmedByUid
  };
}

/** ASHA: issue a new one-time code for this mother. Replaces any earlier code. */
export async function issueVisitCode(profile: UserProfile, beneficiaryId: string): Promise<VisitCode> {
  const now = Date.now();
  const visitCode: VisitCode = {
    id: beneficiaryId,
    ashaUid: profile.uid,
    ashaName: profile.name,
    code: randomCode(),
    createdAt: now,
    expiresAt: now + PASS_TTL_MS,
    confirmedAt: null
  };
  if (isDemoProfile(profile)) {
    writeDemo({ ...readDemo(), [beneficiaryId]: visitCode });
  } else {
    await setDoc(doc(db, 'visit_codes', beneficiaryId), visitCode);
  }
  return visitCode;
}

/** ASHA: watch the code, so the screen flips to "confirmed" the moment the mother confirms. */
export function subscribeVisitCode(
  profile: UserProfile,
  beneficiaryId: string,
  onChange: (code: VisitCode | null) => void
): () => void {
  if (isDemoProfile(profile)) {
    const emit = () => onChange(readDemo()[beneficiaryId] || null);
    emit();
    const timer = setInterval(emit, 1000);
    return () => clearInterval(timer);
  }
  return onSnapshot(
    doc(db, 'visit_codes', beneficiaryId),
    snap => onChange(snap.exists() ? fromFirestore(snap.id, snap.data()) : null),
    () => onChange(null)
  );
}

export type ConfirmResult = 'CONFIRMED' | 'WRONG_OR_EXPIRED';

/**
 * Mother: confirm the visit with the code the ASHA gave her.
 * The Firestore update is blind on purpose: the mother cannot read the stored code,
 * the rules accept the update only if her code equals it and it has not expired.
 */
export async function confirmVisitCode(
  profile: UserProfile,
  beneficiaryId: string,
  enteredCode: string
): Promise<ConfirmResult> {
  const code = enteredCode.trim();
  if (!/^\d{6}$/.test(code)) return 'WRONG_OR_EXPIRED';

  if (isDemoProfile(profile)) {
    const all = readDemo();
    const stored = all[beneficiaryId];
    if (!stored || stored.confirmedAt || stored.code !== code || Date.now() > stored.expiresAt) {
      return 'WRONG_OR_EXPIRED';
    }
    writeDemo({ ...all, [beneficiaryId]: { ...stored, confirmedAt: Date.now(), confirmedByUid: profile.uid } });
    return 'CONFIRMED';
  }

  try {
    await updateDoc(doc(db, 'visit_codes', beneficiaryId), {
      confirmedCode: code,
      confirmedAt: serverTimestamp(),
      confirmedByUid: profile.uid
    });
    return 'CONFIRMED';
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.code === 'not-found') return 'WRONG_OR_EXPIRED';
    throw err;
  }
}

/** Demo only: confirm the current code without typing it (single-device presentations). */
export async function demoConfirmCurrent(profile: UserProfile, beneficiaryId: string): Promise<void> {
  if (!isDemoProfile(profile)) return;
  const stored = readDemo()[beneficiaryId];
  if (stored) await confirmVisitCode({ ...profile, uid: 'demo_asha_worker' }, beneficiaryId, stored.code);
}

