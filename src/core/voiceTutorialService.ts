import { Language } from '../types';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { isNativeApp } from './nativeAuth';

export interface VoiceTutorialScript {
  id: string;
  title: Record<Language, string>;
  text: Record<Language, string>;
}

export const TUTORIAL_SCRIPTS: Record<string, VoiceTutorialScript> = {
  WELCOME: {
    id: 'WELCOME',
    title: {
      mr: 'मातृसारथी प्रणालीमध्ये आपले स्वागत आहे',
      hi: 'मातृसारथी प्रणाली में आपका स्वागत है',
      en: 'Welcome to MaatriSaarthi Maternal Care'
    },
    text: {
      mr: 'नमस्ते! मातृसारथी सुरक्षित मातृत्व प्रणालीमध्ये आपले स्वागत आहे. आपण आपली भूमिका निवडून लॉगिन करू शकता. गर्भवती माता आपला डिजिटल पास पाहू शकतात, तर आशा सेविका आणि डॉक्टर ऑफलाइन तपासणी व आपत्कालीन मदत करू शकतात.',
      hi: 'नमस्ते! मातृसारथी सुरक्षित मातृत्व मंच में आपका स्वागत है। आप अपनी भूमिका चुनकर लॉगिन कर सकते हैं। गर्भवती माताएं अपना डिजिटल पास देख सकती हैं, और आशा कार्यकर्ता व डॉक्टर ऑफलाइन जांच कर सकते हैं।',
      en: 'Welcome to MaatriSaarthi Safe Motherhood platform. Please select your role workstation to sign in. Pregnant mothers can access their digital MCP pass, and ASHA workers and doctors can log vitals and trigger emergency 108 ambulance support.'
    }
  },
  MOTHER_PASS: {
    id: 'MOTHER_PASS',
    title: {
      mr: 'माझा डिजिटल MCP पास कसा वापरावा?',
      hi: 'डिजिटल MCP पास का उपयोग कैसे करें?',
      en: 'How to use your Digital MCP Pass'
    },
    text: {
      mr: 'हा आपला डिजिटल MCP पास आहे. येथे आपण आपल्या गरोदरपणाचा २६ वा आठवडा आणि अपेक्षित प्रसूती तारीख पाहू शकता. खाली दिलेल्या ८ तपासण्यांचे वेळापत्रक तपासा आणि दररोज घेतलेली १ लाल आयर्न गोळी येथे नोंदवा. काही आपत्कालीन अडचण असल्यास लाल रंगाच्या १०८ बटनावर क्लिक करा.',
      hi: 'यह आपका डिजिटल MCP पास है। यहाँ आप अपनी गर्भावस्था का सप्ताह और अनुमानित प्रसव तिथि देख सकते हैं। 8-जांच अनुसूची देखें और प्रतिदिन 1 लाल आयरन गोली की पुष्टि करें। आपात स्थिति में 108 बटन दबाएं।',
      en: 'This is your digital MCP pass. You can track your gestational progress, EDD date, 8-ANC contact schedule, and log your daily iron folic acid tablet. Tap the red 108 button anytime for emergency ambulance support.'
    }
  },
  ASHA_WORKSTATION: {
    id: 'ASHA_WORKSTATION',
    title: {
      mr: 'आशा फिल्ड कन्सोल कसे चालवावे?',
      hi: 'आशा फील्ड कंसोल का उपयोग कैसे करें?',
      en: 'How to use ASHA Field Console'
    },
    text: {
      mr: 'आशा सेविका कन्सोलमध्ये आपण मातांची नवीन नोंदणी करू शकता, रक्तदाब व हिमोग्लोबिन नोंदवून AI जोखीम तपासू शकता. इंटरनेट नसतानाही हा डेटा सुरक्षित साठवला जातो. उच्च जोखीम आढळल्यास तात्काळ १०८ रुग्णवाहिका बोलवता येते.',
      hi: 'आशा कंसोल में आप नई माताओं का पंजीकरण कर सकते हैं, रक्तचाप व हीमोग्लोबिन दर्ज करके AI जोखिम की जांच कर सकते हैं। बिना इंटरनेट के भी डेटा सुरक्षित रहता है।',
      en: 'In the ASHA console, you can register pregnant mothers, record blood pressure and hemoglobin to run offline AI risk triage, and dispatch 108 ambulance for high-risk mothers.'
    }
  },
  CLINICAL_AI: {
    id: 'CLINICAL_AI',
    title: {
      mr: 'AI जोखीम मॉडेल कसे कार्य करते?',
      hi: 'AI जोखिम मॉडल कैसे कार्य करता है?',
      en: 'How Clinical AI Risk Model Works'
    },
    text: {
      mr: 'मातृसारथी जोखीम तपासणी नियम-आधारित आहे आणि उच्च जोखीम मातांची यादी तयार करते; डॉक्टरांचा निर्णय अंतिम असतो. रक्तदाब, साखर आणि रक्तातील हिमोग्लोबिन तपासणीनुसार लाल, पिवळा किंवा हिरवा ट्रॅफिक लाइट अलर्ट दिला जातो.',
      hi: 'मातृसारथी जोखिम जांच नियम-आधारित है और उच्च जोखिम वाली माताओं को चिह्नित करती है; अंतिम निर्णय डॉक्टर का होता है।',
      en: 'MaatriSaarthi uses rule-based screening of blood pressure, hemoglobin, blood sugar and danger signs to flag possible maternal risks like pre-eclampsia and anemia. It supports, and does not replace, clinical judgement.'
    }
  }
};

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioFallback: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let watchdogTimer: any = null;
let speakDelayTimer: any = null;
let keepAliveTimer: any = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Populate and cache voices as soon as browser engine initializes
function populateVoiceList() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  populateVoiceList();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
  }
}

