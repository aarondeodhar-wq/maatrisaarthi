import React, { useState, useEffect } from 'react';
import { Beneficiary, Language, UserRole, VitalRecord, DoctorPrescription } from './types';
import { auth, UserProfile, subscribeToAuthProfile, signOutUser, isDemoProfile } from './core/firebaseAuth';
import { MOCK_BENEFICIARIES } from './data/mockMaternalData';
import { getLocalBeneficiaries, saveLocalBeneficiaries, getPendingSyncMutations, queueOfflineMutation, processSyncQueue, subscribeToLiveMothers, PendingSyncMutation } from './core/offlineStore';
import { SplashScreen } from './components/SplashScreen';
import { SidebarDrawer } from './components/SidebarDrawer';
import { LoginPage } from './components/LoginPage';
import { HeroOverviewSection } from './components/HeroOverviewSection';
import { MotherPersonalView } from './components/MotherPersonalView';
import { FieldWorkerMobileView } from './components/FieldWorkerMobileView';
import { DoctorWebPortal } from './components/DoctorWebPortal';
import { RegistryDueList } from './components/RegistryDueList';
import { ReminderSandbox } from './components/ReminderSandbox';
import { WardDashboard } from './components/WardDashboard';
import { AlertCenterModal } from './components/AlertCenterModal';
import { LiveSpotlightPointerTour } from './components/LiveSpotlightPointerTour';
import { DevicePermissionsModal } from './components/DevicePermissionsModal';
import { AuthLoadingScreen } from './components/AuthLoadingScreen';
import { PatientRecordConsentPortal } from './components/PatientRecordConsentPortal';
import { parseScannedQrPass, isPassFresh } from './core/qrEngine';
import { grantWriteAccess, writeGrant, revokeAllWriteAccess } from './core/accessWindow';
import type { PregnancyProfile } from './core/pregnancyRisk';
import { isNativeApp } from './core/nativeAuth';
import { App as CapacitorApp } from '@capacitor/app';
import { isAppLayout } from './core/navigation';
import { AppTopBar, AppBottomNav } from './components/PlatformShell';
import { WebSidebar, WebTopBar } from './components/WebShell';
import { recordDataAccessAudit } from './core/dpdpCompliance';
import { sendFreeWhatsAppAlert, describeAlertOutcome, openEmergency108Dialer } from './core/freeAlertsService';
import { logVisit } from './core/visitLog';
import { PhoneCall } from 'lucide-react';

