import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gov.in.maatrisaarthi.app',
  appName: 'MaatriSaarthi',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    FirebaseAuthentication: {
      // Native sign-in results are passed to the Firebase JS SDK (see src/core/nativeAuth.ts)
      skipNativeAuth: true,
      // 'google.com' needs rgcfaIncludeGoogle = true in android/variables.gradle
      providers: ['google.com', 'phone']
    }
  },
  android: {
    // Release-safe defaults: HTTPS only, no remote WebView inspection.
    // For local debugging only, temporarily set webContentsDebuggingEnabled to true.
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
