// Visit logging: proof that an ASHA worker was physically with a mother.
// Each QR scan, PIN unlock, vitals entry and registration writes one visit_logs row
// with the signed-in worker's uid, the device GPS fix and the device time.
// The server stamps syncedAt, and firestore.rules ties ashaUid to request.auth.uid.

import { Beneficiary, GeoPoint, VisitAction, VisitLog } from '../types';
import { UserProfile, isDemoProfile } from './firebaseAuth';
import { queueOfflineMutation } from './offlineStore';

const GEO_TIMEOUT_MS = 8000;
// A fix up to a minute old is fine: a scan followed by a vitals entry reuses it
const GEO_MAX_AGE_MS = 60000;

/**
 * Current GPS fix, or null when location is denied, unavailable or times out.
 * A visit without a fix is still logged; the dashboard shows it as "no location".
 */
export function getCurrentGeo(): Promise<GeoPoint | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy)
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: GEO_MAX_AGE_MS }
    );
  });
}

/** Great-circle distance between two points, in metres */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Records a visit by the signed-in ASHA worker. Other roles are not logged.
 * Goes through the offline sync queue, so it is kept and retried without connectivity.
 */
export async function logVisit(
  profile: UserProfile | null,
  beneficiary: Pick<Beneficiary, 'id'>,
  action: VisitAction,
  verified: boolean,
  isOnline: boolean = navigator.onLine,
  motherConfirmed: boolean = false
): Promise<string | null> {
  if (!profile || isDemoProfile(profile) || profile.role !== 'ASHA_WORKER' || !profile.approved) return null;
  const geo = await getCurrentGeo();
  const visit: VisitLog = {
    id: 'visit_' + Math.random().toString(36).substring(2, 11),
    ashaUid: profile.uid,
    ashaName: profile.name,
    beneficiaryId: beneficiary.id,
    action,
    verified,
    ...(motherConfirmed ? { motherConfirmed: true } : {}),
    clientAt: new Date().toISOString(),
    ...(geo ? { geo } : {})
  };
  queueOfflineMutation('VISIT_LOG', beneficiary.id, { visit }, isOnline);
  return visit.id;
}