export function App() {
  // Android app (or ?layout=app): native-style layout. Website: desktop dashboard layout.
  const [appLayout] = useState<boolean>(() => isAppLayout());
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (isAppLayout() ? 'dark' : 'light'));
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => {
    const local = getLocalBeneficiaries();
    if (local && local.length > 0) return local;
    saveLocalBeneficiaries(MOCK_BENEFICIARIES);
    return MOCK_BENEFICIARIES;
  });

  // Authenticated identity (Firebase Auth + Firestore profile). Never read from localStorage.
  const [authProfile, setAuthProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const isLoggedIn = authProfile !== null;
  const isPendingApproval = authProfile !== null && authProfile.role !== 'MOTHER' && !authProfile.approved;
  const activeRole: UserRole = authProfile?.role || 'ASHA_WORKER';
  const userName = authProfile?.name || '';
  const userPhone = authProfile?.phone || '';

  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(() => beneficiaries[0]?.id || 'ben_001');

  // Real-Time Live Firebase Firestore Cloud Sync (only once signed in; scope set by role)
  useEffect(() => {
    if (!authProfile) return;
    const unsubscribe = subscribeToLiveMothers(authProfile, (cloudMothers) => {
      setBeneficiaries(cloudMothers);
    }, MOCK_BENEFICIARIES);
    return () => unsubscribe();
  }, [authProfile]);

  const [currentTab, setCurrentTab] = useState<string>('mobile_app');
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('maatrisaarthi_app_language');
    if (stored === 'mr' || stored === 'hi' || stored === 'en') return stored;
    return 'mr';
  });
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingSyncMutations().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState<boolean>(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    return !sessionStorage.getItem('maatrisaarthi_tour_skipped');
  });

  // Emergency SOS Toast State
  const [sosToast, setSosToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  // Patient Record Consent & Auto-Lock Modal State
  const [consentModalBeneficiary, setConsentModalBeneficiary] = useState<Beneficiary | null>(null);

  const selectedBeneficiary = beneficiaries.find(b => b.id === selectedBeneficiaryId) || beneficiaries[0];

  useEffect(() => {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.className = 'dark theme-dark';
      document.body.className = 'theme-dark';
    } else {
      document.documentElement.className = 'light theme-light';
      document.body.className = 'theme-light';
    }
  }, [theme]);

  useEffect(() => {
    saveLocalBeneficiaries(beneficiaries);
    setPendingSyncCount(getPendingSyncMutations().length);
  }, [beneficiaries]);

  // Automatically trigger role-specific guided tutorial on first visit to each internal portal
  useEffect(() => {
    const tourKey = isLoggedIn ? `maatrisaarthi_tour_completed_${activeRole}` : 'maatrisaarthi_tour_completed_LOGIN';
    const isCompleted = localStorage.getItem(tourKey);
    if (!isCompleted) {
      const t = setTimeout(() => {
        setIsTourOpen(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [activeRole, isLoggedIn]);

  // Auto-request device permissions on initial launch
  useEffect(() => {
    if (!showSplash) {
      const hasGranted = localStorage.getItem('maatrisaarthi_permissions_granted');
      if (!hasGranted) {
        const t = setTimeout(() => {
          setIsPermissionsOpen(true);
        }, 600);
        return () => clearTimeout(t);
      }
    }
  }, [showSplash]);

  // Scanned QR deep link: remember the pass id, strip it from the URL, and only open the
  // record once an approved staff member is signed in and can load it from Firestore.
  const [initialPass] = useState<{ id: string | null; expired: boolean }>(() => {
    try {
      const payload = parseScannedQrPass(window.location.href);
      if (payload) {
        window.history.replaceState(null, '', window.location.pathname);
        return isPassFresh(payload) ? { id: payload.beneficiaryId, expired: false } : { id: null, expired: true };
      }
    } catch (e) {}
    return { id: null, expired: false };
  });
  const [pendingPassId, setPendingPassId] = useState<string | null>(initialPass.id);
  // A scanned visit-confirmation QR (/pass?confirm=<id>.<code>): the mother's app pre-fills the code
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(() => {
    try {
      const value = new URLSearchParams(window.location.search).get('confirm');
      if (value) window.history.replaceState(null, '', window.location.pathname);
      return value;
    } catch (e) {
      return null;
    }
  });
  const PASS_EXPIRED_MESSAGE = 'This QR has expired. Ask the mother to open her pass again: it refreshes automatically and is valid for 15 minutes.';
  const [passNotice, setPassNotice] = useState<string | null>(initialPass.expired ? PASS_EXPIRED_MESSAGE : null);
  const showPassExpired = () => setPassNotice(PASS_EXPIRED_MESSAGE);

  // Android App Link: a pass QR scanned with the phone camera opens the app with its URL
  useEffect(() => {
    if (!isNativeApp()) return;
    const handleUrl = (url?: string) => {
      try {
        const confirm = url ? new URL(url).searchParams.get('confirm') : null;
        if (confirm) setPendingConfirm(confirm);
      } catch (e) {}
      const payload = url ? parseScannedQrPass(url) : null;
      if (payload && isPassFresh(payload)) setPendingPassId(payload.beneficiaryId);
      else if (payload) showPassExpired();
    };
    CapacitorApp.getLaunchUrl().then(res => handleUrl(res?.url)).catch(() => {});
    const listener = CapacitorApp.addListener('appUrlOpen', event => handleUrl(event.url));
    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  useEffect(() => {
    if (!pendingPassId || !authProfile || authProfile.role === 'MOTHER' || !authProfile.approved) return;
    const matched = beneficiaries.find(b => b.id === pendingPassId);
    if (matched) {
      setConsentModalBeneficiary(matched);
      setPendingPassId(null);
      // Opened from the phone camera / App Link: no PIN was entered, so it is logged unverified
      logVisit(authProfile, matched, 'SCAN_QR', false, isOnline);
    }
  }, [pendingPassId, authProfile, beneficiaries]);

  // Handler: apply an authenticated profile (from the login page or the Firebase Auth listener)
  const applyProfile = (profile: UserProfile) => {
    setAuthProfile(profile);
    setIsAuthLoading(false);

    if (profile.role === 'MOTHER') {
      const cleanPhone = profile.phone.replace(/\D/g, '').slice(-10);
      const ownRecord = beneficiaries.find(b =>
        (profile.beneficiaryId && b.id === profile.beneficiaryId) ||
        b.ownerUid === profile.uid ||
        (cleanPhone.length === 10 && b.phone.replace(/\D/g, '').endsWith(cleanPhone))
      );
      if (ownRecord) setSelectedBeneficiaryId(ownRecord.id);
      setCurrentTab('mother_pass');
    } else if (profile.role === 'ASHA_WORKER') {
      setCurrentTab('mobile_app');
    } else if (profile.role === 'PHC_DOCTOR') {
      setCurrentTab('doctor_portal');
    } else {
      setCurrentTab('ward_dashboard');
    }
  };

  // Opening a profile (login or role switch) must start at the top, not where the last screen was scrolled
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeRole, authProfile?.uid]);

  // Restore the Firebase Auth session on reload; the role comes from the Firestore profile
  useEffect(() => {
    return subscribeToAuthProfile((profile) => {
      if (profile) applyProfile(profile);
      else if (!auth.currentUser) {
        revokeAllWriteAccess();
        setAuthProfile(null);
      }
      setAuthReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A mother's view must only ever show her own record
  useEffect(() => {
    if (authProfile?.role !== 'MOTHER') return;
    const own = beneficiaries.find(b => b.ownerUid === authProfile.uid || b.id === authProfile.beneficiaryId);
    if (own && own.id !== selectedBeneficiaryId) setSelectedBeneficiaryId(own.id);
  }, [authProfile, beneficiaries, selectedBeneficiaryId]);

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (e) {}
    setAuthProfile(null);
  };

  // Every change is queued with the full updated record. When online it is written
  // immediately and leaves the queue only after Firestore confirms the write.
  const queueChange = (type: PendingSyncMutation['type'], record: Beneficiary, extra: Record<string, unknown> = {}) => {
    if (isDemoProfile(authProfile)) return; // demo data never goes to the cloud
    queueOfflineMutation(type, record.id, { record, ...extra }, isOnline);
    setPendingSyncCount(getPendingSyncMutations().length);
    // Refresh the badge once the immediate write has had a chance to finish
    setTimeout(() => setPendingSyncCount(getPendingSyncMutations().length), 3000);
  };

  // Handler: Add vital record from field worker or doctor
  const handleAddVitalsRecord = (beneficiaryId: string, vital: VitalRecord) => {
    // ASHA workers may only write for a mother whose QR/PIN was checked in the last 15 minutes
    const grant = writeGrant(beneficiaryId);
    if (authProfile?.role === 'ASHA_WORKER' && !grant) {
      alert('Editing window closed. Scan the mother\'s QR pass or enter her PIN again to save vitals.');
      return;
    }
    const target = beneficiaries.find(b => b.id === beneficiaryId);
    if (!target) return;
    // The author is the signed-in account, never a name typed or hardcoded in the form
    const signed: VitalRecord = authProfile
      ? {
          ...vital,
          scanVisitId: grant?.visitId,
          recordedBy: authProfile.role === 'ASHA_WORKER' ? `${authProfile.name} (ASHA)` : authProfile.name,
          recordedByUid: authProfile.uid,
          recordedAt: new Date().toISOString()
        }
      : vital;
    const updated: Beneficiary = {
      ...target,
      currentRiskTier: signed.riskTier,
      mlRiskScore: signed.mlRiskScore,
      riskFactors: signed.riskReasons,
      vitalsHistory: [signed, ...target.vitalsHistory]
    };
    setBeneficiaries(prev => prev.map(b => (b.id === beneficiaryId ? updated : b)));
    queueChange('RECORD_VITALS', updated, { vital: signed });
    logVisit(authProfile, target, 'RECORD_VITALS', false, isOnline);
  };

  // Handler: Register new mother
  const handleRegisterBeneficiary = (registered: Beneficiary) => {
    // A mother registered by an ASHA worker is assigned to that ASHA worker
    const isAsha = authProfile?.role === 'ASHA_WORKER';
    const newB: Beneficiary = isAsha && authProfile
      ? {
          ...registered,
          assignedAshaUid: authProfile.uid,
          assignedAsha: { name: authProfile.name, phone: authProfile.phone },
          vitalsHistory: registered.vitalsHistory.map(v => ({
            ...v,
            recordedBy: `${authProfile.name} (ASHA)`,
            recordedByUid: authProfile.uid,
            recordedAt: new Date().toISOString()
          }))
        }
      : registered;
    setBeneficiaries(prev => [newB, ...prev.filter(b => b.id !== newB.id)]);
    setSelectedBeneficiaryId(newB.id);
    queueChange('REGISTER_BENEFICIARY', newB);
    if (isAsha) logVisit(authProfile, newB, 'REGISTER_MOTHER', false, isOnline);
  };

  // Handler: an ASHA worker opened a mother's record by QR scan or PIN unlock
  const handleLogVisit = (b: Beneficiary, action: 'SCAN_QR' | 'PIN_UNLOCK' | 'VISIT_CONFIRMED', verified: boolean, motherConfirmed: boolean = false) => {
    logVisit(authProfile, b, action, verified, isOnline, motherConfirmed).then(visitId => {
      // A scanned QR or entered PIN opens a 15-minute editing window, tied to that scan's visit row
      if (visitId && (action === 'SCAN_QR' || action === 'PIN_UNLOCK')) grantWriteAccess(b.id, visitId);
    });
  };

  // Handler: pregnancy profile (multiple pregnancy, placement, growth, diseases, complications).
  // ASHA edits need an open 15-minute window, like vitals and medicines.
  const handleUpdatePregnancy = (beneficiaryId: string, profile: PregnancyProfile) => {
    const grant = writeGrant(beneficiaryId);
    if (authProfile?.role === 'ASHA_WORKER' && !grant) {
      alert('Editing window closed. Scan the mother\'s QR pass or enter her PIN again to change the pregnancy profile.');
      return;
    }
    const target = beneficiaries.find(b => b.id === beneficiaryId);
    if (!target) return;
    const updated: Beneficiary = { ...target, pregnancy: { ...profile, scanVisitId: grant?.visitId } };
    setBeneficiaries(prev => prev.map(b => (b.id === beneficiaryId ? updated : b)));
    queueChange('UPDATE_PREGNANCY', updated);
  };

  // Handler: ASHA worker adds a medicine. Blocked once the 15-minute window has closed.
  const handleAddMedication = (beneficiaryId: string, rx: DoctorPrescription) => {
    const grant = writeGrant(beneficiaryId);
    if (authProfile?.role === 'ASHA_WORKER' && !grant) {
      alert('Editing window closed. Scan the mother\'s QR pass or enter her PIN again to add medicines.');
      return;
    }
    const target = beneficiaries.find(b => b.id === beneficiaryId);
    if (!target) return;
    const stamped: DoctorPrescription = {
      ...rx,
      recordedByUid: authProfile?.uid,
      scanVisitId: grant?.visitId
    };
    const updated: Beneficiary = { ...target, prescriptions: [stamped, ...target.prescriptions] };
    setBeneficiaries(prev => prev.map(b => (b.id === beneficiaryId ? updated : b)));
    queueChange('ISSUE_PRESCRIPTION', updated, { prescription: stamped });
  };

  // Handler: Issue Doctor e-Prescription
  const handleIssuePrescription = (beneficiaryId: string, rx: DoctorPrescription) => {
    const target = beneficiaries.find(b => b.id === beneficiaryId);
    if (!target) return;
    const audited = recordDataAccessAudit(target, rx.doctorName, rx.facility, rx.diagnosis);
    const updated: Beneficiary = { ...audited, prescriptions: [rx, ...audited.prescriptions] };
    setBeneficiaries(prev => prev.map(b => (b.id === beneficiaryId ? updated : b)));
    queueChange('ISSUE_PRESCRIPTION', updated, { prescription: rx });

    const targetBen = beneficiaries.find(b => b.id === beneficiaryId);
    if (targetBen) {
      sendFreeWhatsAppAlert({
        recipientPhone: targetBen.phone,
        recipientName: targetBen.name,
        messageType: 'PRESCRIPTION_DISPATCH',
        language: language,
        rchId: targetBen.rchId,
        village: targetBen.village
      }).then(res => {
        setSosToast({
          open: true,
          message: `🩺 e-Prescription saved. ${describeAlertOutcome(res, targetBen.name)}`
        });
        setTimeout(() => setSosToast({ open: false, message: '' }), 6000);
      });
    }
  };

  // Handler: Trigger sync process
  const handleTriggerSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    const result = await processSyncQueue();
    setIsSyncing(false);
    if (!result.success) {
      setSosToast({ open: true, message: `⚠️ ${result.errors.length} change(s) could not be synced and are still queued. They will be retried.` });
      setTimeout(() => setSosToast({ open: false, message: '' }), 6000);
    }
    setPendingSyncCount(getPendingSyncMutations().length);
  };

  // Handler: Emergency 108 SOS. There is no automatic 108 integration, so this opens the
  // phone dialer for 108 and never reports an ambulance as dispatched.
  const handleEmergencySOS = (beneficiary: Beneficiary) => {
    setSosToast({
      open: true,
      message: `🚨 Opening phone dialer for 108. You must place the call: no ambulance has been requested yet. Patient: ${beneficiary.name} (RCH: ${beneficiary.rchId}), ${beneficiary.village}.`
    });
    setTimeout(() => {
      setSosToast({ open: false, message: '' });
    }, 15000);
    openEmergency108Dialer();
  };

  // Handler: Record ASHA Voice Note
  const handleRecordAudioNote = (beneficiary: Beneficiary, transcript: string) => {
    console.log(`Audio note logged for ${beneficiary.name}: ${transcript}`);
  };

  // 0. Starting Boot Animation (Initial Splash Screen)
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} language={language} />;
  }

  // 1. Post-Authentication Loading Animation (Role-Based Provisioning)
  if (isAuthLoading) {
    return (
      <AuthLoadingScreen
        role={activeRole}
        userName={userName}
        language={language}
        onFinished={() => setIsAuthLoading(false)}
      />
    );
  }

  // Waiting for Firebase Auth to restore any existing session
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-bold text-slate-500">
        Loading MaatriSaarthi…
      </div>
    );
  }

  // Staff accounts must be approved by a Ward Officer before they can see patient data
  if (isPendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full silky-card rounded-2xl p-6 text-center space-y-3">
          <h1 className="text-lg font-black text-slate-950 dark:text-white">Account pending approval</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {userName}, your account has been created. A Ward Officer must approve it before you can
            access patient records. Please contact your PHC or ward administrator.
          </p>
          <button type="button" onClick={handleLogout} className="btn-pill-primary w-full py-3 text-xs font-black cursor-pointer">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // 2. If not logged in: Show the Step-by-Step Role Selection & Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen font-sans flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950">
      {passNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)] bg-amber-50 text-amber-900 border border-amber-300 rounded-xl shadow-lg p-3 text-xs font-bold flex items-start gap-2">
          <span className="flex-1">{passNotice}</span>
          <button type="button" onClick={() => setPassNotice(null)} className="font-black cursor-pointer" aria-label="Dismiss">✕</button>
        </div>
      )}
        <LoginPage
          onLoginSuccess={applyProfile}
          onRegisterBeneficiary={handleRegisterBeneficiary}
          language={language}
          onLanguageChange={setLanguage}
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          onOpenVoiceTutorial={() => setIsTourOpen(true)}
          compactLayout={appLayout}
        />

        {/* Live Spotlight Pointer Tour with Real Red Arrow & Spoken Voice */}
        {isTourOpen && (
          <LiveSpotlightPointerTour
            isOpen={isTourOpen}
            onClose={() => setIsTourOpen(false)}
            language={language}
            onLanguageChange={setLanguage}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* DPDP Act 2023 Patient Record Consent & 5-10 Min Auto-Lock Portal (When Scanned) */}
        {consentModalBeneficiary && (
          <PatientRecordConsentPortal
            beneficiary={consentModalBeneficiary}
            language={language}
            onClose={() => setConsentModalBeneficiary(null)}
            onRequestEmergencySOS={handleEmergencySOS}
          />
        )}
      </div>
    );
  }

  // 3. Logged In: Role-Tailored Platform Dashboard
  return (
    <div className={`min-h-screen font-sans selection:bg-teal-500 selection:text-slate-950 relative ${appLayout ? '' : 'lg:flex'}`}>

      {/* Website: persistent left sidebar on large screens */}
      {!appLayout && (
        <WebSidebar
          language={language}
          activeRole={activeRole}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          userName={userName}
          onLogout={handleLogout}
          onOpenAlertCenter={() => setIsAlertCenterOpen(true)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">

      {appLayout ? (
        <AppTopBar
          language={language}
          activeRole={activeRole}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          isSyncing={isSyncing}
          onTriggerSync={handleTriggerSync}
          onOpenAlertCenter={() => setIsAlertCenterOpen(true)}
        />
      ) : (
      <WebTopBar
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        activeRole={activeRole}
        currentTab={currentTab}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        onOpenAlertCenter={() => setIsAlertCenterOpen(true)}
        onOpenVoiceTutorial={() => setIsTourOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />
      )}

      {/* Slide-in 3-Tier Sidebar Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        hideApkDownload={appLayout}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        activeRole={activeRole}
        userName={userName}
        userPhone={userPhone}
        onLogout={handleLogout}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={handleTriggerSync}
        onOpenAlertCenter={() => setIsAlertCenterOpen(true)}
      />

      {passNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)] bg-amber-50 text-amber-900 border border-amber-300 rounded-xl shadow-lg p-3 text-xs font-bold flex items-start gap-2">
          <span className="flex-1">{passNotice}</span>
          <button type="button" onClick={() => setPassNotice(null)} className="font-black cursor-pointer" aria-label="Dismiss">✕</button>
        </div>
      )}
      {/* Emergency SOS Toast */}
      {sosToast.open && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-red-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-white animate-bounce flex items-start gap-3">
          <PhoneCall className="w-6 h-6 text-white shrink-0 animate-pulse mt-0.5" />
          <div className="text-xs">
            <h4 className="font-black text-sm">EMERGENCY SOS BROADCAST ACTIVE</h4>
            <p className="mt-1 font-medium">{sosToast.message}</p>
          </div>
        </div>
      )}

      {/* Main Screen Body: Filtered and Rendered Based on Active Role */}
      <main className={appLayout ? 'w-full px-3 pt-4 pb-28 flex-1 space-y-6' : 'max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6'}>
        
        {/* PATIENT / MOTHER ROLE: Dedicated Personal Pass & Health Dashboard */}
        {activeRole === 'MOTHER' && (
          <MotherPersonalView
            language={language}
            beneficiary={beneficiaries.find(b => b.ownerUid === authProfile?.uid || (!!authProfile?.beneficiaryId && b.id === authProfile.beneficiaryId))}
            userName={userName}
            userPhone={userPhone}
            profile={authProfile}
            prefillConfirm={pendingConfirm}
          />
        )}

        {/* ASHA FIELD WORKER ROLE */}
        {activeRole === 'ASHA_WORKER' && (
          currentTab === 'registry' ? (
            <RegistryDueList
              beneficiaries={beneficiaries}
              selectedBeneficiary={selectedBeneficiary}
              onSelectBeneficiary={(b) => {
                setSelectedBeneficiaryId(b.id);
                setCurrentTab('mobile_app');
              }}
              language={language}
              onDispatchReminder={() => {}}
            />
          ) : currentTab === 'reminders' ? (
            <ReminderSandbox
              beneficiaries={beneficiaries}
              selectedBeneficiary={selectedBeneficiary}
              onSelectBeneficiary={(b) => setSelectedBeneficiaryId(b.id)}
              language={language}
              onUpdateConsent={() => {}}
            />
          ) : (
            <FieldWorkerMobileView
              beneficiaries={beneficiaries}
              selectedBeneficiary={selectedBeneficiary}
              onSelectBeneficiary={(b) => setSelectedBeneficiaryId(b.id)}
              onLogVisit={handleLogVisit}
              profile={authProfile}
              language={language}
              onAddVitalsRecord={handleAddVitalsRecord}
              onAddMedication={handleAddMedication}
              onUpdatePregnancy={handleUpdatePregnancy}
              onRegisterBeneficiary={handleRegisterBeneficiary}
              onSendEmergencySOS={handleEmergencySOS}
              onRecordAudioNote={handleRecordAudioNote}
              isOnline={isOnline}
            />
          )
        )}

        {/* PHC DOCTOR ROLE */}
        {activeRole === 'PHC_DOCTOR' && (
          currentTab === 'registry' ? (
            <RegistryDueList
              beneficiaries={beneficiaries}
              selectedBeneficiary={selectedBeneficiary}
              onSelectBeneficiary={(b) => {
                setSelectedBeneficiaryId(b.id);
                setCurrentTab('doctor_portal');
              }}
              language={language}
              onDispatchReminder={() => {}}
            />
          ) : currentTab === 'reminders' ? (
            <ReminderSandbox
              beneficiaries={beneficiaries}
              selectedBeneficiary={selectedBeneficiary}
              onSelectBeneficiary={(b) => setSelectedBeneficiaryId(b.id)}
              language={language}
              onUpdateConsent={() => {}}
            />
          ) : (
            <DoctorWebPortal
              beneficiaries={beneficiaries}
              selectedBeneficiary={selectedBeneficiary}
              onSelectBeneficiary={(b) => setSelectedBeneficiaryId(b.id)}
              language={language}
              onIssuePrescription={handleIssuePrescription}
              onDispatchNotification={() => {}}
              doctorId={authProfile?.uid}
              doctorName={userName}
              facility={authProfile?.village || 'PHC'}
            />
          )
        )}

        {/* WARD OFFICER / ADMIN ROLE */}
        {activeRole === 'WARD_OFFICER' && (
          currentTab === 'registry' ? (
            <RegistryDueList
              beneficiaries={beneficiaries}
              selectedBeneficiary={selectedBeneficiary}
              onSelectBeneficiary={(b) => {
                setSelectedBeneficiaryId(b.id);
                setCurrentTab('ward_dashboard');
              }}
              language={language}
              onDispatchReminder={() => {}}
            />
          ) : currentTab === 'reminders' ? (
            <ReminderSandbox
              beneficiaries={beneficiaries}
              selectedBeneficiary={selectedBeneficiary}
              onSelectBeneficiary={(b) => setSelectedBeneficiaryId(b.id)}
              language={language}
              onUpdateConsent={() => {}}
            />
          ) : (
            <WardDashboard
              beneficiaries={beneficiaries}
              language={language}
            />
          )
        )}
      </main>

      {/* Minimal Footer (inside the content column so it cannot squeeze it in the sidebar layout) */}
      <footer className="max-w-7xl mx-auto w-full px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-white/10 mt-8">
        <p>MaatriSaarthi • Real-Time Maternal & Child Health Platform</p>
      </footer>
      </div>

      {/* Android app: bottom tab bar ("More" opens the drawer with settings and sign out) */}
      {appLayout && (
        <AppBottomNav
          language={language}
          activeRole={activeRole}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onOpenMore={() => setIsSidebarOpen(true)}
        />
      )}

      {/* Live Spotlight Pointer Tour with Real Red Arrow & Voice Speech */}
      {isTourOpen && (
        <LiveSpotlightPointerTour
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          language={language}
          onLanguageChange={setLanguage}
          isLoggedIn={isLoggedIn}
          activeRole={activeRole}
            onTabChange={setCurrentTab}
        />
      )}

      {/* Global Modals */}

      {isAlertCenterOpen && (
        <AlertCenterModal
          isOpen={isAlertCenterOpen}
          onClose={() => setIsAlertCenterOpen(false)}
          beneficiaries={beneficiaries}
          selectedBeneficiary={selectedBeneficiary}
          onSelectBeneficiary={(b) => {
            setSelectedBeneficiaryId(b.id);
            if (activeRole === 'PHC_DOCTOR') setCurrentTab('doctor_portal');
            else setCurrentTab('mobile_app');
            setIsAlertCenterOpen(false);
          }}
          onTriggerAlert={(alertType, b) => {
            if (alertType === '108_SOS') {
              handleEmergencySOS(b);
            } else if (alertType === 'CONSENT_REQUEST') {
              setConsentModalBeneficiary(b);
            } else {
              const msgType = alertType === 'HIGH_RISK_REFERRAL' ? 'HIGH_RISK_ALERT' : alertType === 'PMSMA_CAMP' ? 'PMSMA_REMINDER' : 'IFA_NUTRITION';
              sendFreeWhatsAppAlert({
                recipientPhone: b.phone,
                recipientName: b.name,
                messageType: msgType,
                language: language,
                rchId: b.rchId,
                village: b.village
              }).then(res => {
                setSosToast({ open: true, message: describeAlertOutcome(res, b.name) });
                setTimeout(() => setSosToast({ open: false, message: '' }), 6000);
              });
            }
          }}
          language={language}
        />
      )}

      {/* Device Permissions & DPDP Consent Modal */}
      {isPermissionsOpen && (
        <DevicePermissionsModal
          isOpen={isPermissionsOpen}
          onClose={() => setIsPermissionsOpen(false)}
          language={language}
        />
      )}

      {/* DPDP Act 2023 Patient Record Consent & 5-10 Min Auto-Lock Portal */}
      {consentModalBeneficiary && (
        <PatientRecordConsentPortal
          beneficiary={consentModalBeneficiary}
          language={language}
          onClose={() => setConsentModalBeneficiary(null)}
          onRequestEmergencySOS={handleEmergencySOS}
        />
      )}

    </div>
  );
}
export default App;
