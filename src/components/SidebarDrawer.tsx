import React from 'react';
import { APK_DOWNLOAD_URL, APK_SIZE_LABEL } from '../core/appRelease';
import { Language, UserRole } from '../types';
import { 
  Heart, 
  LayoutDashboard,
  Smartphone, 
  Stethoscope, 
  ClipboardList, 
  BrainCircuit, 
  MessageSquare, 
  BarChart3, 
  Bell, 
  PhoneCall, 
  LogOut, 
  Sun, 
  Moon, 
  X, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  User,
  ChevronRight,
  Zap,
  Globe,
  Download
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onRoleChange?: (role: UserRole) => void;
  hideApkDownload?: boolean;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeRole: UserRole;
  userName: string;
  userPhone: string;
  onLogout: () => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  onOpenAlertCenter: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onTabChange,
  onRoleChange,
  hideApkDownload = false,
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  activeRole,
  userName,
  userPhone,
  onLogout,
  isOnline,
  onToggleOnline,
  pendingSyncCount,
  onTriggerSync,
  onOpenAlertCenter
}) => {
  if (!isOpen) return null;

  const handleSelectTab = (tab: string, targetRole?: UserRole) => {
    if (targetRole && onRoleChange) {
      onRoleChange(targetRole);
    }
    onTabChange(tab);
    onClose();
  };

  // Role-Specific Navigation Options (Hides irrelevant internal health worker tools from pregnant mothers)
  const navItems = [
    ...(activeRole === 'MOTHER'
      ? [
          {
            id: 'mother_pass',
            title: { mr: 'माझा डिजिटल पास (My MCP Pass)', hi: 'मेरा डिजिटल पास (My MCP Pass)', en: 'My Digital MCP Pass' },
            desc: { mr: 'ANC तपासणी, गोळ्या व QR पास', hi: 'ANC जांच, दवा व QR पास', en: 'Personal ANC timeline & QR pass' },
            icon: Heart,
            color: 'text-rose-500 dark:text-rose-400',
            badge: 'Active'
          },
          {
            id: 'reminders',
            title: { mr: 'माझे संदेश व सूचना (My Alerts & SMS)', hi: 'मेरे संदेश व सूचनाएं (My Alerts & SMS)', en: 'My Alerts & Reminders Hub' },
            desc: { mr: 'दैनिक IFA गोळ्या व तपासणी स्मरणपत्रे', hi: 'दैनिक IFA दवा व जांच रिमाइंडर', en: 'Daily IFA nudges & PMSMA alerts' },
            icon: MessageSquare,
            color: 'text-teal-500 dark:text-teal-400'
          }
        ]
      : []),
    ...(activeRole === 'ASHA_WORKER'
      ? [
          {
            id: 'mobile_app',
            title: { mr: 'आशा फिल्ड कन्सोल (ASHA Console)', hi: 'आशा फील्ड कंसोल (ASHA Console)', en: 'ASHA Field Workstation' },
            desc: { mr: 'माता तपासणी, ऑफलाइन डेटा व ट्रियाज', hi: 'जांच, ऑफलाइन डेटा व ट्रियाज', en: 'Cohort logging & offline triage' },
            icon: Smartphone,
            color: 'text-emerald-500 dark:text-emerald-400',
            badge: 'Active'
          },
          {
            id: 'registry',
            title: { mr: 'माता नोंदणी व ड्यू-लिस्ट (Registry)', hi: 'गर्भवती पंजी व ड्यू-लिस्ट (Registry)', en: 'ANC Master Registry' },
            desc: { mr: '८-तपासणी वेळापत्रक व PMSMA शिबिर', hi: '8-जांच अनुसूची व PMSMA शिविर', en: '8-contact WHO schedule & due-list' },
            icon: ClipboardList,
            color: 'text-indigo-500 dark:text-indigo-400'
          },
          {
            id: 'reminders',
            title: { mr: 'संदेश व स्मरणपत्रे (Reminders)', hi: 'संदेश व स्मरणपत्र (Reminders)', en: 'Automated Reminders & Hub' },
            desc: { mr: 'मराठी व हिंदी SMS / WhatsApp मेसेज', hi: 'SMS / व्हाट्सऐप संदेश हब', en: 'Multilingual SMS & WhatsApp center' },
            icon: MessageSquare,
            color: 'text-teal-500 dark:text-teal-400'
          }
        ]
      : []),
    ...(activeRole === 'PHC_DOCTOR'
      ? [
          {
            id: 'doctor_portal',
            title: { mr: 'डॉक्टर ओपीडी पोर्टल (Doctor Portal)', hi: 'डॉक्टर ओपीडी पोर्टल (Doctor Portal)', en: 'Doctor Consultation Portal' },
            desc: { mr: 'QR स्कॅन, ई-प्रिस्क्रिप्शन व सल्ला', hi: 'QR स्कैन, ई-प्रिस्क्रिप्शन व जांच', en: 'Patient history unlock & Rx' },
            icon: Stethoscope,
            color: 'text-blue-500 dark:text-blue-400',
            badge: 'Active'
          },
          {
            id: 'registry',
            title: { mr: 'क्लिनिकल रुग्ण नोंदणी (Registry)', hi: 'क्लिनिकल मरीज पंजी (Registry)', en: 'Clinical Patient Registry' },
            desc: { mr: '८-तपासणी वेळापत्रक व हाय-रिस्क केसेस', hi: '8-जांच अनुसूची व हाई-रिस्क केस', en: 'High-risk case tracking & history' },
            icon: ClipboardList,
            color: 'text-indigo-500 dark:text-indigo-400'
          },
          {
            id: 'reminders',
            title: { mr: 'क्लिनिकल अलर्ट व SMS (Alerts)', hi: 'क्लिनिकल अलर्ट व SMS (Alerts)', en: 'Clinical Alerts & SMS' },
            desc: { mr: 'तपासणी व औषधोपचार सूचना', hi: 'जांच व दवा सूचना', en: 'Direct patient nudges & alerts' },
            icon: MessageSquare,
            color: 'text-teal-500 dark:text-teal-400'
          }
        ]
      : []),
    ...(activeRole === 'WARD_OFFICER'
      ? [
          {
            id: 'ward_dashboard',
            title: { mr: 'प्रभाग MCH डॅशबोर्ड (Ward Analytics)', hi: 'वार्ड MCH डैशबोर्ड (Ward Analytics)', en: 'Ward Public Health Analytics' },
            desc: { mr: 'प्रभागनिहाय माता आरोग्य विश्लेषण', hi: 'वार्ड स्वास्थ्य विश्लेषण', en: 'Aggregated health metrics' },
            icon: BarChart3,
            color: 'text-amber-500 dark:text-amber-400',
            badge: 'Active'
          },
          {
            id: 'registry',
            title: { mr: 'माता नोंदणी व ड्यू-लिस्ट (Registry)', hi: 'गर्भवती पंजी व ड्यू-लिस्ट (Registry)', en: 'ANC Master Registry' },
            desc: { mr: '८-तपासणी वेळापत्रक व PMSMA शिबिर', hi: '8-जांच अनुसूची व PMSMA शिविर', en: '8-contact WHO schedule & due-list' },
            icon: ClipboardList,
            color: 'text-indigo-500 dark:text-indigo-400'
          },
          {
            id: 'reminders',
            title: { mr: 'संदेश व स्मरणपत्रे (Reminders)', hi: 'संदेश व स्मरणपत्र (Reminders)', en: 'Reminders & Messaging Hub' },
            desc: { mr: 'मराठी व हिंदी SMS / WhatsApp मेसेज', hi: 'SMS / व्हाट्सऐप संदेश हब', en: 'Multilingual SMS & WhatsApp center' },
            icon: MessageSquare,
            color: 'text-teal-500 dark:text-teal-400'
          }
        ]
      : [])
  ];

  return (
    <div className="fixed inset-0 z-50 flex font-sans">
      {/* Translucent Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-in Sidebar Panel */}
      <aside className="relative w-84 max-w-[88vw] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-teal-500/20 shadow-2xl p-4 sm:p-5 flex flex-col justify-between text-slate-900 dark:text-white z-10 overflow-y-auto animate-slideRight">
        
        {/* Tier 1: Header + User Profile */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <img 
                src="/logo.png" 
                alt="MaatriSaarthi Logo" 
                className="w-9 h-9 rounded-2xl shadow-md object-cover border border-slate-300 dark:border-white/20 shrink-0" 
              />
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">MAATRISAARTHI</h3>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 font-black">Safe Motherhood Platform</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active User Card */}
          <div className="bg-teal-100/70 dark:bg-teal-950/40 p-3 rounded-2xl border border-teal-300/80 dark:border-teal-500/30 flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-teal-600 dark:bg-teal-500/20 text-white dark:text-teal-300 flex items-center justify-center font-bold text-sm shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{userName}</h4>
              <span className="text-[10px] text-teal-800 dark:text-teal-300 font-black block">{activeRole}</span>
              <span className="text-[10px] text-slate-700 dark:text-slate-400 truncate block font-bold">{userPhone}</span>
            </div>
          </div>

          {/* Tier 2: Role-Filtered Navigation Links */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 px-2 block">
              {activeRole === 'MOTHER'
                ? (language === 'mr' ? 'माझे रुग्ण पोर्टल पर्याय' : language === 'hi' ? 'मेरे पेशेंट पोर्टल विकल्प' : 'Patient Portal Options')
                : (language === 'mr' ? 'कार्य केंद्र पर्याय' : language === 'hi' ? 'प्लेटफॉर्म विकल्प' : 'Workstation Options')}
            </span>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition cursor-pointer text-left border ${
                    isActive
                      ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/30 font-black'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                    <div className="truncate">
                      <div className={`leading-tight truncate font-bold ${isActive ? 'text-white font-black' : 'text-slate-900 dark:text-white'}`}>
                        {item.title[language]}
                      </div>
                      <span className={`text-[9px] font-medium truncate block mt-0.5 ${isActive ? 'text-teal-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {item.desc[language]}
                      </span>
                    </div>
                  </div>
                  
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1.5 shrink-0 ${
                      isActive ? 'bg-white/30 text-white' : 'bg-teal-100 dark:bg-teal-500/20 text-teal-900 dark:text-teal-300 border border-teal-300 dark:border-teal-400/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier 3: Bottom Utilities, Language, & Logout */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10 text-xs mt-4">
          {/* Android APK Download Banner (not shown inside the app itself) */}
          {!hideApkDownload && (
          <a
            href={APK_DOWNLOAD_URL}
            download="MaatriSaarthi.apk"
            className="w-full p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-950 dark:text-emerald-300 font-black flex items-center justify-between transition cursor-pointer shadow-xs"
            title={`Download Android App (APK, ${APK_SIZE_LABEL})`}
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{language === 'mr' ? 'Android ॲप डाउनलोड (APK)' : language === 'hi' ? 'Android ऐप डाउनलोड (APK)' : 'Download Android App (APK)'}</span>
            </div>
            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black">{APK_SIZE_LABEL}</span>
          </a>
          )}

          {/* 108 Emergency & Alerts */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:108"
              className="bg-red-600 hover:bg-red-700 text-white font-black p-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
              <span>{language === 'mr' ? '१०८ SOS' : '108 SOS'}</span>
            </a>

            <button
              onClick={() => {
                onOpenAlertCenter();
                onClose();
              }}
              className="bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-slate-200 font-black p-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-slate-300 dark:border-white/10 cursor-pointer shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Alerts (3)</span>
            </button>
          </div>

          {/* Theme & Online Switcher */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 p-2 rounded-xl text-slate-900 dark:text-slate-200 font-black cursor-pointer flex-1 justify-center border border-slate-300 dark:border-white/10 shadow-xs"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{theme === 'dark' ? 'Day Mode' : 'Night Mode'}</span>
            </button>

            <button
              onClick={onToggleOnline}
              className={`p-2 rounded-xl font-black flex items-center gap-1 cursor-pointer border shadow-xs ${
                isOnline 
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30' 
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" /> : <WifiOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>

          {/* 3-Language Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-slate-300 dark:border-white/10">
            <button
              onClick={() => onLanguageChange('mr')}
              className={`flex-1 py-1.5 rounded-lg text-center font-bold cursor-pointer transition text-xs ${
                language === 'mr' ? 'bg-teal-600 text-white font-black shadow-xs' : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200'
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`flex-1 py-1.5 rounded-lg text-center font-bold cursor-pointer transition text-xs ${
                language === 'hi' ? 'bg-teal-600 text-white font-black shadow-xs' : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200'
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`flex-1 py-1.5 rounded-lg text-center font-bold cursor-pointer transition text-xs ${
                language === 'en' ? 'bg-teal-600 text-white font-black shadow-xs' : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200'
              }`}
            >
              English
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full p-2.5 bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-900 dark:text-rose-300 font-black rounded-xl border border-rose-300 dark:border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{language === 'mr' ? 'लॉगआउट करा' : language === 'hi' ? 'लॉगआउट करें' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
