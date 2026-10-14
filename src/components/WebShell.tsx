import React from 'react';
import { Bell, Download, LogOut, Menu, Moon, PhoneCall, RefreshCw, Sun, Volume2, Wifi, WifiOff } from 'lucide-react';
import { Language, UserRole } from '../types';
import { getRoleNavItems } from '../core/navigation';
import { APK_DOWNLOAD_URL, APK_SIZE_LABEL, APK_VERSION } from '../core/appRelease';

// Website layout: left sidebar (large screens) and top bar. The Android app uses
// AppTopBar / AppBottomNav from PlatformShell instead.

const ROLE_SUBTITLE: Record<UserRole, Record<Language, string>> = {
  MOTHER: { mr: 'माझी काळजी', hi: 'मेरी देखभाल', en: 'Personal Care' },
  ASHA_WORKER: { mr: 'आशा सेविका', hi: 'आशा कार्यकर्ता', en: 'ASHA Worker' },
  PHC_DOCTOR: { mr: 'वैद्यकीय अधिकारी', hi: 'चिकित्सा अधिकारी', en: 'Medical Officer' },
  WARD_OFFICER: { mr: 'प्रभाग अधिकारी', hi: 'वार्ड अधिकारी', en: 'Ward Officer' }
};

interface WebSidebarProps {
  language: Language;
  activeRole: UserRole;
  currentTab: string;
  onTabChange: (tab: string) => void;
  userName: string;
  onLogout: () => void;
  onOpenAlertCenter: () => void;
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  language, activeRole, currentTab, onTabChange, userName, onLogout, onOpenAlertCenter
}) => {
  const items = getRoleNavItems(activeRole);
  const initial = (userName.trim()[0] || '?').toUpperCase();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col sticky top-0 h-screen bg-[var(--surface)] border-r border-[var(--border)]">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--border)]">
        <img src="/logo.png" alt="" className="w-9 h-9 rounded-lg object-cover" />
        <div>
          <div className="font-extrabold text-[15px] text-[var(--text)] leading-none">MaatriSaarthi</div>
          <div className="text-[11px] font-semibold text-[var(--text-muted)] mt-1">{ROLE_SUBTITLE[activeRole][language]}</div>
        </div>
      </div>

      <nav id="tour-nav-tabs" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {language === 'en' ? 'Workspace' : 'कार्यक्षेत्र'}
        </div>
        {items.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className="shell-nav-item"
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label[language]}</span>
            </button>
          );
        })}
        <button type="button" onClick={onOpenAlertCenter} className="shell-nav-item">
          <Bell className="w-4 h-4 shrink-0" />
          <span>{language === 'mr' ? 'सूचना केंद्र' : language === 'hi' ? 'अलर्ट केंद्र' : 'Alert Center'}</span>
        </button>
      </nav>

      <div className="p-3 border-t border-[var(--border)] space-y-3">
        <a
          href={APK_DOWNLOAD_URL}
          download="MaatriSaarthi.apk"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)] hover:border-[var(--border-strong)] transition"
        >
          <Download className="w-4 h-4 shrink-0 text-[var(--accent)]" />
          <span className="min-w-0">
            <span className="block text-[13px] font-bold">{language === 'mr' ? 'Android ॲप डाउनलोड' : language === 'hi' ? 'Android ऐप डाउनलोड' : 'Get the Android app'}</span>
            <span className="block text-[11px] text-[var(--text-muted)]">v{APK_VERSION} • {APK_SIZE_LABEL}</span>
          </span>
        </a>

        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-sm font-extrabold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-[var(--text)] truncate">{userName}</div>
            <div className="text-[11px] text-[var(--text-muted)]">{ROLE_SUBTITLE[activeRole][language]}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="shell-icon-btn"
            title={language === 'mr' ? 'बाहेर पडा' : language === 'hi' ? 'लॉग आउट' : 'Sign out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

interface WebTopBarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeRole: UserRole;
  currentTab: string;
  isOnline: boolean;
  onToggleOnline: () => void;
  pendingSyncCount: number;
  isSyncing: boolean;
  onTriggerSync: () => void;
  onOpenAlertCenter: () => void;
  onOpenVoiceTutorial: () => void;
  onOpenSidebar: () => void;
}

const LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: 'mr', label: 'मराठी' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'en', label: 'EN' }
];

export const WebTopBar: React.FC<WebTopBarProps> = ({
  language, onLanguageChange, theme, onToggleTheme, activeRole, currentTab, isOnline, onToggleOnline,
  pendingSyncCount, isSyncing, onTriggerSync, onOpenAlertCenter, onOpenVoiceTutorial, onOpenSidebar
}) => {
  const items = getRoleNavItems(activeRole);
  const title = (items.find(i => i.id === currentTab) || items[0])?.label[language] || 'MaatriSaarthi';

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 h-16">
        <button type="button" onClick={onOpenSidebar} className="shell-icon-btn lg:hidden" title="Menu">
          <Menu className="w-4 h-4" />
        </button>
        <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 lg:hidden" />
        <h1 className="text-base sm:text-lg font-extrabold text-[var(--text)] truncate">{title}</h1>

        <div className="flex-1" />

        <div className="hidden sm:inline-flex shell-seg" role="group" aria-label="Language">
          {LANGUAGES.map(l => (
            <button key={l.id} type="button" aria-pressed={language === l.id} onClick={() => onLanguageChange(l.id)}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Sync status. Click: sync now (online) or go back online (offline). */}
        <button
          type="button"
          onClick={isOnline ? onTriggerSync : onToggleOnline}
          disabled={isSyncing}
          className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border text-xs font-bold ${
            isOnline
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30'
              : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30'
          }`}
          title={isOnline ? 'Online. Click to sync now.' : 'Offline mode. Click to go back online.'}
        >
          {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isOnline ? (pendingSyncCount > 0 ? `${pendingSyncCount} to sync` : 'Synced') : 'Offline'}</span>
        </button>

        {isOnline && (
          <button
            type="button"
            onClick={onToggleOnline}
            className="hidden md:inline-flex shell-icon-btn"
            title="Work offline"
          >
            <WifiOff className="w-4 h-4" />
          </button>
        )}

        <button type="button" id="tour-voice-guide-btn" onClick={onOpenVoiceTutorial} className="shell-icon-btn" title="Voice guided tour">
          <Volume2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={onToggleTheme} className="shell-icon-btn" title="Toggle light / dark">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button type="button" id="tour-notification-bell" onClick={onOpenAlertCenter} className="shell-icon-btn" title="Alert Center">
          <Bell className="w-4 h-4" />
        </button>

        <a
          id="tour-header-108"
          href="tel:108"
          className="sos-pulse-animation inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] bg-[#b42318] hover:bg-[#912018] text-white text-xs font-extrabold"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>108 SOS</span>
        </a>
      </div>
    </header>
  );
};
