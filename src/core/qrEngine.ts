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
  timestamp: string;
}

/**
 * Generates a universal web URL QR code that can be scanned by any smartphone camera or app
 */
export async function generateHealthPassQrCode(
  payload: MotherHealthPassPayload
): Promise<string> {
  try {
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
    // Always use live production URL for QR passes so any external phone camera scans live to https://maatrisaarthi.vercel.app
    const baseUrl = (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.startsWith('capacitor://') && !origin.startsWith('ionic://') && !origin.startsWith('file://'))
      ? origin
      : 'https://maatrisaarthi.vercel.app';

    const passData: MotherHealthPassPayload = {
      app: 'MAATRISAARTHI',
      type: 'MOTHER_HEALTH_PASS',
      beneficiaryId: payload.beneficiaryId,
      rchId: payload.rchId,
      timestamp: payload.timestamp
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

    // Fallback: Check individual URL query parameters
    const benId = url.searchParams.get('id') || url.searchParams.get('beneficiaryId');
    if (benId) {
      return {
        app: 'MAATRISAARTHI',
        type: 'MOTHER_HEALTH_PASS',
        beneficiaryId: benId,
        rchId: url.searchParams.get('rch') || '',
        timestamp: new Date().toISOString()
      };
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
    timestamp: parsed.timestamp || new Date().toISOString()
  };
}
