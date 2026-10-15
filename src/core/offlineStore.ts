import { Beneficiary, VitalRecord, DoctorPrescription, VisitLog } from '../types';
import { auth, db, UserProfile, isDemoProfile } from './firebaseAuth';
import { createDefaultDPDPConsent } from './dpdpCompliance';
import { doc, setDoc, collection, onSnapshot, query, where, serverTimestamp, getDoc } from 'firebase/firestore';

export interface PendingSyncMutation {
  id: string;
  type: 'REGISTER_BENEFICIARY' | 'RECORD_VITALS' | 'UPDATE_CONSENT' | 'ISSUE_PRESCRIPTION' | 'VISIT_LOG' | 'UPDATE_PREGNANCY';
  beneficiaryId: string;
  timestamp: string;
  // record: full beneficiary after the change. vital / prescription: the item added.
  // (Older builds queued the bare beneficiary / vital / prescription; writeMutation handles both.)
  payload: { record?: Beneficiary; vital?: VitalRecord; prescription?: DoctorPrescription; visit?: VisitLog } | any;
  retryCount: number;
  lastError?: string;
}

const STORAGE_KEYS = {
  BENEFICIARIES: 'maatrisaarthi_beneficiaries_v2',
  PENDING_MUTATIONS: 'maatrisaarthi_pending_sync_queue_v2',
  OFFLINE_SETTINGS: 'maatrisaarthi_offline_settings_v2'
};

/**
 * Loads all beneficiaries from local storage (IndexedDB/LocalStorage fallback)
 */
export function getLocalBeneficiaries(): Beneficiary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BENEFICIARIES);
    if (!raw) return [];
    return JSON.parse(raw).map(normalizeBeneficiary);
  } catch (e) {
    console.error('Error reading local beneficiaries', e);
    return [];
  }
}

/**
 * Saves all beneficiaries to local storage
 */
export function saveLocalBeneficiaries(beneficiaries: Beneficiary[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BENEFICIARIES, JSON.stringify(beneficiaries));
  } catch (e) {
    console.error('Error saving local beneficiaries', e);
  }
}

/**
 * Fills in any fields missing from a stored or cloud document, so a partial record
 * (e.g. written by an older build) can never crash code that expects arrays/objects.
 */
export function normalizeBeneficiary(data: any): Beneficiary {
  return {
    ...data,
    name: data.name || 'Unknown',
    phone: data.phone || '',
    village: data.village || '',
    ward: data.ward || '',
    district: data.district || '',
    assignedAsha: data.assignedAsha || { name: '', phone: '' },
    riskFactors: Array.isArray(data.riskFactors) ? data.riskFactors : [],
    ancSchedule: Array.isArray(data.ancSchedule) ? data.ancSchedule : [],
    vitalsHistory: Array.isArray(data.vitalsHistory) ? data.vitalsHistory : [],
    prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
    audioNotes: Array.isArray(data.audioNotes) ? data.audioNotes : [],
    dpdpConsent: data.dpdpConsent && Array.isArray(data.dpdpConsent.auditTrail)
      ? data.dpdpConsent
      : createDefaultDPDPConsent(),
    accessPin: data.accessPin || '',
    qrAuthToken: data.qrAuthToken || '',
    currentRiskTier: data.currentRiskTier || 'GREEN',
    mlRiskScore: typeof data.mlRiskScore === 'number' ? data.mlRiskScore : 0
  } as Beneficiary;
}

// Firestore rejects undefined values; a JSON round-trip drops them
function toFirestoreData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Writes a single complete beneficiary record to Cloud Firestore
 */
export async function saveBeneficiaryToCloud(b: Beneficiary): Promise<void> {
  await setDoc(doc(db, 'mothers', b.id), toFirestoreData(b), { merge: true });
}

/**
 * Uploads the complete records of the given cohort to Cloud Firestore.
 * Returns how many records were written successfully.
 */
export async function syncAllCohortToFirestore(beneficiaries: Beneficiary[]): Promise<number> {
  let count = 0;
  for (const b of beneficiaries) {
    try {
      await saveBeneficiaryToCloud({ ...b, lastSyncedAt: new Date().toISOString() });
      count++;
    } catch (err) {
      console.warn(`Firestore write failed for ${b.id}:`, err);
    }
  }
  return count;
}

/**
 * Gets all mutations waiting in the offline sync queue
 */
export function getPendingSyncMutations(): PendingSyncMutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_MUTATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading sync queue', e);
    return [];
  }
}

/**
 * Clears or updates the pending mutations queue
 */
export function setPendingSyncMutations(mutations: PendingSyncMutation[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_MUTATIONS, JSON.stringify(mutations));
  } catch (e) {
    console.error('Error updating mutation queue', e);
  }
}

function removeMutation(id: string) {
  setPendingSyncMutations(getPendingSyncMutations().filter(m => m.id !== id));
}

/**
 * Performs the Firestore writes for one mutation. Throws if any write fails.
 */
