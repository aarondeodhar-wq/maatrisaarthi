// Real Scannable 2D QR Code Generation & Decoding Engine for MaatriSaarthi Health Passes
import QRCode from 'qrcode';

// The pass carries identifiers only. Clinical data, the mother's name and her
// consent PIN are never put in the QR/URL; scanners must be signed-in staff and
// load the record from Firestore, where security rules enforce access.
export interface MotherHealthPassPayload {
  app: 'MAATRISAARTHI';
  type: 'MOTHER_HEALTH_PASS';
  beneficiaryId: string;
  rchId: string;
  timestamp: string;        // when this QR was issued (ISO)
  expiresAt?: number;       // epoch ms; scanners reject the pass after this. Missing on old QRs, which are rejected.
}

// A pass QR only opens a mother's details for this long after it was shown
export const PASS_TTL_MS = 15 * 60 * 1000;
// Tolerance for phone clocks that disagree by a few minutes
const CLOCK_SKEW_MS = 2 * 60 * 1000;

/**
 * True while the pass is inside its 15-minute window. Old QRs (no expiry) and QRs whose
 * expiry is further in the future than a fresh one could be are rejected.
 * This is checked on the scanning device, so it stops stale or photographed passes but
 * not someone who edits the payload; enforcing it against that needs a server-signed token.
 */
export function isPassFresh(pass: MotherHealthPassPayload, now: number = Date.now()): boolean {
  if (typeof pass.expiresAt !== 'number') return false;
  return now <= pass.expiresAt + CLOCK_SKEW_MS && pass.expiresAt - now <= PASS_TTL_MS + CLOCK_SKEW_MS;
}

/** Public web address QR links point to. The app and the website share it, so each can scan the other's QR. */
export function getPassBaseUrl(): string {
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  return (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.startsWith('capacitor://') && !origin.startsWith('ionic://') && !origin.startsWith('file://'))
    ? origin
    : 'https://maatrisaarthi.vercel.app';
}

/**
 * Generates a universal web URL QR code that can be scanned by any smartphone camera or app
 */
export async function generateHealthPassQrCode(
  payload: MotherHealthPassPayload
): Promise<string> {
  try {
    const baseUrl = getPassBaseUrl();

    const passData: MotherHealthPassPayload = {
      app: 'MAATRISAARTHI',
      type: 'MOTHER_HEALTH_PASS',
      beneficiaryId: payload.beneficiaryId,
      rchId: payload.rchId,
      timestamp: payload.timestamp,
      expiresAt: payload.expiresAt ?? Date.now() + PASS_TTL_MS
    };
    const jsonStr = JSON.stringify(passData);
    const encodedPayload = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
    // /pass is the path the Android app registers as an App Link (see AndroidManifest.xml)
    const universalUrl = `${baseUrl}/pass?mcp_pass=${encodedPayload}`;

    const dataUrl = await QRCode.toDataURL(universalUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: '#02181d',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating web-scannable QR code:', err);
    return '';
  }
}

/**
 * Decodes or parses scanned QR data text (whether scanned from camera or passed in URL query params)
 */
export function parseScannedQrPass(scannedText: string): MotherHealthPassPayload | null {
  if (!scannedText) return null;

  // 1. Try decoding as direct URL or query parameter
  try {
    let urlString = scannedText;
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = 'https://dummy.local/' + (urlString.startsWith('?') ? urlString : '?' + urlString);
    }
    const url = new URL(urlString);
    
    // Check if encoded mcp_pass payload is in query params
    const mcpPassParam = url.searchParams.get('mcp_pass') || url.searchParams.get('pass');
    if (mcpPassParam) {
      try {
        const decodedJson = decodeURIComponent(escape(atob(decodeURIComponent(mcpPassParam))));
        const parsed = JSON.parse(decodedJson);
        if (parsed.app === 'MAATRISAARTHI' && parsed.beneficiaryId) {
          return toPassPayload(parsed);
        }
      } catch (e) {}
    }
  } catch (err) {}

  // 2. Try decoding as raw JSON string
  try {
    const parsed = JSON.parse(scannedText);
    if (parsed.app === 'MAATRISAARTHI' && parsed.beneficiaryId) {
      return toPassPayload(parsed);
    }
  } catch (e) {}

  return null;
}

// Keep only the identifier fields, even when decoding passes printed by older builds
function toPassPayload(parsed: any): MotherHealthPassPayload {
  return {
    app: 'MAATRISAARTHI',
    type: 'MOTHER_HEALTH_PASS',
    beneficiaryId: String(parsed.beneficiaryId),
    rchId: parsed.rchId ? String(parsed.rchId) : '',
    timestamp: parsed.timestamp || new Date().toISOString(),
    expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : undefined
  };
}
