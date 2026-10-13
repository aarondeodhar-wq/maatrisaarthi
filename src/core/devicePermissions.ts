// Real Device Hardware Permissions Service (Camera, GPS Location, Microphone, Notifications)

export interface DevicePermissionStatus {
  camera: 'granted' | 'denied' | 'prompt';
  location: 'granted' | 'denied' | 'prompt';
  microphone: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'prompt';
}

/**
 * Requests real Camera permission from browser/device
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.warn('Camera API not available in this environment');
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    // Stop tracks immediately after granting permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.warn('Camera permission denied or failed:', err);
    return false;
  }
}

/**
 * Requests real GPS Location permission for 108 emergency ambulance dispatch
 */
export async function requestLocationPermission(): Promise<{ granted: boolean; coords?: { lat: number; lng: number } }> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    console.warn('Geolocation not available');
    return { granted: false };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          granted: true,
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        });
      },
      (err) => {
        console.warn('Geolocation permission denied:', err);
        resolve({ granted: false });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Requests real Microphone permission for voice clinical notes
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.warn('Microphone API not available');
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.warn('Microphone permission denied:', err);
    return false;
  }
}

/**
 * Requests real Notification permission for SMS/WhatsApp ANC reminders
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (err) {
    console.warn('Notification permission error:', err);
    return false;
  }
}

/**
 * Checks current permission states across all 4 APIs
 */
export async function checkAllPermissions(): Promise<DevicePermissionStatus> {
  const result: DevicePermissionStatus = {
    camera: 'prompt',
    location: 'prompt',
    microphone: 'prompt',
    notifications: 'prompt'
  };

  if (typeof navigator === 'undefined') return result;

  // Check notification
  if (typeof window !== 'undefined' && 'Notification' in window) {
    result.notifications = Notification.permission as 'granted' | 'denied' | 'prompt';
  }

  // Check Permissions Query API if available
  if ('permissions' in navigator && navigator.permissions.query) {
    try {
      const cam = await navigator.permissions.query({ name: 'camera' as any });
      result.camera = cam.state as any;
    } catch (e) {}

    try {
      const geo = await navigator.permissions.query({ name: 'geolocation' as any });
      result.location = geo.state as any;
    } catch (e) {}

    try {
      const mic = await navigator.permissions.query({ name: 'microphone' as any });
      result.microphone = mic.state as any;
    } catch (e) {}
  }

  return result;
}
