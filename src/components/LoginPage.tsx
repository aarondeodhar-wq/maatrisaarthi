import React, { useState } from 'react';
import { APK_DOWNLOAD_URL, APK_SIZE_LABEL } from '../core/appRelease';
import { Language, UserRole } from '../types';
import { 
  Heart, 
  Smartphone, 
  Stethoscope, 
  Building2,
  ShieldCheck,
  Phone, 
  CheckCircle2, 
  MessageSquare, 
  KeyRound, 
  UserPlus, 
  Sun, 
  Moon, 
  Calendar, 
  ChevronRight, 
  ArrowLeft,
  ArrowRight,
  RefreshCw, 
  AlertCircle, 
  Sparkles,
  Volume2,
  Zap,
  Activity,
  Lock,
  Check,
  UploadCloud,
  PhoneCall,
  QrCode,
  BarChart3,
  Users,
  Droplets,
  Scale,
  Gauge,
  FileSpreadsheet,
  AlertTriangle,
  Download
} from 'lucide-react';
import { Beneficiary, VitalRecord } from '../types';
import { registerUserAccount, loginWithGoogleAccount, signInWithPassword, ensureUserProfile, linkBeneficiaryToProfile, describeAuthError, makeDemoProfile, UserProfile } from '../core/firebaseAuth';
import { dispatchRealSmsOtp, verifyRealSmsOtp } from '../core/realOtpService';
import { saveBeneficiaryToCloud } from '../core/offlineStore';
import { calculateEDD, calculateGestationalWeeks, generateANCSchedule, toLocalDateString } from '../core/protocolEngine';
import { predictMaternalRisk } from '../core/mlRiskEngine';
import { createDefaultDPDPConsent } from '../core/dpdpCompliance';

