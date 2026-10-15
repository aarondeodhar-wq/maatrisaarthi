// Time-limited write access for ASHA workers.
// Scanning a mother's QR pass (or entering her PIN) opens a 15-minute window in which the
// ASHA worker may add vitals and medicines for that mother. The window is also enforced in
// firestore.rules: the write must reference the scan's visit_logs row (scanVisitId), which the
// server stamped within the last 15 minutes. This in-memory copy only drives the UI.
// A reload or sign-out drops every grant.
import { PASS_TTL_MS } from './qrEngine';

interface Grant { until: number; visitId: string }
const grants = new Map<string, Grant>();

export function grantWriteAccess(beneficiaryId: string, visitId: string, now: number = Date.now()): number {
  const until = now + PASS_TTL_MS;
  grants.set(beneficiaryId, { until, visitId });
  return until;
}

/** The active grant for a mother, or null when none or expired. */
export function writeGrant(beneficiaryId: string, now: number = Date.now()): Grant | null {
  const g = grants.get(beneficiaryId);
  if (!g) return null;
  if (now > g.until) {
    grants.delete(beneficiaryId);
    return null;
  }
  return g;
}

export function writeAccessUntil(beneficiaryId: string, now: number = Date.now()): number | null {
  return writeGrant(beneficiaryId, now)?.until ?? null;
}

export function revokeAllWriteAccess(): void {
  grants.clear();
}