// Audio Pipeline Unlocker for Android WebView, iOS Safari, and Desktop Browsers
export function unlockAudioPipeline() {
  try {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      if (cachedVoices.length === 0) {
        populateVoiceList();
      }
    }
  } catch (e) {}
}

// Auto-unlock on first user interaction
if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', unlockAudioPipeline, { once: true, passive: true });
  window.addEventListener('click', unlockAudioPipeline, { once: true, passive: true });
  window.addEventListener('pointerdown', unlockAudioPipeline, { once: true, passive: true });
}

/**
 * Finds the best matching voice strictly for the requested language
 */
function getBestVoiceForLanguage(lang: Language): { voice: SpeechSynthesisVoice | null; langCode: string } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, langCode: lang === 'mr' ? 'hi-IN' : lang === 'hi' ? 'hi-IN' : 'en-US' };
  }

  // Fetch current voice list
  const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis.getVoices() || []);

  if (lang === 'mr') {
    // 1. Check for dedicated Marathi voice (e.g. Windows OneCore Marathi)
    const mrVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('mr') || 
      v.name.toLowerCase().includes('marathi') ||
      v.name.toLowerCase().includes('मराठी')
    );
    if (mrVoice) return { voice: mrVoice, langCode: mrVoice.lang || 'mr-IN' };

    // 2. Marathi and Hindi share Devanagari script and phonetics.
    // Chrome, Edge, and Android provide high-quality Hindi neural voices (Google हिन्दी / Microsoft Swara)
    // which read Marathi Devanagari text fluently and accurately.
    const hiVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('hi') || 
      v.name.toLowerCase().includes('hindi') ||
      v.name.toLowerCase().includes('हिन्दी')
    );
    if (hiVoice) return { voice: hiVoice, langCode: 'hi-IN' };

    // 3. Any Indian voice fallback
    const inVoice = voices.find(v => v.lang.toLowerCase().endsWith('-in'));
    if (inVoice) return { voice: inVoice, langCode: inVoice.lang };

    return { voice: null, langCode: 'hi-IN' };
  }

  if (lang === 'hi') {
    const hiVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('hi') || 
      v.name.toLowerCase().includes('hindi') ||
      v.name.toLowerCase().includes('हिन्दी')
    );
    if (hiVoice) return { voice: hiVoice, langCode: 'hi-IN' };
    return { voice: null, langCode: 'hi-IN' };
  }

  // English: STRICTLY match English voices only (NEVER allow Indian language voice if lang is EN)
  const enInVoice = voices.find(v => 
    v.lang.toLowerCase() === 'en-in' || 
    (v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('india'))
  );
  if (enInVoice) return { voice: enInVoice, langCode: 'en-IN' };

  const enUsVoice = voices.find(v => 
    v.lang.toLowerCase() === 'en-us' || 
    v.lang.toLowerCase().startsWith('en')
  );
  if (enUsVoice) return { voice: enUsVoice, langCode: 'en-US' };

  return { voice: voices[0] || null, langCode: 'en-US' };
}

// Android WebView has no working speechSynthesis, so the app speaks through the phone's own
// text-to-speech engine. Marathi falls back to a Hindi voice (same script) when no Marathi
// voice is installed. Returns false when no usable voice exists, so the web path can try.
let nativeSpeakToken = 0;

async function speakNative(text: string, language: Language, onStart?: () => void, onEnd?: () => void): Promise<boolean> {
  // Try preferred language tag first, then fallback to related Indian language / English voices
  const candidates = language === 'mr'
    ? ['mr-IN', 'mr', 'hi-IN', 'hi', 'en-IN', 'en-US']
    : language === 'hi'
    ? ['hi-IN', 'hi', 'en-IN', 'en-US']
    : ['en-IN', 'en-US', 'en-GB', 'en'];

  const token = ++nativeSpeakToken;
  try {
    let lang: string | null = null;
    for (const c of candidates) {
      try {
        const { supported } = await TextToSpeech.isLanguageSupported({ lang: c });
        if (supported) {
          lang = c;
          break;
        }
      } catch (err) {
        // Continue checking candidates
      }
    }

    if (!lang) {
      // If language tag check returned false, still attempt speaking with the primary candidate
      lang = candidates[0];
    }

    if (token !== nativeSpeakToken) return true; // a newer request took over
    await TextToSpeech.stop().catch(() => {});
    onStart?.();
    await TextToSpeech.speak({
      text,
      lang,
      rate: language === 'mr' ? 0.9 : 0.95,
      pitch: 1.0,
      volume: 1.0,
      category: 'playback'
    });
    if (token === nativeSpeakToken) onEnd?.();
    return true;
  } catch (e) {
    console.warn('Native text-to-speech failed:', e);
    return false;
  }
}

