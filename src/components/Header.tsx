import React from 'react';
import { Language, UserRole } from '../types';
import { 
  Heart, 
  Menu, 
  Bell, 
  PhoneCall, 
  LogOut, 
  Sun, 
  Moon, 
  ShieldCheck, 
  LayoutDashboard, 
  Smartphone, 
  Stethoscope, 
  ClipboardList, 
  BrainCircuit, 
  MessageSquare, 
  BarChart3,
  Zap,
  Volume2,
  Download
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  isSyncing: boolean;
  onOpenAlertCenter: () => void;
  onOpenVoiceTutorial: () => void;
  activeRole: UserRole;
  userName: string;
  onLogout: () => void;
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  onOpenAlertCenter,
  onOpenVoiceTutorial,
  activeRole,
  userName,
  onLogout,
  onOpenSidebar
}) => {
  // Role-Specific Navigation Links
  const roleNavItems = [
    ...(activeRole === 'MOTHER'
      ? [
          {
            id: 'mother_pass',
            title: { mr: 'माझा डिजिटल पास', hi: 'मेरा डिजिटल पास', en: 'My Digital MCP Pass' },
            icon: Heart
          }
        ]
      : []),
    ...(activeRole === 'ASHA_WORKER'
      ? [
          {
            id: 'mobile_app',
            title: { mr: 'आशा फिल्ड कन्सोल', hi: 'आशा फील्ड कंसोल', en: 'ASHA Console' },
            icon: Smartphone
          },
          {
            id: 'registry',
            title: { mr: 'माता नोंदणी व ड्यू-लिस्ट', hi: 'गर्भवती पंजी', en: 'ANC Registry' },
            icon: ClipboardList
          },
          {
            id: 'reminders',
            title: { mr: 'संदेश व स्मरणपत्रे', hi: 'संदेश व रिमाइंडर', en: 'Reminders' },
            icon: MessageSquare
          }
        ]
      : []),
    ...(activeRole === 'PHC_DOCTOR'
      ? [
          {
            id: 'doctor_portal',
            title: { mr: 'डॉक्टर ओपीडी पोर्टल', hi: 'डॉक्टर ओपीडी पोर्टल', en: 'Doctor OPD Clinic' },
            icon: Stethoscope
          },
          {
            id: 'registry',
            title: { mr: 'माता रुग्ण नोंदणी', hi: 'मरीज पंजी व जांच', en: 'Patient Registry' },
            icon: ClipboardList
          },
          {
            id: 'reminders',
            title: { mr: 'क्लिनिकल अलर्ट व SMS', hi: 'क्लिनिकल अलर्ट व SMS', en: 'Clinical Alerts' },
            icon: MessageSquare
          }
        ]
      : []),
    ...(activeRole === 'WARD_OFFICER'
      ? [
          {
            id: 'ward_dashboard',
            title: { mr: 'प्रभाग MCH डॅशबोर्ड', hi: 'वार्ड MCH डैशबोर्ड', en: 'Ward Analytics' },
            icon: BarChart3
          },
          {
            id: 'registry',
            title: { mr: 'माता नोंदणी व ड्यू-लिस्ट', hi: 'गर्भवती पंजी', en: 'ANC Registry' },
            icon: ClipboardList
          },
          {
            id: 'reminders',
            title: { mr: 'संदेश व स्मरणपत्रे', hi: 'संदेश व रिमाइंडर', en: 'Reminders Hub' },
            icon: MessageSquare
          }
        ]
      : [])
  ];

  return (
    <header className="sticky top-0 z-40">
      {/* Top Black Clinical Telemetry Ticker Bar (Hidden on ultra-narrow mobile to avoid text collision, visible >= sm) */}
      <div className="hidden sm:flex bg-[#02070d] text-slate-300 px-3 sm:px-6 py-1 text-[11px] font-mono items-center justify-between border-b border-white/10 overflow-x-auto select-none">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 inline-block" />
          <span className="text-emerald-400 font-bold">Maternal Telemetry Relay: Active</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">Shirur Rural Block PHC</span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-teal-300 hidden md:inline">Core Vitals Sync: 100%</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-slate-400">
          <span className="text-amber-400 font-bold">14 Alerts Monitored Today</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-bold">Triage: Active ✓</span>
        </div>
      </div>

      {/* Main Silky Frosted Navbar */}
      <div className="silky-glass bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-teal-500/15 px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm transition">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Left Brand Identity */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSidebar}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 transition cursor-pointer md:hidden border border-slate-200 dark:border-white/10 shrink-0"
              title="Open Menu"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div 
              onClick={() => onTabChange(roleNavItems[0]?.id || 'overview')}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <img 
                src="/logo.png" 
                alt="MaatriSaarthi Logo" 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-md object-cover border border-white/20 shrink-0" 
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs sm:text-base tracking-tight text-slate-900 dark:text-white leading-none">
                    MAATRISAARTHI
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-teal-700 dark:text-teal-400 font-bold block mt-0.5">
                  {activeRole === 'MOTHER' ? '• Personal Care' : activeRole === 'ASHA_WORKER' ? '• ASHA Workstation' : activeRole === 'PHC_DOCTOR' ? '• Clinical Portal' : '• Public Health'}
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs (Squircle Style) */}
          <nav id="tour-nav-tabs" className="hidden md:flex items-center bg-slate-200/80 dark:bg-black/50 p-1 rounded-2xl border border-slate-300 dark:border-teal-500/20 text-xs font-bold shadow-inner">
            {roleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold ${
                    isActive
                      ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.title[language]}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar Controls (Square with curved corners - Squircle) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 108 Emergency Direct */}
            <a
              id="tour-header-108"
              href="tel:108"
              className="bg-red-600 hover:bg-red-700 text-white font-black px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs flex items-center gap-1 shadow-md border border-white/20 transition shrink-0 sos-pulse-animation jiggly-spring"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? '१०८ SOS' : '108 SOS'}</span>
            </a>

            {/* Notification Bell (Squircle) */}
            <button
              id="tour-notification-bell"
              onClick={onOpenAlertCenter}
              className="relative p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-white/10 shrink-0 jiggly-spring"
              title="Alert Notifications Center"
            >
              <Bell className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-500" />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-md flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {/* Day / Night Mode Toggle (Squircle) */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-white/10 shrink-0 jiggly-spring"
              title="Toggle Day/Night"
            >
              {theme === 'dark' ? <Sun className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-indigo-600" />}
            </button>

            {/* Interactive Voice Guided Tutorial Button (Squircle) */}
            <button
              onClick={onOpenVoiceTutorial}
              className="flex items-center gap-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-800 dark:text-teal-300 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border border-teal-500/40 shadow-xs shrink-0 jiggly-spring"
              title="Interactive Voice Guided Tour"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-pulse" />
              <span className="hidden md:inline">{language === 'mr' ? 'आवाजी गाईड' : language === 'hi' ? 'वॉयस गाईड' : 'Voice Tour'}</span>
            </button>

            {/* Android APK Download Option (Desktop Only) */}
            <a
              href="/maatrisaarthi.apk"
              download="MaatriSaarthi.apk"
              className="hidden lg:flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border border-emerald-400/40 shadow-xs shrink-0 jiggly-spring"
              title="Download Android App (APK - 6.3 MB)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'mr' ? 'Android ॲप' : language === 'hi' ? 'Android ऐप' : 'Android APK'}</span>
            </a>

            {/* User Profile Pill & Logout (Hidden on mobile screens to prevent overflow) */}
            <div className="hidden lg:flex items-center gap-1.5 bg-teal-50 dark:bg-teal-500/15 border border-teal-300 dark:border-teal-500/30 px-2.5 py-1 rounded-xl text-xs text-teal-900 dark:text-white shadow-sm shrink-0">
              <span className="font-bold truncate max-w-[90px]">{userName}</span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5 ml-1 transition"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