interface LoginPageProps {
  onLoginSuccess: (profile: UserProfile) => void;
  onRegisterBeneficiary?: (newB: Beneficiary) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenVoiceTutorial?: () => void;
  // Android app: show only the login card (no landing hero or APK download links)
  compactLayout?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onRegisterBeneficiary,
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  onOpenVoiceTutorial,
  compactLayout = false
}) => {
  // Tabs: 'SIGNIN' vs 'SIGNUP'
  const [activeTab, setActiveTab] = useState<'SIGNIN' | 'SIGNUP'>('SIGNIN');

  // Selected Role
  const [selectedRole, setSelectedRole] = useState<UserRole>('ASHA_WORKER');

  // Login Verification Method (all verified by Firebase Auth)
  const [loginMethod, setLoginMethod] = useState<'PHONE' | 'GOOGLE' | 'PASSWORD'>('PASSWORD');

  // Inputs
  const [phoneInput, setPhoneInput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [otpInput, setOtpInput] = useState('');

  // Status & Alerts
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Comprehensive Maternal Clinical Registration State
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAge, setSignupAge] = useState<number>(24);
  const [signupHusband, setSignupHusband] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('MOTHER');
  const [signupVillage, setSignupVillage] = useState('Koregaon Bhima');
  const [signupPin, setSignupPin] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  // Pregnancy & Menstrual Cycle Details
  const [signupLmp, setSignupLmp] = useState('2026-03-01');
  const [signupGravidity, setSignupGravidity] = useState<number>(1);
  const [signupParity, setSignupParity] = useState<number>(0);
  const [signupHasPrevCesarean, setSignupHasPrevCesarean] = useState<boolean>(false);
  
  // Vital & Blood Reports (Clinical Baseline)
  const [signupBloodGroup, setSignupBloodGroup] = useState('B+');
  const [signupHb, setSignupHb] = useState<number>(10.5);
  const [signupSystolic, setSignupSystolic] = useState<number>(120);
  const [signupDiastolic, setSignupDiastolic] = useState<number>(80);
  const [signupBloodSugar, setSignupBloodSugar] = useState<number>(95);
  const [signupWeight, setSignupWeight] = useState<number>(54);
  const [signupHeight, setSignupHeight] = useState<number>(155);
  const [signupHasBleeding, setSignupHasBleeding] = useState<boolean>(false);
  const [signupHasSevereHeadache, setSignupHasSevereHeadache] = useState<boolean>(false);
  const [signupHasEdema, setSignupHasEdema] = useState<boolean>(false);
  const [signupHasConvulsions, setSignupHasConvulsions] = useState<boolean>(false);
  const [signupGovtId, setSignupGovtId] = useState('');

  // Titles dictionary matching media_1786957429547.png
  const t = {
    appName: {
      mr: 'मातृसारथी (MaatriSaarthi)',
      hi: 'मातृसारथी (MaatriSaarthi)',
      en: 'MaatriSaarthi'
    },
    appSub: {
      mr: 'सुरक्षित मातृत्व — उच्च जोखीम गर्भधारणा ट्रॅकिंग व काळजी प्रणाली',
      hi: 'सुरक्षित मातृत्व — उच्च जोखिम गर्भावस्था ट्रैकिंग व देखभाल प्रणाली',
      en: 'Safe Motherhood — Clinical Risk Stratification & Maternal Care'
    },
    heroTitle: {
      mr: 'माता व बाल आरोग्यासाठी स्मार्ट डिजिटल सुरक्षा',
      hi: 'माता व शिशु स्वास्थ्य के लिए स्मार्ट डिजिटल सुरक्षा',
      en: 'Smart Digital Safety for Maternal & Child Health'
    },
    heroSub: {
      mr: 'गर्भवती माता, आशा सेविका आणि डॉक्टरांना जोडणारे आधुनिक डिजिटल आरोग्य व्यासपीठ.',
      hi: 'गर्भवती माताओं, आशा कार्यकर्ताओं और डॉक्टरों को जोड़ने वाला आधुनिक डिजिटल स्वास्थ्य मंच।',
      en: 'An advanced digital healthcare platform uniting pregnant mothers, ASHA workers, and medical officers.'
    },
    feat1Title: {
      mr: '1-Tap Fast Identity',
      hi: '1-Tap Fast Identity',
      en: '1-Tap Fast Identity'
    },
    feat1Desc: {
      mr: 'Secure verification via SMS OTP, Google, or password.',
      hi: 'SMS OTP, Google या पासवर्ड द्वारा सुरक्षित सत्यापन।',
      en: 'Secure verification via SMS OTP, Google, or password.'
    },
    feat2Title: {
      mr: 'Clinical Risk Triage',
      hi: 'Clinical Risk Triage',
      en: 'Clinical Risk Triage'
    },
    feat2Desc: {
      mr: 'Instant color-coded risk assessment for high-risk vitals.',
      hi: 'उच्च जोखिम वाले लक्षणों के लिए त्वरित रंग-कोडित जोखिम मूल्यांकन।',
      en: 'Instant color-coded risk assessment for high-risk vitals.'
    },
    feat3Title: {
      mr: '8-ANC & PMSMA Timeline',
      hi: '8-ANC & PMSMA Timeline',
      en: '8-ANC & PMSMA Timeline'
    },
    feat3Desc: {
      mr: 'Automated checkup schedule with due date alerts.',
      hi: 'जांच अनुसूची और नियत तारीख अलर्ट के साथ स्वचालित अनुवर्ती।',
      en: 'Automated checkup schedule with due date alerts.'
    },
    quickAccess: {
      mr: '⚡ Quick 1-Click Access:',
      hi: '⚡ Quick 1-Click Access:',
      en: '⚡ Quick 1-Click Access:'
    },
    tabSignIn: {
      mr: 'लॉगिन करा (Sign In)',
      hi: 'लॉगिन करें (Sign In)',
      en: 'Sign In'
    },
    tabSignUp: {
      mr: 'नवीन नोंदणी (Sign Up)',
      hi: 'नया पंजीकरण (Sign Up)',
      en: 'Sign Up'
    },
    chooseRole: {
      mr: 'तुमची भूमिका निवडा:',
      hi: 'अपनी भूमिका चुनें:',
      en: 'Select Your Role:'
    },
    chooseMethod: {
      mr: 'लॉगिन पद्धत निवडा:',
      hi: 'लॉगिन विधि चुनें:',
      en: 'Choose Verification Method:'
    },
    roles: {
      asha: {
        title: { mr: 'आशा सेविका', hi: 'आशा कार्यकर्ता', en: 'ASHA Worker' },
        sub: { mr: 'Field Console', hi: 'Field Console', en: 'Field Console' }
      },
      doctor: {
        title: { mr: 'डॉक्टर / MO', hi: 'चिकित्सा अधिकारी', en: 'Doctor / MO' },
        sub: { mr: 'Web Portal', hi: 'Web Portal', en: 'Web Portal' }
      },
      mother: {
        title: { mr: 'गर्भवती माता', hi: 'गर्भवती माता', en: 'Mother / Patient' },
        sub: { mr: 'MCP Pass', hi: 'MCP Pass', en: 'MCP Pass' }
      },
      admin: {
        title: { mr: 'प्रभाग अधिकारी', hi: 'प्रशासक / अधिकारी', en: 'Ward Officer' },
        sub: { mr: 'Analytics', hi: 'Analytics', en: 'Analytics' }
      }
    },
    signInBtn: {
      mr: 'प्रवेश करा (Sign In)',
      hi: 'प्रवेश करें (Sign In)',
      en: 'Sign In to Dashboard'
    }
  };

  const handleRoleSelection = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  // Dispatch SMS OTP via Firebase Phone Auth
  const handleSendOtp = async () => {
    setErrorMessage(null);
    if (!phoneInput || phoneInput.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    setIsVerifying(true);
    try {
      await dispatchRealSmsOtp(phoneInput);
      setOtpSent(true);
    } catch (err: any) {
      setErrorMessage('Could not send OTP: ' + describeAuthError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setLoginMethod('GOOGLE');
    setIsVerifying(true);
    try {
      const profile = await loginWithGoogleAccount(selectedRole);
      onLoginSuccess(profile);
    } catch (err: any) {
      setErrorMessage('Google Sign-In failed: ' + describeAuthError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  // Login Submit Handler (SMS OTP & Password)
  const handleSignIn = async () => {
    setErrorMessage(null);

    if (loginMethod === 'GOOGLE') {
      await handleGoogleLogin();
      return;
    }

    if (loginMethod === 'PHONE') {
      if (!otpSent) {
        await handleSendOtp();
        return;
      }
      if (!/^\d{6}$/.test(otpInput.trim())) {
        setErrorMessage('Please enter the 6-digit OTP code.');
        return;
      }
      setIsVerifying(true);
      try {
        const user = await verifyRealSmsOtp(otpInput);
        const profile = await ensureUserProfile(user, selectedRole);
        onLoginSuccess(profile);
      } catch (err: any) {
        setErrorMessage(describeAuthError(err));
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    if (loginMethod === 'PASSWORD') {
      if (!userInput.trim() || !passwordInput) {
        setErrorMessage('Please enter your mobile number and password.');
        return;
      }
      setIsVerifying(true);
      try {
        const profile = await signInWithPassword(userInput, passwordInput);
        onLoginSuccess(profile);
      } catch (err: any) {
        setErrorMessage(describeAuthError(err));
      } finally {
        setIsVerifying(false);
      }
    }
  };

  // Comprehensive Sign Up Handler with Maternal Baseline & Risk Triage
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signupName.trim()) {
      setErrorMessage(language === 'mr' ? 'कृपया पूर्ण नाव प्रविष्ट करा.' : language === 'hi' ? 'कृपया पूरा नाम दर्ज करें।' : 'Please enter your full name.');
      return;
    }
    if (!signupPhone.trim() || signupPhone.replace(/\D/g, '').length < 10) {
      setErrorMessage(language === 'mr' ? 'कृपया वैध १०-अंकी मोबाईल क्रमांक प्रविष्ट करा.' : language === 'hi' ? 'कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMessage(language === 'mr' ? 'पासवर्ड किमान ६ अक्षरांचा असावा.' : language === 'hi' ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'Password must be at least 6 characters.');
      return;
    }
    if (signupRole === 'MOTHER' && signupPin && !/^\d{4}$/.test(signupPin)) {
      setErrorMessage(language === 'mr' ? 'पिन ४ अंकी असावा.' : language === 'hi' ? 'पिन 4 अंकों का होना चाहिए।' : 'PIN must be exactly 4 digits.');
      return;
    }

    setIsVerifying(true);

    try {
      if (signupRole === 'MOTHER') {
        // Create the Firebase Auth account first so the record can be owned by it
        const profile = await registerUserAccount({
          name: signupName.trim(),
          phone: signupPhone.trim(),
          role: 'MOTHER',
          village: signupVillage,
          password: signupPassword,
          lmp: signupLmp
        });

        const weeks = calculateGestationalWeeks(signupLmp);
        const edd = calculateEDD(signupLmp);
        const rchId = 'MH-2026-' + Math.floor(1000 + Math.random() * 9000);
        const pin = signupPin || Math.floor(1000 + Math.random() * 9000).toString();
        const beneficiaryId = 'ben_' + Date.now();

        const initialVital: VitalRecord = {
          id: 'vit_init_' + Date.now(),
          date: toLocalDateString(),
          gestationalWeek: weeks,
          systolicBP: Number(signupSystolic),
          diastolicBP: Number(signupDiastolic),
          hemoglobin: Number(signupHb),
          bloodSugar: Number(signupBloodSugar),
          weightKg: Number(signupWeight),
          urineProtein: 'NIL',
          symptoms: {
            hasVaginalBleeding: signupHasBleeding,
            hasSevereHeadache: signupHasSevereHeadache,
            hasBlurredVision: false,
            hasFacialEdema: signupHasEdema,
            hasReducedFetalMovement: false,
            hasConvulsions: signupHasConvulsions,
            hasHighFever: false
          },
          mlRiskScore: 0.15,
          riskTier: 'GREEN',
          riskReasons: [],
          recordedBy: 'Self Registered (Baseline Intake)',
          facility: signupVillage + ' PHC',
          syncStatus: 'LOCAL'
        };

        // Predict ML Risk Tier
        const riskResult = predictMaternalRisk({
          age: Number(signupAge),
          systolicBP: Number(signupSystolic),
          diastolicBP: Number(signupDiastolic),
          hemoglobin: Number(signupHb),
          bloodSugar: Number(signupBloodSugar),
          weightKg: Number(signupWeight),
          parity: Number(signupParity),
          gestationalWeeks: weeks,
          hasPrevCesarean: signupHasPrevCesarean,
          hasBleeding: signupHasBleeding,
          hasSevereHeadache: signupHasSevereHeadache,
          hasFacialEdema: signupHasEdema,
          hasConvulsions: signupHasConvulsions
        });
        const riskFactors = riskResult.explainability.map(e => e.feature);
        initialVital.mlRiskScore = riskResult.riskProbability;
        initialVital.riskTier = riskResult.riskTier;
        initialVital.riskReasons = riskFactors;

        // Generate 8-ANC Schedule
        const ancSchedule = generateANCSchedule(signupLmp, signupVillage + ' PHC');


        const newBeneficiary: Beneficiary = {
          id: beneficiaryId,
          rchId: rchId,
          name: signupName.trim(),
          age: Number(signupAge),
          phone: signupPhone.trim(),
          husbandName: signupHusband.trim() || 'Rajesh',
          village: signupVillage,
          ward: 'Shirur Taluka Ward 4',
          district: 'Pune',
          assignedAsha: {
            name: 'Savita Patil',
            phone: '+91 97654 32101'
          },
          lmp: signupLmp,
          edd: edd,
          currentGestationalWeeks: weeks,
          gravidity: Number(signupGravidity),
          parity: Number(signupParity),
          hasPrevCesarean: signupHasPrevCesarean,
          hasPastStillbirth: false,
          bloodGroup: signupBloodGroup,
          currentRiskTier: riskResult.riskTier,
          mlRiskScore: riskResult.riskProbability,
          riskFactors: riskFactors,
          ancSchedule: ancSchedule,
          vitalsHistory: [initialVital],
          prescriptions: [],
          audioNotes: [],
          dpdpConsent: createDefaultDPDPConsent(language),
          qrAuthToken: '', // QR is generated on demand from the record ID
          accessPin: pin,
          ownerUid: profile.uid,
          registeredAt: new Date().toISOString(),
          lastSyncedAt: new Date().toISOString()
        };

        await saveBeneficiaryToCloud(newBeneficiary);
        await linkBeneficiaryToProfile(profile.uid, beneficiaryId);

        if (onRegisterBeneficiary) {
          onRegisterBeneficiary(newBeneficiary);
        }

        setIsVerifying(false);
        onLoginSuccess({ ...profile, beneficiaryId });
      } else {
        // ASHA, Doctor, Ward Officer Registration
        const newUser = await registerUserAccount({
          name: signupName.trim(),
          phone: signupPhone.trim(),
          role: signupRole,
          village: signupVillage,
          password: signupPassword,
          doctorReg: signupGovtId
        });

        // Staff accounts start unapproved; App shows the pending-approval screen
        setIsVerifying(false);
        onLoginSuccess(newUser);
      }
    } catch (e: any) {
      setIsVerifying(false);
      setErrorMessage('Registration failed: ' + describeAuthError(e));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-3 sm:p-6 lg:p-8 font-sans relative">
      {/* Top Application Header (Responsive & Compact) */}
      <header className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3">

          <img 
            src="/logo.png" 
            alt="MaatriSaarthi Logo" 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl shadow-lg object-cover border border-white/20 shrink-0" 
          />
          <div>
            <h1 className="text-sm sm:text-lg font-black tracking-tight text-slate-950 dark:text-white leading-none">
              {t.appName[language]}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5 hidden sm:block">
              {t.appSub[language]}
            </p>
          </div>
        </div>

        {/* Action Controls: Android APK, Voice Guide, Night/Day & Language Switcher (Squircle Shapes) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Download Android APK Direct Button */}
          {!compactLayout && (
          <a
            href={APK_DOWNLOAD_URL}
            download="MaatriSaarthi.apk"
            className="flex items-center gap-1 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black hover:bg-emerald-500/30 hover:scale-105 transition cursor-pointer shadow-xs"
            title={`Download Android App (APK, ${APK_SIZE_LABEL})`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{language === 'mr' ? 'Android ॲप' : language === 'hi' ? 'Android ऐप' : 'Android APK'}</span>
            <span className="sm:hidden">APK</span>
          </a>
          )}

          {/* Voice Tutorial Button with Live Glow */}
          {onOpenVoiceTutorial && (
            <button
              id="tour-voice-guide-btn"
              type="button"
              onClick={onOpenVoiceTutorial}
              className="flex items-center gap-1 bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/40 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black hover:bg-teal-500/30 hover:scale-105 transition cursor-pointer shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-pulse" />
              <span>Voice Guide</span>
            </button>
          )}

          {/* Day / Night Theme Button */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1 silky-glass hover:bg-white/40 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-white/20 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer transition shadow-xs"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Day' : 'Night'}</span>
          </button>

          {/* 3 Language Pills (मराठी | हिंदी | English - Squircle) */}
          <div id="tour-lang-picker" className="flex items-center bg-slate-100 dark:bg-white/10 p-0.5 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-bold shadow-xs">
            <button
              onClick={() => onLanguageChange('mr')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg cursor-pointer transition ${
                language === 'mr' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs font-black' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg cursor-pointer transition ${
                language === 'hi' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs font-black' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg cursor-pointer transition ${
                language === 'en' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs font-black' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Split (Responsive: Login Card on Top on Mobile, Dual-Column on Desktop) */}
      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start my-4 py-2">
        
        {/* =========================================================================
            RIGHT COLUMN: MAIN WHITE PORCELAIN LOGIN CARD (On Top on Mobile: order-1)
           ========================================================================= */}
        <div className="order-1 lg:order-2 lg:col-span-7">
          <div className="reference-hero-card p-6 sm:p-8 space-y-5">
            
            {/* Top Tab Pill Switcher: Sign In vs Sign Up */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-black/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('SIGNIN')}
                className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'SIGNIN'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                }`}
              >
                <span>{t.tabSignIn[language]}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SIGNUP')}
                className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'SIGNUP'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                }`}
              >
                <span>{t.tabSignUp[language]}</span>
              </button>
            </div>

            {/* Error Message Toast */}
            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/70 border border-red-500 p-3 rounded-2xl text-xs text-red-900 dark:text-red-100 flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SIGN IN TAB */}
            {activeTab === 'SIGNIN' ? (
              <div className="space-y-5">
                {/* 1. Choose Role */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {t.chooseRole[language]}
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* ASHA Field Worker */}
                    <button
                      id="tour-role-asha"
                      type="button"
                      onClick={() => handleRoleSelection('ASHA_WORKER')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 group shadow-xs jiggly-spring ${
                        selectedRole === 'ASHA_WORKER'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-teal-500 shadow-md shadow-teal-500/25 scale-[1.01]'
                          : 'silky-card hover:border-teal-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        selectedRole === 'ASHA_WORKER' ? 'bg-white/20 text-white' : 'bg-teal-500/15 text-teal-600'
                      }`}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={`text-xs font-black ${selectedRole === 'ASHA_WORKER' ? 'text-white' : 'text-slate-950 dark:text-white'}`}>
                          {t.roles.asha.title[language]}
                        </h4>
                        <span className={`text-[10px] block ${selectedRole === 'ASHA_WORKER' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          {t.roles.asha.sub[language]}
                        </span>
                      </div>
                    </button>

                    {/* Doctor / MO */}
                    <button
                      id="tour-role-doctor"
                      type="button"
                      onClick={() => handleRoleSelection('PHC_DOCTOR')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 group shadow-xs jiggly-spring ${
                        selectedRole === 'PHC_DOCTOR'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-teal-500 shadow-md shadow-teal-500/25 scale-[1.01]'
                          : 'silky-card hover:border-blue-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        selectedRole === 'PHC_DOCTOR' ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-600'
                      }`}>
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={`text-xs font-black ${selectedRole === 'PHC_DOCTOR' ? 'text-white' : 'text-slate-950 dark:text-white'}`}>
                          {t.roles.doctor.title[language]}
                        </h4>
                        <span className={`text-[10px] block ${selectedRole === 'PHC_DOCTOR' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          {t.roles.doctor.sub[language]}
                        </span>
                      </div>
                    </button>

                    {/* Mother / Patient */}
                    <button
                      id="tour-role-mother"
                      type="button"
                      onClick={() => handleRoleSelection('MOTHER')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 group shadow-xs jiggly-spring ${
                        selectedRole === 'MOTHER'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-teal-500 shadow-md shadow-teal-500/25 scale-[1.01]'
                          : 'silky-card hover:border-purple-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        selectedRole === 'MOTHER' ? 'bg-white/20 text-white' : 'bg-purple-500/15 text-purple-600'
                      }`}>
                        <Heart className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={`text-xs font-black ${selectedRole === 'MOTHER' ? 'text-white' : 'text-slate-950 dark:text-white'}`}>
                          {t.roles.mother.title[language]}
                        </h4>
                        <span className={`text-[10px] block ${selectedRole === 'MOTHER' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          {t.roles.mother.sub[language]}
                        </span>
                      </div>
                    </button>

                    {/* Ward Officer / Admin */}
                    <button
                      id="tour-role-admin"
                      type="button"
                      onClick={() => handleRoleSelection('WARD_OFFICER')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 group shadow-xs jiggly-spring ${
                        selectedRole === 'WARD_OFFICER'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-teal-500 shadow-md shadow-teal-500/25 scale-[1.01]'
                          : 'silky-card hover:border-amber-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        selectedRole === 'WARD_OFFICER' ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-600'
                      }`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className={`text-xs font-black ${selectedRole === 'WARD_OFFICER' ? 'text-white' : 'text-slate-950 dark:text-white'}`}>
                          {t.roles.admin.title[language]}
                        </h4>
                        <span className={`text-[10px] block ${selectedRole === 'WARD_OFFICER' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          {t.roles.admin.sub[language]}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Choose Method */}
                <div id="tour-verify-method" className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {t.chooseMethod[language]}
                  </span>

                  {/* Method Tab Pills */}
                  <div id="tour-method-tabs" className="grid grid-cols-3 gap-1.5">
                    {/* Phone Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('PHONE');
                        setErrorMessage(null);
                      }}
                      className={`p-2 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-1 cursor-pointer jiggly-spring ${
                        loginMethod === 'PHONE'
                          ? 'bg-teal-500/15 border-2 border-teal-500 text-teal-800 dark:text-teal-300 font-bold shadow-xs scale-[1.02]'
                          : 'silky-card hover:border-teal-400'
                      }`}
                    >
                      <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Phone</span>
                    </button>

                    {/* Official Multi-Color Google G Logo Tab */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className={`p-2 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-1 cursor-pointer jiggly-spring ${
                        loginMethod === 'GOOGLE'
                          ? 'bg-blue-600/15 border-2 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs scale-[1.02]'
                          : 'silky-card hover:border-blue-400'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Google</span>
                    </button>

                    {/* Password Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('PASSWORD');
                        setErrorMessage(null);
                      }}
                      className={`p-2 rounded-xl text-[11px] font-bold transition flex flex-col items-center gap-1 cursor-pointer jiggly-spring ${
                        loginMethod === 'PASSWORD'
                          ? 'bg-amber-600/15 border-2 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs scale-[1.02]'
                          : 'silky-card hover:border-amber-400'
                      }`}
                    >
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span>Password</span>
                    </button>
                  </div>

                  {/* Contextual Input Forms */}
                  {loginMethod === 'PHONE' && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={e => setPhoneInput(e.target.value)}
                          placeholder="10-digit mobile number"
                          className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isVerifying}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer shrink-0 shadow-xs"
                        >
                          {otpSent ? 'Resend' : 'Send OTP'}
                        </button>
                      </div>

                      {otpSent && (
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={e => setOtpInput(e.target.value)}
                          placeholder="Enter 6-Digit OTP"
                          className="w-full text-center tracking-widest font-mono text-base font-black p-2.5 rounded-xl border border-teal-500 bg-teal-500/10 text-slate-950 dark:text-white"
                        />
                      )}
                    </div>
                  )}

                  {loginMethod === 'PASSWORD' && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        placeholder="Mobile number or email"
                        autoComplete="username"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="Password"
                        autoComplete="current-password"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Invisible reCAPTCHA mount point required by Firebase Phone Auth */}
                <div id="recaptcha-container" />

                {/* Primary Sign In Action Button */}
                {loginMethod !== 'GOOGLE' && (
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={isVerifying}
                    className="btn-pill-primary w-full py-3.5 text-xs sm:text-sm font-black shadow-xl shadow-teal-500/25 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isVerifying ? 'Authenticating...' : t.signInBtn[language]}</span>
                  </button>
                )}

                {/* Demo login: opens the app on built-in sample data, no account or cloud access */}
                <div id="demo-login" className="pt-3 mt-1 border-t border-slate-200 dark:border-white/10 space-y-2">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                    {language === 'mr' ? 'डेमो पहा (खाते नको):' : language === 'hi' ? 'डेमो देखें (खाता नहीं चाहिए):' : 'Try the demo (no account needed):'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['ASHA_WORKER', 'ASHA Worker'],
                      ['PHC_DOCTOR', 'Doctor'],
                      ['WARD_OFFICER', 'Ward Officer'],
                      ['MOTHER', 'Mother']
                    ] as Array<[UserRole, string]>).map(([role, label]) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => onLoginSuccess(makeDemoProfile(role))}
                        className="btn-pill-secondary py-2 text-xs font-black cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {language === 'en' ? 'Sample data only. Nothing is saved to the cloud.' : 'फक्त नमुना माहिती. क्लाउडवर काहीही जतन होत नाही.'}
                  </p>
                </div>
              </div>
            ) : (
              /* SIGN UP TAB: COMPREHENSIVE CLINICAL INTAKE */
              <form onSubmit={handleSignUp} className="space-y-4">
                
                {/* 1. Choose Role for Sign Up */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                    {language === 'mr' ? 'नोंदणी प्रकार निवडा (Select Role):' : language === 'hi' ? 'पंजीकरण का प्रकार चुनें (Select Role):' : 'Select Registration Role:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSignupRole('MOTHER')}
                      className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                        signupRole === 'MOTHER'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs font-black'
                          : 'silky-card text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'माता (Mother)' : language === 'hi' ? 'माता (Mother)' : 'Mother / Patient'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignupRole('ASHA_WORKER')}
                      className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                        signupRole === 'ASHA_WORKER'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs font-black'
                          : 'silky-card text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'आशा (ASHA)' : language === 'hi' ? 'आशा (ASHA)' : 'ASHA Worker'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignupRole('PHC_DOCTOR')}
                      className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                        signupRole === 'PHC_DOCTOR'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs font-black'
                          : 'silky-card text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'डॉक्टर (Doctor)' : language === 'hi' ? 'डॉक्टर (Doctor)' : 'Doctor / MO'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignupRole('WARD_OFFICER')}
                      className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                        signupRole === 'WARD_OFFICER'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs font-black'
                          : 'silky-card text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'प्रभाग (Admin)' : language === 'hi' ? 'वार्ड (Admin)' : 'Ward Officer'}</span>
                    </button>
                  </div>
                </div>

                {/* =========================================================================
                    A. MATERNAL INTAKE FORM (Vitals, LMP, Weeks, Blood Reports, Danger Signs)
                   ========================================================================= */}
                {signupRole === 'MOTHER' ? (
                  <div className="space-y-4">
                    
                    {/* Section 1: Basic Identity & PIN */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-teal-800 dark:text-teal-300">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {language === 'mr' 
                            ? '१. प्राथमिक माहिती व सुरक्षित पिन (Identity & Access PIN)' 
                            : language === 'hi' 
                            ? '1. प्राथमिक जानकारी व सुरक्षित पिन (Identity & Access PIN)' 
                            : '1. Identity & 4-Digit Security PIN'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'पूर्ण नाव (Full Name) *' : language === 'hi' ? 'पूरा नाम (Full Name) *' : 'Full Legal Name *'}
                          </label>
                          <input
                            type="text"
                            value={signupName}
                            onChange={e => setSignupName(e.target.value)}
                            placeholder={language === 'mr' ? 'उदा. सुनिता राहुल शिंदे' : language === 'hi' ? 'उदा. सुनिता शर्मा' : 'e.g. Sunita Patil'}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'मोबाईल क्रमांक (Mobile Number) *' : language === 'hi' ? 'मोबाइल नंबर (Mobile Number) *' : 'Mobile Number (10 Digits) *'}
                          </label>
                          <input
                            type="tel"
                            value={signupPhone}
                            onChange={e => setSignupPhone(e.target.value)}
                            placeholder="+91 97654 32101"
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'वय (Age in Years)' : language === 'hi' ? 'आयु (Age in Years)' : 'Age (in Years)'}
                          </label>
                          <input
                            type="number"
                            min={15}
                            max={50}
                            value={signupAge}
                            onChange={e => setSignupAge(Number(e.target.value))}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'पती / पालकांचे नाव (Husband/Guardian)' : language === 'hi' ? 'पति / अभिभावक का नाम' : 'Husband / Guardian Name'}
                          </label>
                          <input
                            type="text"
                            value={signupHusband}
                            onChange={e => setSignupHusband(e.target.value)}
                            placeholder={language === 'mr' ? 'राहुल शिंदे' : language === 'hi' ? 'राहुल शर्मा' : 'e.g. Rajesh Patil'}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'गाव / उपकेंद्र (Village / PHC)' : language === 'hi' ? 'गाँव / स्वास्थ्य केंद्र' : 'Village / Assigned PHC'}
                          </label>
                          <input
                            type="text"
                            value={signupVillage}
                            onChange={e => setSignupVillage(e.target.value)}
                            placeholder="Koregaon Bhima"
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? '४-अंकी संमती पिन (4-Digit PIN)' : language === 'hi' ? '4-अंकीय सहमति पिन (4-Digit PIN)' : '4-Digit Consent PIN (optional)'}
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={signupPin}
                            onChange={e => setSignupPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                            className="w-full p-2 rounded-xl border border-teal-500 bg-teal-500/10 text-xs font-mono font-black text-center text-slate-950 dark:text-white tracking-widest"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'लॉगिन पासवर्ड (किमान ६ अक्षरे)' : language === 'hi' ? 'लॉगिन पासवर्ड (कम से कम 6 अक्षर)' : 'Login Password (min 6 characters)'}
                          </label>
                          <input
                            type="password"
                            value={signupPassword}
                            onChange={e => setSignupPassword(e.target.value)}
                            autoComplete="new-password"
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Menstrual Cycle & Gestational Age Calculator */}
                    <div className="p-3.5 rounded-2xl bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-teal-800 dark:text-teal-300">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {language === 'mr' 
                              ? '२. मासिक पाळी व गर्भधारणा कालावधी (LMP & Weeks)' 
                              : language === 'hi' 
                              ? '2. अंतिम माहवारी व गर्भावस्था सप्ताह (LMP & Weeks)' 
                              : '2. Gestational Timeline & LMP Calculator'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-full">
                          Auto-Calculated
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                            {language === 'mr' 
                              ? 'शेवटच्या मासिक पाळीची तारीख (LMP Date) *' 
                              : language === 'hi' 
                              ? 'अंतिम माहवारी की तारीख (LMP Date) *' 
                              : 'Last Menstrual Period (LMP Date) *'}
                          </label>
                          <input
                            type="date"
                            value={signupLmp}
                            onChange={e => setSignupLmp(e.target.value)}
                            className="w-full p-2 rounded-xl border border-teal-400 dark:border-teal-500/50 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                            {language === 'mr' 
                              ? 'मागील सिझेरियन शस्त्रक्रिया (Prior C-Section)?' 
                              : language === 'hi' 
                              ? 'पिछला सिजेरियन ऑपरेशन (Prior C-Section)?' 
                              : 'Prior Cesarean Delivery (C-Section)?'}
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSignupHasPrevCesarean(false)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                !signupHasPrevCesarean
                                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                                  : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {language === 'mr' ? 'नाही (No)' : language === 'hi' ? 'नहीं (No)' : 'No'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignupHasPrevCesarean(true)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                signupHasPrevCesarean
                                  ? 'bg-rose-600 text-white shadow-xs font-black'
                                  : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {language === 'mr' ? 'होय (Yes)' : language === 'hi' ? 'हाँ (Yes)' : 'Yes'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Live Gestational Calculation Card */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-teal-500/20 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block">
                            {language === 'mr' ? 'गर्भ वय (Weeks)' : language === 'hi' ? 'गर्भ आयु (Weeks)' : 'Gestational Age'}
                          </span>
                          <span className="text-xs font-black text-teal-700 dark:text-teal-300">
                            ⚡ {calculateGestationalWeeks(signupLmp)} {language === 'mr' ? 'आठवडे' : language === 'hi' ? 'सप्ताह' : 'Weeks'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block">
                            {language === 'mr' ? 'संभाव्य प्रसूती (EDD)' : language === 'hi' ? 'अनुमानित प्रसव (EDD)' : 'Estimated Due Date'}
                          </span>
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                            📅 {calculateEDD(signupLmp)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 block">
                            {language === 'mr' ? 'तिमाही (Trimester)' : language === 'hi' ? 'तिमाही (Trimester)' : 'Trimester'}
                          </span>
                          <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                            👶 {calculateGestationalWeeks(signupLmp) <= 12 ? '1st' : calculateGestationalWeeks(signupLmp) <= 27 ? '2nd' : '3rd'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Vitals & Blood Reports */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 dark:text-rose-300">
                        <Droplets className="w-3.5 h-3.5 text-rose-500" />
                        <span>
                          {language === 'mr' 
                            ? '३. तपासणी व रक्त अहवाल (Vitals & Blood Reports)' 
                            : language === 'hi' 
                            ? '3. स्वास्थ्य जांच व रक्त रिपोर्ट (Vitals & Blood Reports)' 
                            : '3. Clinical Vitals & Lab Reports'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Blood Group */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'रक्तगट (Blood Group)' : language === 'hi' ? 'रक्त समूह (Blood Group)' : 'Blood Group'}
                          </label>
                          <select
                            value={signupBloodGroup}
                            onChange={e => setSignupBloodGroup(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <option value="A+">A+</option>
                            <option value="B+">B+</option>
                            <option value="O+">O+</option>
                            <option value="AB+">AB+</option>
                            <option value="A-">A-</option>
                            <option value="B-">B-</option>
                            <option value="O-">O-</option>
                            <option value="AB-">AB-</option>
                          </select>
                        </div>

                        {/* Hemoglobin */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                              {language === 'mr' ? 'हिमोग्लोबिन (Hb)' : language === 'hi' ? 'हीमोग्लोबिन (Hb)' : 'Hemoglobin (Hb g/dL)'}
                            </label>
                            <span className={`text-[9px] font-bold ${signupHb < 7 ? 'text-rose-600' : signupHb < 11 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {signupHb < 7 ? 'Severe' : signupHb < 11 ? 'Moderate' : 'Normal'}
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.1"
                            min="4"
                            max="18"
                            value={signupHb}
                            onChange={e => setSignupHb(Number(e.target.value))}
                            className={`w-full p-2 rounded-xl border text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-black/40 ${
                              signupHb < 7 ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30' : 'border-slate-300 dark:border-white/20'
                            }`}
                          />
                        </div>

                        {/* Blood Pressure (BP) */}
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'रक्तदाब BP (Systolic/Diastolic)' : language === 'hi' ? 'रक्तचाप BP (Systolic/Diastolic)' : 'Blood Pressure (Sys / Dia mmHg)'}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={signupSystolic}
                              onChange={e => setSignupSystolic(Number(e.target.value))}
                              placeholder="120"
                              className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white text-center"
                            />
                            <span className="text-slate-400 font-bold">/</span>
                            <input
                              type="number"
                              value={signupDiastolic}
                              onChange={e => setSignupDiastolic(Number(e.target.value))}
                              placeholder="80"
                              className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white text-center"
                            />
                          </div>
                        </div>

                        {/* Blood Sugar */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'साखर Glucose (mg/dL)' : language === 'hi' ? 'ब्लड शुगर (mg/dL)' : 'Blood Glucose (mg/dL)'}
                          </label>
                          <input
                            type="number"
                            value={signupBloodSugar}
                            onChange={e => setSignupBloodSugar(Number(e.target.value))}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Weight */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'वजन Weight (kg)' : language === 'hi' ? 'वजन Weight (kg)' : 'Weight (kg)'}
                          </label>
                          <input
                            type="number"
                            value={signupWeight}
                            onChange={e => setSignupWeight(Number(e.target.value))}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Height */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'उंची Height (cm)' : language === 'hi' ? 'ऊंचाई Height (cm)' : 'Height (cm)'}
                          </label>
                          <input
                            type="number"
                            value={signupHeight}
                            onChange={e => setSignupHeight(Number(e.target.value))}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* BMI */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {language === 'mr' ? 'BMI निर्देशांक' : language === 'hi' ? 'BMI इंडेक्स' : 'BMI Index'}
                          </label>
                          <div className="p-2 rounded-xl bg-slate-200/60 dark:bg-white/10 text-xs font-black text-slate-800 dark:text-slate-200 text-center">
                            {(signupWeight / Math.pow(signupHeight / 100, 2)).toFixed(1)}
                          </div>
                        </div>
                      </div>

                      {/* Danger Signs Checklist */}
                      <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                        <label className="text-[10px] font-black text-rose-600 dark:text-rose-400 block">
                          {language === 'mr' 
                            ? 'धोक्याची लक्षणे आढळली आहेत का? (Any Danger Signs):' 
                            : language === 'hi' 
                            ? 'क्या कोई खतरे के लक्षण दिखाई दिए हैं? (Any Danger Signs):' 
                            : 'Any Maternal Danger Signs Observed?'}
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <label className={`p-2 rounded-xl border transition flex items-center gap-2 cursor-pointer ${
                            signupHasBleeding ? 'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200 font-bold' : 'silky-card'
                          }`}>
                            <input
                              type="checkbox"
                              checked={signupHasBleeding}
                              onChange={e => setSignupHasBleeding(e.target.checked)}
                              className="rounded text-rose-600"
                            />
                            <span className="text-[11px]">{language === 'mr' ? 'रक्तस्त्राव (Bleeding)' : language === 'hi' ? 'रक्तस्राव (Bleeding)' : 'Vaginal Bleeding'}</span>
                          </label>

                          <label className={`p-2 rounded-xl border transition flex items-center gap-2 cursor-pointer ${
                            signupHasSevereHeadache ? 'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200 font-bold' : 'silky-card'
                          }`}>
                            <input
                              type="checkbox"
                              checked={signupHasSevereHeadache}
                              onChange={e => setSignupHasSevereHeadache(e.target.checked)}
                              className="rounded text-rose-600"
                            />
                            <span className="text-[11px]">{language === 'mr' ? 'तीव्र डोकेदुखी (Headache)' : language === 'hi' ? 'गंभीर सिरदर्द (Headache)' : 'Severe Headache'}</span>
                          </label>

                          <label className={`p-2 rounded-xl border transition flex items-center gap-2 cursor-pointer ${
                            signupHasEdema ? 'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200 font-bold' : 'silky-card'
                          }`}>
                            <input
                              type="checkbox"
                              checked={signupHasEdema}
                              onChange={e => setSignupHasEdema(e.target.checked)}
                              className="rounded text-rose-600"
                            />
                            <span className="text-[11px]">{language === 'mr' ? 'चेहरा/पायावर सूज (Edema)' : language === 'hi' ? 'चेहरे/पैरों में सूजन (Edema)' : 'Facial / Pedal Edema'}</span>
                          </label>

                          <label className={`p-2 rounded-xl border transition flex items-center gap-2 cursor-pointer ${
                            signupHasConvulsions ? 'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200 font-bold' : 'silky-card'
                          }`}>
                            <input
                              type="checkbox"
                              checked={signupHasConvulsions}
                              onChange={e => setSignupHasConvulsions(e.target.checked)}
                              className="rounded text-rose-600"
                            />
                            <span className="text-[11px]">{language === 'mr' ? 'झटके (Convulsions)' : language === 'hi' ? 'दौरे (Convulsions)' : 'Convulsions / Fits'}</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Pre-Computed Risk Tier Preview Banner */}
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-500/15 via-blue-500/15 to-emerald-500/15 border border-teal-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <div>
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            AI Risk Stratification & 8-ANC Automation
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            DPDP Act 2023 256-Bit Cryptographic Medical Vault
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        (signupHb < 7 || signupSystolic >= 140 || signupHasBleeding || signupHasConvulsions)
                          ? 'bg-rose-600 text-white animate-pulse'
                          : (signupHb < 10 || signupSystolic >= 130 || signupHasEdema)
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {(signupHb < 7 || signupSystolic >= 140 || signupHasBleeding || signupHasConvulsions)
                          ? '🔴 Red Alert Tier'
                          : (signupHb < 10 || signupSystolic >= 130 || signupHasEdema)
                          ? '🟡 Yellow Tier'
                          : '🟢 Green Safe'}
                      </span>
                    </div>

                    {/* Big Maternal Sign Up Button */}
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="btn-pill-primary w-full py-3.5 text-xs sm:text-sm font-black shadow-xl shadow-teal-500/25 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {isVerifying 
                          ? (language === 'mr' ? 'नोंदणी प्रक्रिया सुरू आहे...' : language === 'hi' ? 'पंजीकरण प्रगति पर है...' : 'Registering Profile...') 
                          : (language === 'mr' ? '✨ वैद्यकीय प्रोफाइल नोंदवा व QR पास मिळवा' : language === 'hi' ? '✨ मेडिकल प्रोफाइल दर्ज करें व QR पास पाएं' : '✨ Register Medical Profile & Generate Digital QR Pass')}
                      </span>
                    </button>
                  </div>
                ) : (
                  /* =========================================================================
                      B. HEALTHCARE WORKER & DOCTOR REGISTRATION
                     ========================================================================= */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      placeholder={language === 'mr' ? 'पूर्ण नाव (उदा. डॉ. राजेश कुलकर्णी / सविता पाटील)' : language === 'hi' ? 'पूरा नाम (उदा. डॉ. राजेश / सविता)' : 'Full Name (e.g. Dr. Rajesh Joshi / Savita Patil)'}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                      required
                    />
                    <input
                      type="tel"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value)}
                      placeholder={language === 'mr' ? 'मोबाईल क्रमांक (Mobile Number)' : language === 'hi' ? 'मोबाइल नंबर (Mobile Number)' : 'Mobile Phone Number (+91)'}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                      required
                    />
                    <input
                      type="text"
                      value={signupGovtId}
                      onChange={e => setSignupGovtId(e.target.value)}
                      placeholder={language === 'mr' ? 'शासकीय नोंदणी क्र. / MMC Registration No.' : language === 'hi' ? 'सरकारी पंजीकरण संख्या / MMC Reg No.' : 'Government ID / Medical Council Registration No.'}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={signupVillage}
                      onChange={e => setSignupVillage(e.target.value)}
                      placeholder={language === 'mr' ? 'आरोग्य केंद्र / उपकेंद्र (उदा. Shirur PHC)' : language === 'hi' ? 'स्वास्थ्य केंद्र (उदा. Shirur PHC)' : 'Assigned PHC Health Facility / Block'}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder={language === 'mr' ? 'सुरक्षित पासवर्ड (किमान ६ अक्षरे)' : language === 'hi' ? 'सुरक्षित पासवर्ड (कम से कम 6 अक्षर)' : 'Secure Account Password (min 6 characters)'}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white"
                    />

                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="btn-pill-primary w-full py-3.5 text-xs sm:text-sm font-black shadow-xl shadow-teal-500/25 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {isVerifying 
                          ? (language === 'mr' ? 'नोंदणी सुरू आहे...' : language === 'hi' ? 'पंजीकरण प्रगति पर है...' : 'Creating Account...') 
                          : (language === 'mr' ? 'नोंदणी पूर्ण करा (Create Account)' : language === 'hi' ? 'पंजीकरण पूरा करें (Create Account)' : 'Complete Registration & Create Account')}
                      </span>
                    </button>
                  </div>
                )}

              </form>
            )}

          </div>
        </div>

        {/* =========================================================================
            LEFT COLUMN: HERO HEADLINE & 3 FEATURE CARDS + QUICK 1-CLICK DOCK
            (On Desktop: left column order-1; on Mobile: appears below login card order-2)
           ========================================================================= */}
        {!compactLayout && (
        <div className="order-2 lg:order-1 lg:col-span-5 space-y-5 animate-fadeIn">
          {/* Big Headline */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white leading-tight tracking-tight hero-headline-gradient">
              {t.heroTitle[language]}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              {t.heroSub[language]}
            </p>
          </div>

          {/* 3 Feature Cards */}
          <div className="space-y-3">
            {/* Feat 1: 1-Tap Fast Identity */}
            <div className="silky-card p-3.5 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white">
                  {t.feat1Title[language]}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.feat1Desc[language]}
                </p>
              </div>
            </div>

            {/* Feat 2: Clinical Risk Triage */}
            <div className="silky-card p-3.5 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white">
                  {t.feat2Title[language]}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.feat2Desc[language]}
                </p>
              </div>
            </div>

            {/* Feat 3: 8-ANC & PMSMA Timeline */}
            <div className="silky-card p-3.5 rounded-2xl flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white">
                  {t.feat3Title[language]}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.feat3Desc[language]}
                </p>
              </div>
            </div>

            {/* Feat 4: Android App Direct Download Card */}
            <a
              href={APK_DOWNLOAD_URL}
              download="MaatriSaarthi.apk"
              className="silky-card p-3.5 rounded-2xl flex items-center justify-between border-2 border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15 transition group shadow-md cursor-pointer"
              title={`Download Android App (APK, ${APK_SIZE_LABEL})`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition">
                  <Download className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-950 dark:text-white">
                      {language === 'mr' ? 'Android ॲप डाउनलोड करा (APK)' : language === 'hi' ? 'Android ऐप डाउनलोड करें (APK)' : 'Download Android App (APK)'}
                    </h4>
                    <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">
                      {APK_SIZE_LABEL}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {language === 'mr' ? 'आशा सेविका व मातांसाठी १-क्लिक इन्स्टॉल • पूर्ण ऑफलाइन सपोर्ट' : language === 'hi' ? 'आशा कार्यकर्ता व माताओं के लिए 1-क्लिक इंस्टॉल • ऑफलाइन सपोर्ट' : '1-Tap APK install for field workers & mothers • Offline ready'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition hidden sm:inline">
                ➔
              </span>
            </a>
          </div>

          {/* 1-CLICK 108 EMERGENCY SOS CALL BUTTON */}
          <a
            id="tour-108-sos"
            href="tel:108"
            className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-rose-600/30 transition cursor-pointer border border-white/20"
          >
            <PhoneCall className="w-5 h-5 fill-white animate-bounce" />
            <span>
              {language === 'mr' 
                ? '🚨 तात्काळ १०८ आपत्कालीन रुग्णवाहिका कॉल' 
                : language === 'hi' 
                ? '🚨 1-क्लिक 108 आपातकालीन एम्बुलेंस कॉल' 
                : '🚨 1-Click 108 Emergency Ambulance SOS'}
            </span>
          </a>
        </div>
        )}

      </main>

      {/* Minimal Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 dark:text-slate-400 py-2 border-t border-slate-200/60 dark:border-white/10 mt-auto">
        <p>MaatriSaarthi • Maternal & Child Healthcare Platform</p>
      </footer>
    </div>
  );
};