async function writeMutation(m: PendingSyncMutation): Promise<void> {
  const p = m.payload || {};
  const record: Beneficiary | undefined = p.record || (m.type === 'REGISTER_BENEFICIARY' ? p : undefined);
  const now = new Date().toISOString();

  if (m.type === 'VISIT_LOG') {
    // syncedAt is the server's clock; firestore.rules requires it to equal request.time
    const visit: VisitLog = p.visit;
    const ref = doc(db, 'visit_logs', visit.id);
    try {
      await setDoc(ref, { ...toFirestoreData(visit), syncedAt: serverTimestamp() });
    } catch (err: any) {
      // Rows are write-once. If an earlier attempt reached the server but its reply was lost,
      // the retry is refused as an update; the row exists, so the visit is already recorded.
      if (err?.code === 'permission-denied' && (await getDoc(ref)).exists()) return;
      throw err;
    }
    return;
  }

  if (m.type === 'RECORD_VITALS') {
    const vital: VitalRecord = p.vital || p;
    await setDoc(doc(db, 'vitals_logs', vital.id || `vital_${m.id}`), toFirestoreData({
      beneficiaryId: m.beneficiaryId,
      ...vital,
      recordedByUid: vital.recordedByUid || auth.currentUser?.uid,
      syncStatus: 'SYNCED',
      syncedAt: now
    }));
  } else if (m.type === 'ISSUE_PRESCRIPTION') {
    const rx: DoctorPrescription = p.prescription || p;
    await setDoc(doc(db, 'prescriptions', rx.id || `rx_${m.id}`), toFirestoreData({
      beneficiaryId: m.beneficiaryId,
      ...rx,
      syncedAt: now
    }));
  }

  if (record) {
    await saveBeneficiaryToCloud({
      ...record,
      vitalsHistory: (record.vitalsHistory || []).map(v => ({ ...v, syncStatus: 'SYNCED' as const })),
      lastSyncedAt: now
    });
  }
}

/**
 * Adds a mutation to the persistent queue. When tryNow is true it is written to
 * Firestore immediately and removed from the queue only once the write succeeds;
 * on failure it stays queued for the next sync.
 */
export function queueOfflineMutation(
  type: PendingSyncMutation['type'],
  beneficiaryId: string,
  payload: PendingSyncMutation['payload'],
  tryNow: boolean = navigator.onLine
): PendingSyncMutation {
  const mutation: PendingSyncMutation = {
    id: 'mut_' + Math.random().toString(36).substring(2, 9),
    type,
    beneficiaryId,
    timestamp: new Date().toISOString(),
    payload,
    retryCount: 0
  };

  setPendingSyncMutations([...getPendingSyncMutations(), mutation]);

  if (tryNow) {
    writeMutation(mutation)
      .then(() => removeMutation(mutation.id))
      .catch(err => {
        console.warn('Immediate Firestore write failed; kept in sync queue:', err);
      });
  }

  return mutation;
}

/**
 * Replays the queue in order. Successful mutations are removed; failed ones stay
 * queued with their retry count and last error.
 */
export async function processSyncQueue(
  onProgress?: (syncedCount: number, total: number) => void
): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  const queue = getPendingSyncMutations();
  const remaining: PendingSyncMutation[] = [];
  const errors: string[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      await writeMutation(item);
      synced++;
      if (onProgress) onProgress(synced, queue.length);
    } catch (err: any) {
      const message = err?.message || String(err);
      errors.push(`Failed to sync mutation ${item.id}: ${message}`);
      remaining.push({ ...item, retryCount: item.retryCount + 1, lastError: message });
    }
  }

  // Keep failures, plus anything queued while this sync was running
  const processedIds = new Set(queue.map(m => m.id));
  const addedDuringSync = getPendingSyncMutations().filter(m => !processedIds.has(m.id));
  setPendingSyncMutations([...remaining, ...addedDuringSync]);

  return {
    success: errors.length === 0,
    syncedCount: synced,
    errors
  };
}

/**
 * Merges a cloud snapshot with local state. Cloud records win, except records with
 * unsynced local changes (still in the queue), which keep their local version and
 * are kept even if they are not in the cloud yet.
 */
export function mergeCloudWithLocal(cloud: Beneficiary[], local: Beneficiary[]): Beneficiary[] {
  // A queued visit log does not change the mother's record, so it must not pin the local copy
  const pendingIds = new Set(getPendingSyncMutations().filter(m => m.type !== 'VISIT_LOG').map(m => m.beneficiaryId));
  const localById = new Map(local.map(b => [b.id, b]));
  const merged = cloud.map(c => (pendingIds.has(c.id) && localById.has(c.id) ? localById.get(c.id)! : c));
  const cloudIds = new Set(cloud.map(c => c.id));
  const unsyncedLocal = local.filter(b => !cloudIds.has(b.id) && pendingIds.has(b.id));
  return [...unsyncedLocal, ...merged];
}

/**
 * Live Real-Time Firestore Subscription
 * Keeps UI completely updated with real Firebase cloud data.
 * Doctors and ward officers see the cohort, an ASHA worker sees the mothers assigned
 * to her, and a mother sees only her own record (firestore.rules rejects broader queries).
 */
export function subscribeToLiveMothers(
  profile: UserProfile,
  onUpdate: (mothers: Beneficiary[]) => void,
  initialFallback: Beneficiary[]
): () => void {
  const isMother = profile.role === 'MOTHER';
  const isAsha = profile.role === 'ASHA_WORKER';
  if (isDemoProfile(profile)) return () => {};
  if (!isMother && !profile.approved) return () => {};
  try {
    const mothersCol = collection(db, 'mothers');
    const source = isMother
      ? query(mothersCol, where('ownerUid', '==', profile.uid))
      : isAsha
      ? query(mothersCol, where('assignedAshaUid', '==', profile.uid))
      : mothersCol;
    const unsubscribe = onSnapshot(source, (snapshot) => {
      if (!snapshot.empty) {
        const cloudMothers = snapshot.docs.map(d => normalizeBeneficiary(d.data()));
        const merged = mergeCloudWithLocal(cloudMothers, getLocalBeneficiaries());
        saveLocalBeneficiaries(merged);
        onUpdate(merged);
      } else if (profile.role === 'WARD_OFFICER') {
        // Initial setup: Seed cloud Firestore with baseline cohorts
        syncAllCohortToFirestore(initialFallback);
      }
    }, (err) => {
      console.warn('Firestore real-time subscription note (using cached/offline state):', err);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscription setup note:', err);
    return () => {};
  }
}
