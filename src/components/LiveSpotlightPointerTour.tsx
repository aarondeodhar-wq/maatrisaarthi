import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, UserRole } from '../types';
import { 
  Volume2, 
  VolumeX, 
  Square, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Sparkles,
  CheckCircle2,
  Heart,
  Smartphone,
  Stethoscope,
  Building2,
  Lock,
  PhoneCall
} from 'lucide-react';
import { speakTutorialAudio, stopTutorialAudio, unlockAudioPipeline } from '../core/voiceTutorialService';
import { isNativeApp } from '../core/nativeAuth';

export interface SpotlightStep {
  id: string;
  targetId: string;
  badge: string;
  title: Record<Language, string>;
  desc: Record<Language, string>;
  spokenText: Record<Language, string>;
  arrowDirection?: 'left' | 'right' | 'top' | 'bottom';
}

interface LiveSpotlightPointerTourProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isLoggedIn?: boolean;
  activeRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  onTabChange?: (tab: string) => void;
}

export const LiveSpotlightPointerTour: React.FC<LiveSpotlightPointerTourProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  isLoggedIn = false,
  activeRole = 'ASHA_WORKER',
  onRoleChange,
  onTabChange
}) => {
  const [selectedTourRole, setSelectedTourRole] = useState<UserRole>(activeRole);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  // In the native mobile app, native Android TTS (android.speech.tts.TextToSpeech) does not require
  // web gesture unlock. In web/mobile browsers, it stays silent until user interaction.
  const [audioReady, setAudioReady] = useState<boolean>(() => isNativeApp());
  const markAudioReady = () => {
    unlockAudioPipeline();
    setAudioReady(true);
  };

  // Sync tour role with platform activeRole when tour opens
  useEffect(() => {
    if (activeRole) {
      setSelectedTourRole(activeRole);
    }
  }, [activeRole, isOpen]);

  // Handle role switch inside tour
  const handleRoleSelect = (role: UserRole) => {
    setSelectedTourRole(role);
    setCurrentStepIndex(0);
    if (onRoleChange) {
      onRoleChange(role);
    }
    // Switch to corresponding default tab
    if (onTabChange) {
      if (role === 'MOTHER') onTabChange('mother_pass');
      else if (role === 'ASHA_WORKER') onTabChange('mobile_app');
      else if (role === 'PHC_DOCTOR') onTabChange('doctor_portal');
      else if (role === 'WARD_OFFICER') onTabChange('ward_dashboard');
    }
  };

  // Dedicated Tutorial Tracks for Patient (Mother), ASHA Worker, Doctor, Ward Officer & Login
  const getStepsForTrack = (): SpotlightStep[] => {
    if (!isLoggedIn) {
      return [
        {
          id: 'step_roles',
          targetId: 'tour-role-asha',
          badge: 'Step 1 of 5 • Roles',
          title: {
            mr: '१. तुमची भूमिका निवडा (Role Workstations)',
            hi: '1. अपनी भूमिका चुनें (Role Workstations)',
            en: '1. Select Your Role Workstation'
          },
          desc: {
            mr: 'आशा सेविका, डॉक्टर, गर्भवती माता किंवा प्रभाग अधिकारी यापैकी तुमची भूमिका निवडा.',
            hi: 'आशा कार्यकर्ता, डॉक्टर, गर्भवती माता या वार्ड अधिकारी में से अपनी भूमिका चुनें।',
            en: 'Choose your role: ASHA Worker, Medical Officer, Pregnant Mother, or Ward Public Health Officer.'
          },
          spokenText: {
            mr: 'पायरी १: येथे क्लिक करून तुमची भूमिका निवडा, जसे की आशा सेविका, डॉक्टर किंवा गर्भवती माता.',
            hi: 'चरण 1: यहाँ क्लिक करके अपनी भूमिका चुनें, जैसे कि आशा कार्यकर्ता, डॉक्टर या गर्भवती माता।',
            en: 'Step 1: Click here to choose your role workstation, such as ASHA Worker, Doctor, or Mother.'
          },
          arrowDirection: 'left'
        },
        {
          id: 'step_auth',
          targetId: 'tour-method-tabs',
          badge: 'Step 2 of 5 • Sign In',
          title: {
            mr: '२. सुरक्षित लॉगिन पद्धत (Sign-in Method)',
            hi: '2. सुरक्षित लॉगिन विधि (Sign-in Method)',
            en: '2. Choose a Sign-in Method'
          },
          desc: {
            mr: 'मोबाईल OTP, Google किंवा पासवर्डने सुरक्षित लॉगिन करा.',
            hi: 'मोबाइल OTP, Google या पासवर्ड से सुरक्षित लॉगिन करें।',
            en: 'Sign in securely with an SMS OTP, your Google account, or a password.'
          },
          spokenText: {
            mr: 'पायरी २: मोबाईल ओटीपी, गूगल किंवा पासवर्डने लॉगिन करा.',
            hi: 'चरण 2: मोबाइल ओटीपी, गूगल या पासवर्ड से लॉगिन करें।',
            en: 'Step 2: Sign in using a phone OTP, Google, or a password.'
          },
          arrowDirection: 'left'
        },
        {
          id: 'step_108',
          targetId: 'tour-108-sos',
          badge: 'Step 3 of 5 • Emergency SOS',
          title: {
            mr: '३. १-क्लिक १०८ आपत्कालीन रुग्णवाहिका',
            hi: '3. 1-क्लिक 108 आपातकालीन एम्बुलेंस',
            en: '3. 1-Click 108 Emergency Ambulance SOS'
          },
          desc: {
            mr: 'आपत्कालीन प्रसंगी १०८ वर कॉल करण्यासाठी फोनचा डायलर उघडतो. कॉल तुम्हाला स्वतः करावा लागतो.',
            hi: 'आपात स्थिति में 108 पर कॉल के लिए फोन का डायलर खुलता है। कॉल आपको स्वयं करना होगा।',
            en: 'Opens your phone dialer for 108 in an emergency. You must place the call yourself.'
          },
          spokenText: {
            mr: 'पायरी 3: आपत्कालीन प्रसंगी हे लाल १०८ बटन दाबा. फोनचा डायलर उघडेल, कॉल तुम्ही स्वतः करा.',
            hi: 'चरण 3: आपात स्थिति में यह लाल 108 बटन दबाएं। फोन का डायलर खुलेगा, कॉल आप स्वयं करें।',
            en: 'Step 3: In an emergency, tap this red 108 button. Your phone dialer opens, and you place the call yourself.'
          },
          arrowDirection: 'top'
        },
        {
          id: 'step_lang',
          targetId: 'tour-lang-picker',
          badge: 'Step 4 of 5 • Language',
          title: {
            mr: '४. भाषा बदला (मराठी | हिंदी | English)',
            hi: '4. भाषा बदलें (मराठी | हिंदी | English)',
            en: '4. Language Switcher & Spoken Audio'
          },
          desc: {
            mr: 'येथून संपूर्ण प्रणाली आणि आवाजी मार्गदर्शन आपल्या पसंतीच्या भाषेत बदला.',
            hi: 'यहाँ से पूरा सिस्टम और आवाजी मार्गदर्शन अपनी पसंद की भाषा में बदलें।',
            en: 'Switch the entire interface and spoken voice between Marathi, Hindi, and English anytime.'
          },
          spokenText: {
            mr: 'पायरी ४: येथून तुम्ही मराठी, हिंदी किंवा इंग्रजी भाषा कधीही बदलू शकता.',
            hi: 'चरण 4: यहाँ से आप मराठी, हिंदी या अंग्रेजी भाषा कभी भी बदल सकते हैं।',
            en: 'Step 4: Switch your preferred language anytime between Marathi, Hindi, and English.'
          },
          arrowDirection: 'bottom'
        },
        {
          id: 'step_voice',
          targetId: 'tour-voice-guide-btn',
          badge: 'Step 5 of 5 • Voice Tour',
          title: {
            mr: '५. परस्परसंवादी आवाजी गाईड (Voice Guide)',
            hi: '5. इंटरैक्टिव वॉयस गाईड (Voice Guide)',
            en: '5. Interactive Voice Guided Tour'
          },
          desc: {
            mr: 'हे आवाजी ट्युटोरियल पुन्हा सुरू करण्यासाठी या बटनावर कधीही क्लिक करा.',
            hi: 'यह वॉयस ट्यूटोरियल फिर से शुरू करने के लिए इस बटन पर कभी भी क्लिक करें।',
            en: 'Click this button anytime to replay the interactive voice tutorial across any screen.'
          },
          spokenText: {
            mr: 'पायरी ५: ट्युटोरियल पुन्हा ऐकण्यासाठी किंवा पाहण्यासाठी या व्हॉईस गाईड बटनाचा वापर करा.',
            hi: 'चरण 5: ट्यूटोरियल फिर से सुनने या देखने के लिए इस वॉयस गाईड बटन का उपयोग करें।',
            en: 'Step 5: Tap this Voice Guide button anytime to replay the guided audio tour.'
          },
          arrowDirection: 'bottom'
        }
      ];
    }

    // 1. PATIENT (PREGNANT MOTHER) DEDICATED TUTORIAL
    if (selectedTourRole === 'MOTHER') {
      return [
        {
          id: 'mother_step_qr',
          targetId: 'tour-mother-qr',
          badge: 'Step 1 of 5 • Mother Pass',
          title: {
            mr: '१. मातेचा डिजिटल QR सुरक्षा पास (Digital MCP Pass)',
            hi: '1. माता का डिजिटल QR सुरक्षा पास (Digital MCP Pass)',
            en: '1. Mother\'s Digital MCP 2D QR Pass'
          },
          desc: {
            mr: 'रुग्णालय व तपासणी शिबिरात १ सेकंदात स्कॅन करता येणारा सुरक्षित व ऑफलाइन डिजिटल पास.',
            hi: 'अस्पताल व जांच शिविर में 1 सेकंड में स्कैन होने वाला सुरक्षित व ऑफलाइन डिजिटल पास।',
            en: 'A 100% real, encrypted 2D QR Pass encoding your RCH ID, EDD, and medical history for instant clinic check-ins.'
          },
          spokenText: {
            mr: 'पायरी १: हा तुमचा सुरक्षित डिजिटल QR पास आहे. डॉक्टर किंवा आशा सेविका हा QR थेट स्कॅन करून तपासणी करतात.',
            hi: 'चरण 1: यह आपका सुरक्षित डिजिटल QR पास है। डॉक्टर या आशा कार्यकर्ता इसे सीधे स्कैन करके जांच करते हैं।',
            en: 'Step 1: This is your unique Digital QR Pass. Clinics and ASHA workers scan it for instant verification.'
          },
          arrowDirection: 'top'
        },
        {
          id: 'mother_step_ifa',
          targetId: 'tour-mother-ifa',
          badge: 'Step 2 of 5 • Nutrition',
          title: {
            mr: '२. दैनिक १-टॅप गोळी नोंदणी (Daily IFA Tracker)',
            hi: '2. दैनिक 1-टैप दवा पुष्टि (Daily IFA Tracker)',
            en: '2. 1-Tap Daily IFA Nutrition Tracker'
          },
          desc: {
            mr: 'दररोज १ लाल लोह गोळी घेतल्यानंतर येथे १-क्लिक करून नोंद करा.',
            hi: 'प्रतिदिन 1 लाल आयरन गोली लेने के बाद यहाँ 1-क्लिक करके पुष्टि करें।',
            en: 'Tap once every day after taking your Iron Folic Acid (IFA) red tablet to maintain maternal health.'
          },
          spokenText: {
            mr: 'पायरी २: दररोज गोळी घेतल्यानंतर येथे १-क्लिक करून नोंदवा, ज्यामुळे रक्तवाढ व्यवस्थित होते.',
            hi: 'चरण 2: प्रतिदिन गोली लेने के बाद यहाँ 1-क्लिक करके दर्ज करें।',
            en: 'Step 2: Confirm your daily Iron Folic Acid intake with a single tap here.'
          },
          arrowDirection: 'left'
        },
        {
          id: 'mother_step_schedule',
          targetId: 'tour-mother-schedule',
          badge: 'Step 3 of 5 • WHO 8-ANCs',
          title: {
            mr: '३. ८-तपासणी वेळापत्रक (WHO 8-ANC Model)',
            hi: '3. 8-जांच अनुसूची (WHO 8-ANC Model)',
            en: '3. WHO 8-Contact Clinical Schedule'
          },
          desc: {
            mr: 'तिमाहीनुसार नियोजित तपासण्या, TT/Td लस आणि सोनोग्राफी तारखांची संपूर्ण माहिती.',
            hi: 'तिमाही अनुसार निर्धारित जांच, TT/Td टीका और सोनोग्राफी तिथियों की जानकारी।',
            en: 'Track your upcoming ANC visits, anomaly ultrasound scans, and tetanus immunizations across all 3 trimesters.'
          },
          spokenText: {
            mr: 'पायरी ३: येथे तुमच्या सर्व ८ प्रसूतीपूर्व तपासण्या आणि सोनोग्राफीचे वेळापत्रक दिलेले आहे.',
            hi: 'चरण 3: यहाँ आपकी सभी 8 प्रसवपूर्व जांचों और सोनोग्राफी का आधिकारिक शेड्यूल दिया गया है।',
            en: 'Step 3: Track all 8 of your WHO prenatal checkups and ultrasound dates here.'
          },
          arrowDirection: 'top'
        },
        {
          id: 'mother_step_108',
          targetId: 'tour-header-108',
          badge: 'Step 4 of 5 • Emergency SOS',
          title: {
            mr: '४. १-क्लिक १०८ आपत्कालीन रुग्णवाहिका (108 SOS)',
            hi: '4. 1-क्लिक 108 आपातकालीन एम्बुलेंस (108 SOS)',
            en: '4. 1-Click 108 Emergency Ambulance SOS'
          },
          desc: {
            mr: 'आपत्कालीन प्रसंगी १०८ वर कॉल करण्यासाठी फोनचा डायलर उघडतो. कॉल तुम्हाला स्वतः करावा लागतो.',
            hi: 'आपात स्थिति में 108 पर कॉल के लिए फोन का डायलर खुलता है। कॉल आपको स्वयं करना होगा।',
            en: 'Opens your phone dialer for 108 in an emergency. You must place the call yourself.'
          },
          spokenText: {
            mr: 'पायरी 4: आपत्कालीन प्रसंगी हे लाल १०८ बटन दाबा. फोनचा डायलर उघडेल, कॉल तुम्ही स्वतः करा.',
            hi: 'चरण 4: आपात स्थिति में यह लाल 108 बटन दबाएं। फोन का डायलर खुलेगा, कॉल आप स्वयं करें।',
            en: 'Step 4: In an emergency, tap this red 108 button. Your phone dialer opens, and you place the call yourself.'
          },
          arrowDirection: 'bottom'
        },
        {
          id: 'mother_step_whatsapp',
          targetId: 'tour-mother-whatsapp',
          badge: 'Step 5 of 5 • Direct ASHA',
          title: {
            mr: '५. आशा सेविकेशी थेट व्हॉट्सअॅप व SMS संवाद',
            hi: '5. आशा कार्यकर्ता से सीधा WhatsApp व SMS संवाद',
            en: '5. Direct WhatsApp & SMS to ASHA'
          },
          desc: {
            mr: 'तुमच्या नियुक्त आशा सेविकेला एका क्लिकवर WhatsApp मेसेज किंवा SMS पाठवून मदत मिळवा.',
            hi: 'अपनी आशा कार्यकर्ता को 1-क्लिक में WhatsApp या SMS भेजकर सहायता प्राप्त करें।',
            en: 'Message or call your assigned ASHA field worker directly with one simple tap.'
          },
          spokenText: {
            mr: 'पायरी ५: आशा सेविकेला थेट मेसेज पाठवण्यासाठी या बटनांचा वापर करा.',
            hi: 'चरण 5: आशा कार्यकर्ता को सीधे संदेश भेजने के लिए इन बटनों का उपयोग करें।',
            en: 'Step 5: Connect directly with your assigned ASHA worker via WhatsApp or SMS.'
          },
          arrowDirection: 'top'
        }
      ];
    }

    // 2. ASHA FIELD WORKER DEDICATED TUTORIAL
    if (selectedTourRole === 'ASHA_WORKER') {
      return [
        {
          id: 'asha_step_triage',
          targetId: 'tour-asha-triage',
          badge: 'Step 1 of 5 • Clinical Triage',
          title: {
            mr: '१. ट्रॅफिक लाईट जोखीम ट्राइएज (Triage Alert)',
            hi: '1. ट्रैफिक लाइट जोखिम ट्राइएज (Triage Alert)',
            en: '1. Traffic Light Clinical Risk Triage'
          },
          desc: {
            mr: 'लाल (तात्काळ रुग्णालय भरती), पिवळा (PMSMA तज्ज्ञ तपासणी), हिरवा (नियमित सुरक्षित ANC).',
            hi: 'लाल (तत्काल अस्पताल भर्ती), पीला (PMSMA विशेषज्ञ जांच), हरा (नियमित सुरक्षित ANC)।',
            en: 'Instant color-coded risk alerts: Red (Urgent Referral), Yellow (Caution / PMSMA 9th Camp), Green (Safe Routine).'
          },
          spokenText: {
            mr: 'पायरी १: ट्रॅफिक लाईट कार्ड मातेचा धोका लाल, पिवळा किंवा हिरव्या रंगात तात्काळ दर्शवते.',
            hi: 'चरण 1: ट्रैफिक लाइट कार्ड माता का जोखिम लाल, पीला या हरे रंग में तुरंत दिखाता है।',
            en: 'Step 1: The traffic light triage card immediately flags maternal risks in Red, Yellow, or Green.'
          },
          arrowDirection: 'left'
        },
        {
          id: 'asha_step_scanner',
          targetId: 'tour-asha-scanner',
          badge: 'Step 2 of 5 • Camera Reader',
          title: {
            mr: '२. डिजिटल पास कॅमेरा स्कॅनर व पिन (Pass Reader)',
            hi: '2. डिजिटल पास कैमरा स्कैनर व पिन (Pass Reader)',
            en: '2. Digital MCP Pass Camera Scanner & PIN'
          },
          desc: {
            mr: 'मातेचा QR कोड थेट कॅमेऱ्याने स्कॅन करा किंवा ४-अंकी ऑफलाइन पिन टाकून रेकॉर्ड उघडा.',
            hi: 'माता का QR कोड सीधे कैमरे से स्कैन करें या 4-अंकीय ऑफलाइन पिन डालकर रिकॉर्ड खोलें।',
            en: 'Scan the mother\'s digital pass with your camera or enter her 4-digit offline PIN to unlock records.'
          },
          spokenText: {
            mr: 'पायरी २: मातेचा QR कोड स्कॅन करण्यासाठी किंवा पिन टाकून तपासणी पाहण्यासाठी हे टूल वापरा.',
            hi: 'चरण 2: माता का QR कोड स्कैन करने या पिन डालकर जांच देखने के लिए यह टूल उपयोग करें।',
            en: 'Step 2: Use this tool to scan any mother\'s QR pass or enter her offline PIN.'
          },
          arrowDirection: 'left'
        },
        {
          id: 'asha_step_vitals',
          targetId: 'tour-asha-tabs',
          badge: 'Step 3 of 5 • Vitals Intake',
          title: {
            mr: '३. तपासणी नोंद व ड्यू-लिस्ट (Vitals & 8-ANCs)',
            hi: '3. जांच दर्ज करें व ड्यू-लिस्ट (Vitals & 8-ANCs)',
            en: '3. Vitals Logger & WHO 8-Contact Due-List'
          },
          desc: {
            mr: 'रक्तदाब, हिमोग्लोबिन आणि वजन नोंदवा. WHO ८-तपासणी वेळापत्रक आपोआप तयार होते.',
            hi: 'रक्तचाप, हीमोग्लोबिन और वजन दर्ज करें। WHO 8-जांच समय सारणी अपने आप तैयार होती है।',
            en: 'Log blood pressure, hemoglobin, and weight. Automated WHO 8-contact schedule calculates due dates.'
          },
          spokenText: {
            mr: 'पायरी ३: येथे मातेचा रक्तदाब, वजन आणि लक्षणे नोंदवा. प्रणाली धोका आपोआप मोजते.',
            hi: 'चरण 3: यहाँ माता का रक्तचाप, वजन और लक्षण दर्ज करें। सिस्टम जोखिम अपने आप मापता है।',
            en: 'Step 3: Record maternal vitals here. The clinical engine automatically evaluates risk.'
          },
          arrowDirection: 'left'
        },
        {
          id: 'asha_step_reminders',
          targetId: 'tour-nav-tabs',
          badge: 'Step 4 of 5 • Reminders Hub',
          title: {
            mr: '४. स्वयंचलित संदेश व व्हॉट्सअॅप हब (Multilingual Hub)',
            hi: '4. ऑटोमेटेड रिमाइंडर व WhatsApp हब (Multilingual Hub)',
            en: '4. Multilingual Automated Reminders Hub'
          },
          desc: {
            mr: 'मातांना मराठी व हिंदीमध्ये तपासणी व गोळ्यांचे स्मरणपत्र थेट WhatsApp व SMS द्वारे पाठवा.',
            hi: 'माताओं को मराठी व हिंदी में जांच व दवा स्मरणपत्र सीधे WhatsApp व SMS द्वारा भेजें।',
            en: 'Send customized maternal checkup reminders and IFA adherence nudges in Marathi, Hindi, or English.'
          },
          spokenText: {
            mr: 'पायरी ४: येथून मातांना मराठी व हिंदीमध्ये आपोआप WhatsApp व SMS स्मरणपत्रे पाठवता येतात.',
            hi: 'चरण 4: यहाँ से माताओं को स्थानीय भाषा में WhatsApp व SMS स्मरणपत्र भेजे जाते हैं।',
            en: 'Step 4: Dispatch automated clinical reminders to mothers in their preferred language.'
          },
          arrowDirection: 'bottom'
        },
        {
          id: 'asha_step_108',
          targetId: 'tour-header-108',
          badge: 'Step 5 of 5 • 108 Hotline',
          title: {
            mr: '५. आपत्कालीन १०८ SOS हॉटलाईन (Emergency Ambulance)',
            hi: '5. आपातकालीन 108 SOS हॉटलाइन (Emergency Ambulance)',
            en: '5. 108 Emergency Ambulance Hotline'
          },
          desc: {
            mr: 'आपत्कालीन प्रसंगी १०८ वर कॉल करण्यासाठी फोनचा डायलर उघडतो. कॉल तुम्हाला स्वतः करावा लागतो.',
            hi: 'आपात स्थिति में 108 पर कॉल के लिए फोन का डायलर खुलता है। कॉल आपको स्वयं करना होगा।',
            en: 'Opens your phone dialer for 108 in an emergency. You must place the call yourself.'
          },
          spokenText: {
            mr: 'पायरी 5: आपत्कालीन प्रसंगी हे लाल १०८ बटन दाबा. फोनचा डायलर उघडेल, कॉल तुम्ही स्वतः करा.',
            hi: 'चरण 5: आपात स्थिति में यह लाल 108 बटन दबाएं। फोन का डायलर खुलेगा, कॉल आप स्वयं करें।',
            en: 'Step 5: In an emergency, tap this red 108 button. Your phone dialer opens, and you place the call yourself.'
          },
          arrowDirection: 'bottom'
        }
      ];
    }

    // 3. PHC DOCTOR DEDICATED TUTORIAL
    if (selectedTourRole === 'PHC_DOCTOR') {
      return [
        {
          id: 'doc_step_queue',
          targetId: 'tour-doctor-queue',
          badge: 'Step 1 of 4 • Priority Queue',
          title: {
            mr: '१. उच्च जोखीम प्राधान्य रुग्ण यादी (High-Risk Queue)',
            hi: '1. उच्च जोखिम प्राथमिकता मरीज सूची (High-Risk Queue)',
            en: '1. High-Risk Clinical Priority Queue'
          },
          desc: {
            mr: 'Hb < ७.० किंवा BP >= १४०/९० असलेल्या मातांची आपत्कालीन प्राधान्य यादी.',
            hi: 'Hb < 7.0 या BP >= 140/90 वाली माताओं की आपातकालीन प्राथमिकता सूची।',
            en: 'Color-coded triage queue sorting critical obstetric cases (severe anemia, pre-eclampsia, previous C-section).'
          },
          spokenText: {
            mr: 'पायरी १: ही उच्च जोखीम गर्भवती मातांची प्राधान्य यादी आहे, जी क्लिनिकल तीव्रतेनुसार क्रमवारी लावते.',
            hi: 'चरण 1: यह उच्च जोखिम गर्भवती माताओं की प्राथमिकता सूची है।',
            en: 'Step 1: This is your high-risk priority queue, triaging mothers by clinical urgency.'
          },
          arrowDirection: 'left'
        },
        {
          id: 'doc_step_scan',
          targetId: 'tour-doctor-scan',
          badge: 'Step 2 of 4 • Patient QR',
          title: {
            mr: '२. जलद रुग्ण QR स्कॅनर (Patient QR Scanner)',
            hi: '2. तेज मरीज QR स्कैनर (Patient QR Scanner)',
            en: '2. Live Patient QR Scanner'
          },
          desc: {
            mr: 'ओपीडीमध्ये मातेचा QR कोड थेट स्कॅन करून ५-मिनिट DPDP संमतीसह संपूर्ण इतिहास उघडा.',
            hi: 'ओपीडी में माता का QR कोड सीधे स्कैन करके DPDP सहमति सहित संपूर्ण मेडिकल इतिहास खोलें।',
            en: 'Scan the patient\'s digital QR pass to decrypt and unlock complete longitudinal ANC history with DPDP consent.'
          },
          spokenText: {
            mr: 'पायरी २: ओपीडीमध्ये मातेचा QR कोड थेट स्कॅन करून सर्व पूर्व तपासण्या आणि औषधे तपासा.',
            hi: 'चरण 2: ओपीडी में माता का QR कोड स्कैन करके पूर्व जांचें और दवाएं देखें।',
            en: 'Step 2: Scan the patient\'s QR pass to review past lab reports and vital trends.'
          },
          arrowDirection: 'bottom'
        },
        {
          id: 'doc_step_rx',
          targetId: 'tour-doctor-rx',
          badge: 'Step 3 of 4 • e-Prescriptions',
          title: {
            mr: '३. डिजिटल औषध चिठ्ठी व रेफरल (e-Prescription)',
            hi: '3. डिजिटल दवा पर्ची व रेफरल (e-Prescription)',
            en: '3. Digital e-Prescription & Specialist Referral'
          },
          desc: {
            mr: 'IV Iron, रक्तदाब औषधे आणि आहार सल्ला नोंदवून थेट रुग्णाच्या मोबाईलवर SMS/WhatsApp पाठवा.',
            hi: 'IV Iron, रक्तचाप दवाएं व आहार सलाह दर्ज करके सीधे मरीज के मोबाइल पर SMS/WhatsApp भेजें।',
            en: 'Issue digital prescriptions and FRU tertiary referrals with automated WhatsApp and SMS delivery.'
          },
          spokenText: {
            mr: 'पायरी ३: येथून डिजिटल औषधोपचार चिठ्ठी जारी करा आणि थेट रुग्णाच्या फोनवर पाठवा.',
            hi: 'चरण 3: यहाँ से डिजिटल दवा पर्ची जारी करें और सीधे मरीज के फोन पर भेजें।',
            en: 'Step 3: Issue e-prescriptions and transmit dosage instructions directly to the patient\'s phone.'
          },
          arrowDirection: 'top'
        },
        {
          id: 'doc_step_108',
          targetId: 'tour-header-108',
          badge: 'Step 4 of 4 • FRU Relay',
          title: {
            mr: '४. आपत्कालीन रुग्णवाहिका व FRU समन्वय',
            hi: '4. आपातकालीन एम्बुलेंस व FRU समन्वय',
            en: '4. 108 Emergency Ambulance & FRU Relay'
          },
          desc: {
            mr: 'तात्काळ संदर्भ (Referral) वेळी १०८ व उप-जिल्हा रुग्णालयाला थेट आपत्कालीन सूचना द्या.',
            hi: 'रेफरल के समय 108 व उप-जिला अस्पताल को सीधे आपातकालीन सूचना भेजें।',
            en: 'Coordinate priority ambulance dispatch and bed reservation at First Referral Units (FRUs).'
          },
          spokenText: {
            mr: 'पायरी ४: तातडीच्या उपचारांसाठी १०८ रुग्णवाहिका आणि उप-जिल्हा रुग्णालयाशी थेट संपर्क साधा.',
            hi: 'चरण 4: आपात स्थिति में 108 एम्बुलेंस और उप-जिला अस्पताल से तुरंत समन्वय करें।',
            en: 'Step 4: Coordinate rapid 108 transport and emergency hospital transfer.'
          },
          arrowDirection: 'bottom'
        }
      ];
    }

    // 4. WARD OFFICER / PUBLIC HEALTH COMMAND DEDICATED TUTORIAL
    return [
      {
        id: 'ward_step_matrix',
        targetId: 'tour-ward-matrix',
        badge: 'Step 1 of 3 • Health Posts',
        title: {
          mr: '१. उपकेंद्र कामगिरी मॅट्रिक्स (Sub-Centre Matrix)',
          hi: '1. उपकेंद्र प्रदर्शन मैट्रिक्स (Sub-Centre Matrix)',
          en: '1. Sub-Centre Health Post Operational Matrix'
        },
        desc: {
          mr: 'तालुक्यातील सर्व ६ उपकेंद्रांची ANC-4 टक्केवारी, सक्रिय आशा संख्या आणि उच्च जोखीम मातांची संख्या.',
          hi: 'ब्लॉक के सभी 6 उपकेंद्रों की ANC-4 दर, सक्रिय आशा बल और उच्च जोखिम मामलों की संख्या।',
          en: 'Sub-Centre operational performance tracking monitored mothers, ANC-4 rates, and active ASHA workforce.'
        },
        spokenText: {
          mr: 'पायरी १: प्रभाग डॅशबोर्ड सर्व उपकेंद्रांमधील माता आरोग्य कामगिरी आणि जोखीम आकडेवारी थेट दर्शवतो.',
          hi: 'चरण 1: प्रभाग डैशबोर्ड सभी उपकेंद्रों का मातृ स्वास्थ्य डेटा और प्रदर्शन दिखाता है।',
          en: 'Step 1: Track operational metrics across all 6 Sub-Centres and rural health posts.'
        },
        arrowDirection: 'top'
      },
      {
        id: 'ward_step_indicators',
        targetId: 'tour-ward-indicators',
        badge: 'Step 2 of 3 • 8 GoI MCH',
        title: {
          mr: '२. ८ राष्ट्रीय माता आरोग्य निर्देशक (8 GoI Indicators)',
          hi: '2. 8 राष्ट्रीय मातृ स्वास्थ्य संकेतक (8 GoI Indicators)',
          en: '2. 8 Standard GoI MCH National Indicators'
        },
        desc: {
          mr: 'संस्थागत प्रसूती, USG सोनोग्राफी, रक्ततपासणी आणि लोह गोळ्यांच्या साठ्याची थेट राष्ट्रीय आकडेवारी.',
          hi: 'संस्थागत प्रसव, सोनोग्राफी, रक्त जांच और दवा स्टॉक का राष्ट्रीय प्रोटोकॉल डेटा।',
          en: 'Real-time telemetry tracking GoI clinical protocols: early registration, 4 ANCs, USG scans, and IFA stock buffers.'
        },
        spokenText: {
          mr: 'पायरी २: हे ८ राष्ट्रीय माता आरोग्य निर्देशक शासनाच्या मानकांनुसार तालुक्याची प्रगती मोजतात.',
          hi: 'चरण 2: ये 8 राष्ट्रीय मातृ स्वास्थ्य संकेतक सरकारी मानकों के अनुसार प्रगति मापते हैं।',
          en: 'Step 2: Monitor compliance with the 8 official Government of India maternal health indicators.'
        },
        arrowDirection: 'top'
      },
      {
        id: 'ward_step_export',
        targetId: 'tour-ward-export',
        badge: 'Step 3 of 3 • Word Report',
        title: {
          mr: '३. अधिकृत प्रभाग अहवाल (.doc Export)',
          hi: '3. आधिकारिक प्रभाग रिपोर्ट (.doc Export)',
          en: '3. Export Official Word Report (.doc)'
        },
        desc: {
          mr: 'जिल्हा आरोग्य अधिकारी (DHO/CMO) बैठकीसाठी थेट Word अहवाल डाउनलोड करा.',
          hi: 'जिला स्वास्थ्य अधिकारी (DHO/CMO) समीक्षा बैठक हेतु Word रिपोर्ट डाउनलोड करें।',
          en: 'Generate and download fully formatted executive Word reports for administrative review.'
        },
        spokenText: {
          mr: 'पायरी ३: येथून तुम्ही संपूर्ण तालुक्याचा अधिकृत माता आरोग्य अहवाल वर्ड फाईलमध्ये डाउनलोड करू शकता.',
          hi: 'चरण 3: यहाँ से आप आधिकारिक मातृ स्वास्थ्य रिपोर्ट वर्ड फॉर्मेट में डाउनलोड कर सकते हैं।',
          en: 'Step 3: Export the complete maternal health administrative report as a Word document.'
        },
        arrowDirection: 'bottom'
      }
    ];
  };

  const steps = getStepsForTrack();
  const currentStep = steps[currentStepIndex] || steps[0];

  // Update target rect
  const updateRect = useCallback(() => {
    if (!isOpen) return;
    const el = document.getElementById(currentStep.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Scroll element gently into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: window.innerWidth < 768 ? 'center' : 'nearest', inline: 'nearest' });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isOpen]);

  useEffect(() => {
    updateRect();
    const t1 = setTimeout(updateRect, 50);
    const t2 = setTimeout(updateRect, 150);
    const t3 = setTimeout(updateRect, 350);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [updateRect, currentStepIndex, selectedTourRole]);

  // Play voice audio when step changes
  useEffect(() => {
    if (isOpen && audioEnabled && audioReady && currentStep) {
      const text = currentStep.spokenText[language];
      setIsPlayingAudio(true);
      speakTutorialAudio(
        text,
        language,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false)
      );
    }
    return () => {
      stopTutorialAudio();
    };
  }, [currentStepIndex, isOpen, language, audioEnabled, audioReady, selectedTourRole]);

  const handleNext = () => {
    markAudioReady();
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleSkipAll();
    }
  };

  const handleBack = () => {
    markAudioReady();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkipAll = () => {
    stopTutorialAudio();
    setIsPlayingAudio(false);
    try {
      const key = isLoggedIn ? `maatrisaarthi_tour_completed_${selectedTourRole}` : 'maatrisaarthi_tour_completed_LOGIN';
      localStorage.setItem(key, 'true');
    } catch (e) {}
    onClose();
  };

  const handleReplay = () => {
    if (!currentStep) return;
    markAudioReady();
    const text = currentStep.spokenText[language];
    setIsPlayingAudio(true);
    speakTutorialAudio(
      text,
      language,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') handleSkipAll();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handleBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length]);

  if (!isOpen) return null;

  // Calculate dynamic position of dialogue card
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    width: 'min(92vw, 440px)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  let arrowType: 'LEFT_TO_RIGHT' | 'TOP_TO_BOTTOM' | 'BOTTOM_TO_TOP' | 'RIGHT_TO_LEFT' = 'LEFT_TO_RIGHT';

  if (targetRect) {
    const spaceRight = window.innerWidth - targetRect.right;
    const spaceBottom = window.innerHeight - targetRect.bottom;
    const spaceTop = targetRect.top;
    const spaceLeft = targetRect.left;

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Mobile: put the card above or below the highlighted element, whichever side has more
      // room, so it never covers what it is pointing at. Scrolls if the card is taller than the gap.
      const gap = 14;
      const spaceAbove = targetRect.top - gap;
      const spaceBelow = window.innerHeight - targetRect.bottom - gap;
      tooltipStyle.left = '50%';
      tooltipStyle.transform = 'translateX(-50%)';
      tooltipStyle.width = 'min(94vw, 400px)';
      tooltipStyle.overflowY = 'auto';
      if (Math.max(spaceAbove, spaceBelow) >= 200) {
        if (spaceBelow >= spaceAbove) {
          tooltipStyle.top = targetRect.bottom + gap;
          tooltipStyle.maxHeight = Math.min(spaceBelow - 8, 440);
        } else {
          tooltipStyle.bottom = window.innerHeight - targetRect.top + gap;
          tooltipStyle.maxHeight = Math.min(spaceAbove - 8, 440);
        }
      } else {
        // Very tall target: compact card docked at the bottom
        tooltipStyle.bottom = 12;
        tooltipStyle.maxHeight = '42vh';
      }
      arrowType = 'TOP_TO_BOTTOM';
    } else if (spaceRight >= 450) {
      // Place right of element
      tooltipStyle.top = Math.max(20, Math.min(window.innerHeight - 380, targetRect.top - 20));
      tooltipStyle.left = targetRect.right + 28;
      arrowType = 'LEFT_TO_RIGHT';
    } else if (spaceLeft >= 450) {
      // Place left of element
      tooltipStyle.top = Math.max(20, Math.min(window.innerHeight - 380, targetRect.top - 20));
      tooltipStyle.left = targetRect.left - 460;
      arrowType = 'RIGHT_TO_LEFT';
    } else if (spaceBottom >= 360) {
      // Place below element
      tooltipStyle.top = targetRect.bottom + 24;
      tooltipStyle.left = Math.max(16, Math.min(window.innerWidth - 456, targetRect.left - 20));
      arrowType = 'TOP_TO_BOTTOM';
    } else if (spaceTop >= 360) {
      // Place above element
      tooltipStyle.top = targetRect.top - 360;
      tooltipStyle.left = Math.max(16, Math.min(window.innerWidth - 456, targetRect.left - 20));
      arrowType = 'BOTTOM_TO_TOP';
    } else {
      // Centered fallback
      tooltipStyle.bottom = 20;
      tooltipStyle.left = '50%';
      tooltipStyle.transform = 'translateX(-50%)';
      arrowType = 'TOP_TO_BOTTOM';
    }
  } else {
    // Center of screen fallback
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
    tooltipStyle.width = 'min(94vw, 420px)';
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none font-sans">
      {/* CRYSTAL-CLEAR CUTOUT SPOTLIGHT BACKDROP */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-auto z-40 touch-pan-y"
        onWheel={(e) => {
          window.scrollBy({ top: e.deltaY, behavior: 'auto' });
        }}
      >
        <defs>
          <mask id="spotlight-hole-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx={18}
                ry={18}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(8, 12, 24, 0.72)"
          mask="url(#spotlight-hole-mask)"
          onClick={handleSkipAll}
          style={{ cursor: 'pointer' }}
        />
      </svg>

      {/* GLOWING SPOTLIGHT HALO ON TARGET ELEMENT */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: 18
          }}
          className="pointer-events-none ring-4 ring-rose-500/90 dark:ring-teal-400 shadow-[0_0_30px_rgba(244,63,94,0.8)] tour-pulse transition-all duration-300 z-50"
        />
      )}

      {/* RED POINTER ARROW (hidden on phones) */}
      {targetRect && window.innerWidth >= 768 && (
        <svg 
          className="fixed inset-0 w-full h-full pointer-events-none z-50 overflow-visible"
          style={{ filter: 'drop-shadow(0px 4px 10px rgba(225, 29, 72, 0.7))' }}
        >
          <defs>
            <marker
              id="arrowhead-red"
              markerWidth="16"
              markerHeight="16"
              refX="12"
              refY="7"
              orient="auto"
            >
              <path d="M 0 1 L 14 7 L 0 13 L 4 7 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            </marker>
            <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="50%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>

          {arrowType === 'LEFT_TO_RIGHT' && (
            <g className="tour-pulse">
              <path
                d={`M ${Math.max(16, targetRect.left - 130)} ${targetRect.top + targetRect.height / 2 + 10} Q ${targetRect.left - 70} ${targetRect.top + targetRect.height / 2 - 15} ${targetRect.left - 14} ${targetRect.top + targetRect.height / 2}`}
                stroke="#fda4af"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                opacity="0.4"
              />
              <path
                d={`M ${Math.max(16, targetRect.left - 130)} ${targetRect.top + targetRect.height / 2 + 10} Q ${targetRect.left - 70} ${targetRect.top + targetRect.height / 2 - 15} ${targetRect.left - 14} ${targetRect.top + targetRect.height / 2}`}
                stroke="url(#arrowGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                markerEnd="url(#arrowhead-red)"
              />
            </g>
          )}

          {arrowType === 'TOP_TO_BOTTOM' && (
            <g className="tour-pulse">
              <path
                d={`M ${targetRect.left + targetRect.width / 2 - 15} ${targetRect.bottom + 55} Q ${targetRect.left + targetRect.width / 2 + 10} ${targetRect.bottom + 35} ${targetRect.left + targetRect.width / 2} ${targetRect.bottom + 14}`}
                stroke="#fda4af"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                opacity="0.4"
              />
              <path
                d={`M ${targetRect.left + targetRect.width / 2 - 15} ${targetRect.bottom + 55} Q ${targetRect.left + targetRect.width / 2 + 10} ${targetRect.bottom + 35} ${targetRect.left + targetRect.width / 2} ${targetRect.bottom + 14}`}
                stroke="url(#arrowGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                markerEnd="url(#arrowhead-red)"
              />
            </g>
          )}

          {arrowType === 'RIGHT_TO_LEFT' && (
            <g className="tour-pulse">
              <path
                d={`M ${targetRect.right + 130} ${targetRect.top + targetRect.height / 2 + 10} Q ${targetRect.right + 70} ${targetRect.top + targetRect.height / 2 - 15} ${targetRect.right + 14} ${targetRect.top + targetRect.height / 2}`}
                stroke="#fda4af"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                opacity="0.4"
              />
              <path
                d={`M ${targetRect.right + 130} ${targetRect.top + targetRect.height / 2 + 10} Q ${targetRect.right + 70} ${targetRect.top + targetRect.height / 2 - 15} ${targetRect.right + 14} ${targetRect.top + targetRect.height / 2}`}
                stroke="url(#arrowGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                markerEnd="url(#arrowhead-red)"
              />
            </g>
          )}

          {arrowType === 'BOTTOM_TO_TOP' && (
            <g className="tour-pulse">
              <path
                d={`M ${targetRect.left + targetRect.width / 2 - 15} ${targetRect.top - 55} Q ${targetRect.left + targetRect.width / 2 + 10} ${targetRect.top - 35} ${targetRect.left + targetRect.width / 2} ${targetRect.top - 14}`}
                stroke="#fda4af"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                opacity="0.4"
              />
              <path
                d={`M ${targetRect.left + targetRect.width / 2 - 15} ${targetRect.top - 55} Q ${targetRect.left + targetRect.width / 2 + 10} ${targetRect.top - 35} ${targetRect.left + targetRect.width / 2} ${targetRect.top - 14}`}
                stroke="url(#arrowGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                markerEnd="url(#arrowhead-red)"
              />
            </g>
          )}
        </svg>
      )}

      {/* FLOATING INTERACTIVE HIGH-CONTRAST DIALOGUE CARD */}
      <div 
        style={tooltipStyle}
        className="pointer-events-auto bg-slate-950/98 dark:bg-black/98 text-white p-4 sm:p-5 rounded-3xl border-2 border-rose-500 dark:border-teal-400 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-3 z-50"
      >
        {/* Role Track Switcher Bar (When Logged In) */}
        {isLoggedIn && (
          <div className="space-y-1.5 border-b border-white/15 pb-2.5">
            <span className="text-[10px] font-black text-rose-300 dark:text-teal-300 uppercase tracking-wider block">
              {language === 'mr' ? '🎯 ट्युटोरियल भूमिका निवडा (Role Tutorial):' : language === 'hi' ? '🎯 ट्यूटोरियल भूमिका चुनें (Role Tutorial):' : '🎯 Select Role Track:'}
            </span>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => handleRoleSelect('MOTHER')}
                className={`py-1 px-1 rounded-xl text-[10px] font-black transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  selectedTourRole === 'MOTHER'
                    ? 'bg-rose-600 text-white shadow-md ring-1 ring-white/40'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
                title="Pregnant Mother Tutorial"
              >
                <span>🤰</span>
                <span className="truncate">{language === 'mr' ? 'माता' : 'Mother'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('ASHA_WORKER')}
                className={`py-1 px-1 rounded-xl text-[10px] font-black transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  selectedTourRole === 'ASHA_WORKER'
                    ? 'bg-emerald-600 text-white shadow-md ring-1 ring-white/40'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
                title="ASHA Field Worker Tutorial"
              >
                <span>👩‍⚕️</span>
                <span className="truncate">{language === 'mr' ? 'आशा' : 'ASHA'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('PHC_DOCTOR')}
                className={`py-1 px-1 rounded-xl text-[10px] font-black transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  selectedTourRole === 'PHC_DOCTOR'
                    ? 'bg-blue-600 text-white shadow-md ring-1 ring-white/40'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
                title="PHC Medical Doctor Tutorial"
              >
                <span>👨‍⚕️</span>
                <span className="truncate">{language === 'mr' ? 'डॉक्टर' : 'Doctor'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('WARD_OFFICER')}
                className={`py-1 px-1 rounded-xl text-[10px] font-black transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  selectedTourRole === 'WARD_OFFICER'
                    ? 'bg-purple-600 text-white shadow-md ring-1 ring-white/40'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
                title="Ward Public Health Officer Tutorial"
              >
                <span>🏛️</span>
                <span className="truncate">{language === 'mr' ? 'प्रभाग' : 'Ward'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Card Header with Step Counter & Language Switcher */}
        <div className="flex items-center justify-between border-b border-white/15 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[11px] font-black text-rose-300 dark:text-teal-300 font-mono">
              {currentStep.badge}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Language Pills */}
            <div className="flex items-center bg-black/80 p-0.5 rounded-full border border-white/20 text-[10px] font-bold">
              {(['mr', 'hi', 'en'] as const).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange(lang)}
                  className={`px-2 py-0.5 rounded-full cursor-pointer transition ${
                    language === lang ? 'bg-rose-600 dark:bg-teal-500 text-white font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'mr' ? 'म' : lang === 'hi' ? 'हिं' : 'EN'}
                </button>
              ))}
            </div>

            {/* Audio Waveform Indicator & Stop/Play */}
            <button
              type="button"
              onClick={() => {
                if (isPlayingAudio) stopTutorialAudio();
                else handleReplay();
              }}
              className={`p-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isPlayingAudio ? 'bg-rose-600 text-white tour-pulse' : 'bg-white/10 text-slate-300'
              }`}
              title="Stop/Play Voice"
            >
              {isPlayingAudio ? <Square className="w-3.5 h-3.5 fill-white" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Explicit Skip Button */}
            <button
              type="button"
              onClick={handleSkipAll}
              className="px-2 py-0.5 rounded-lg bg-white/15 hover:bg-rose-600 text-white text-[10px] font-black cursor-pointer transition"
              title="Skip tutorial"
            >
              {language === 'mr' ? 'वगळा' : language === 'hi' ? 'छोड़ें' : 'Skip'}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleSkipAll}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Title & Description - High Contrast Typography */}
        <div className="space-y-1.5">
          <h4 className="text-sm font-black text-white leading-snug flex items-center gap-1.5">
            <span>{currentStep.title[language]}</span>
          </h4>
          <p className="text-xs text-slate-100 font-semibold leading-relaxed">
            {currentStep.desc[language]}
          </p>
        </div>

        {/* Progress Step Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStepIndex 
                  ? 'w-7 bg-rose-500 dark:bg-teal-400 shadow-sm' 
                  : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
              title={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Bottom Actions Bar: Replay, Back, Next & Skip Link */}
        <div className="flex items-center justify-between pt-2 border-t border-white/15">
          <button
            type="button"
            onClick={handleReplay}
            className="flex items-center gap-1 text-[11px] text-teal-300 hover:text-white font-bold p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{language === 'mr' ? 'पुन्हा ऐका' : language === 'hi' ? 'फिर सुनें' : 'Replay Voice'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkipAll}
              className="text-[11px] text-slate-300 hover:text-rose-300 font-bold px-1.5 py-1 cursor-pointer transition underline underline-offset-2"
            >
              {language === 'mr' ? 'वगळा' : language === 'hi' ? 'छोड़ें' : 'Skip'}
            </button>

            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>{language === 'mr' ? 'मागे' : language === 'hi' ? 'वापस' : 'Back'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/50 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition"
            >
              <span>
                {currentStepIndex === steps.length - 1 
                  ? (language === 'mr' ? 'पूर्ण करा ✓' : language === 'hi' ? 'पूर्ण ✓' : 'Done ✓') 
                  : (language === 'mr' ? 'पुढील ➔' : language === 'hi' ? 'अगला ➔' : 'Next ➔')}
              </span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