/**
 * Bulletproof Voice Player for Marathi, Hindi, and English with auto-recovery
 */
export const speakTutorialAudio = (
  text: string, 
  language: Language, 
  onStart?: () => void, 
  onEnd?: () => void
) => {
  stopTutorialAudio();
  unlockAudioPipeline();

  if (typeof window === 'undefined') return;

  // Clean text of non-pronounceable UI symbols for smooth spoken audio
  const cleanSpokenText = text
    .replace(/[🎯🤰👩‍⚕️👨‍⚕️🏛️✨✓➔🚨🔴🟡🟢•|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanSpokenText) {
    if (onEnd) onEnd();
    return;
  }

  if (isNativeApp()) {
    speakNative(cleanSpokenText, language, onStart, onEnd).then(ok => {
      if (!ok) speakTutorialAudioWeb(cleanSpokenText, language, onStart, onEnd);
    });
    return;
  }
  speakTutorialAudioWeb(cleanSpokenText, language, onStart, onEnd);
};

// Browser path: speechSynthesis synchronously triggered to retain user gesture authorization
function speakTutorialAudioWeb(
  cleanSpokenText: string,
  language: Language,
  onStart?: () => void,
  onEnd?: () => void
) {
  const handleStart = () => {
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    if (onStart) onStart();
  };

  const handleEnd = () => {
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (onEnd) onEnd();
  };

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const { voice, langCode } = getBestVoiceForLanguage(language);
      const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
      activeUtterance = utterance;
      // Keep global window reference so Chrome/Android GC does not garbage collect mid-speech
      (window as any)._maatriUtterance = utterance;

      utterance.lang = langCode;
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = language === 'mr' ? 0.90 : 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = handleStart;
      utterance.onend = handleEnd;

      utterance.onerror = (e) => {
        console.warn(`SpeechSynthesis error for [${language}]:`, e);
        handleEnd();
      };

      // Keepalive for Chrome Android 15-second speech freeze bug
      keepAliveTimer = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      window.speechSynthesis.speak(utterance);
      return;
    } catch (err) {
      console.warn('Web Speech API speak() threw error:', err);
      handleEnd();
    }
  } else {
    handleEnd();
  }
}

/**
 * Online Google TTS Audio stream fallback for devices with no local voice packs (English, Marathi, Hindi)
 */
function playOnlineAudioFallback(
  text: string,
  language: Language,
  onStart?: () => void,
  onEnd?: () => void
) {
  try {
    unlockAudioPipeline();
    const langParam = language === 'mr' ? 'mr' : language === 'hi' ? 'hi' : 'en';
    const truncated = text.slice(0, 190);
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langParam}&client=tw-ob&q=${encodeURIComponent(truncated)}`;

    const audio = new Audio();
    // Do not use anonymous crossOrigin which causes CORS failure
    audio.src = audioUrl;
    audio.volume = 1.0;
    activeAudioFallback = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      activeAudioFallback = null;
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      activeAudioFallback = null;
      if (onEnd) onEnd();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio fallback play caught:', err);
        if (onEnd) onEnd();
      });
    }
  } catch (e) {
    if (onEnd) onEnd();
  }
}

export const stopTutorialAudio = () => {
  nativeSpeakToken++;
  if (isNativeApp()) TextToSpeech.stop().catch(() => {});
  if (speakDelayTimer) {
    clearTimeout(speakDelayTimer);
    speakDelayTimer = null;
  }
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  if (typeof window !== 'undefined') {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      activeUtterance = null;
      (window as any)._maatriUtterance = null;
    }
    if (activeAudioFallback) {
      try {
        activeAudioFallback.pause();
        activeAudioFallback.src = '';
      } catch (e) {}
      activeAudioFallback = null;
    }
  }
};

export const pauseTutorialAudio = () => {
  if (typeof window !== 'undefined') {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch (e) {}
    }
    if (activeAudioFallback) {
      try {
        activeAudioFallback.pause();
      } catch (e) {}
    }
  }
};

export const resumeTutorialAudio = () => {
  if (typeof window !== 'undefined') {
    unlockAudioPipeline();
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
    }
    if (activeAudioFallback) {
      activeAudioFallback.play().catch(() => {});
    }
  }
};
