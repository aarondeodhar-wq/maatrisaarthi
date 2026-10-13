import React from 'react';
import { Bell, Download, LogOut, Menu, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Language, UserRole } from '../types';
import { getRoleNavItems } from '../core/navigation';
import { APK_DOWNLOAD_URL, APK_SIZE_LABEL, APK_VERSION } from '../core/appRelease';

const ROLE_SUBTITLE: Record<UserRole, Record<Language, string>> = {
  MOTHER: { mr: 'माझी काळजी', hi: 'मेरी देखभाल', en: 'Personal Care' },
  ASHA_WORKER: { mr: 'आशा सेविका', hi: 'आशा कार्यकर्ता', en: 'ASHA Worker' },
  PHC_DOCTOR: { mr: 'वैद्यकीय अधिकारी', hi: 'चिकित्सा अधिकारी', en: 'Medical Officer' },
  WARD_OFFICER: { mr: 'प्रभाग अधिकारी', hi: 'वार्ड अधिकारी', en: 'Ward Officer' }
};

// ---------------------------------------------------------------------------
// Android app: compact top bar
// ---------------------------------------------------------------------------
interface AppTopBarProps {
  language: Language;
  activeRole: UserRole;
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  onTriggerSync: () => void;
  onOpenAlertCenter: () => void;
}

export const AppTopBar: React.FC<AppTopBarProps> = ({
  language, activeRole, isOnline, pendingSyncCount, isSyncing, onTriggerSync, onOpenAlertCenter
}) => (
  <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-white/10 pt-[env(safe-area-inset-top)]">
    <div className="flex items-center justify-between gap-2 px-4 h-14">
      <div className="flex items-center gap-2 min-w-0">
        <img src="/logo.png" alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" />
        <div className="min-w-0">
          <div className="font-black text-sm text-slate-900 dark:text-white leading-none">MaatriSaarthi</div>
          <div className="text-[10px] font-bold text-teal-700 dark:text-teal-400 truncate">{ROLE_SUBTITLE[activeRole][language]}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onTriggerSync}
          disabled={!isOnline || isSyncing}
          className={`h-9 px-2.5 rounded-xl flex items-center gap-1 text-[11px] font-black border ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
          }`}
          title={isOnline ? 'Sync now' : 'Offline'}
        >
          {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {pendingSyncCount > 0 && <span>{pendingSyncCount}</span>}
        </button>
        <button
          type="button"
          onClick={onOpenAlertCenter}
          className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center"
          title="Alerts"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
);

// ---------------------------------------------------------------------------
// Android app: bottom tab bar
// ---------------------------------------------------------------------------
interface AppBottomNavProps {
  language: Language;
  activeRole: UserRole;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenMore: () => void;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = ({ language, activeRole, currentTab, onTabChange, onOpenMore }) => {
  const items = getRoleNavItems(activeRole);
  const tabClass = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-black transition ${
      active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'
    }`;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch h-16">
        {items.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button key={item.id} type="button" onClick={() => onTabChange(item.id)} className={tabClass(active)}>
              <span className={`w-12 h-7 rounded-full flex items-center justify-center ${active ? 'bg-teal-100 dark:bg-teal-500/20' : ''}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span>{item.shortLabel[language]}</span>
            </button>
          );
        })}
        <button type="button" onClick={onOpenMore} className={tabClass(false)}>
          <span className="w-12 h-7 rounded-full flex items-center justify-center">
            <Menu className="w-5 h-5" />
          </span>
          <span>{language === 'mr' ? 'अधिक' : language === 'hi' ? 'अधिक' : 'More'}</span>
        </button>
      </div>
    </nav>
  );
};

// ---------------------------------------------------------------------------
// Website: persistent left sidebar (large screens)
// ---------------------------------------------------------------------------
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
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col sticky top-0 h-screen bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-white/10">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200 dark:border-white/10">
        <img src="/logo.png" alt="" className="w-9 h-9 rounded-xl object-cover" />
        <div>
          <div className="font-black text-sm text-slate-900 dark:text-white leading-none">MaatriSaarthi</div>
          <div className="text-[10px] font-bold text-teal-700 dark:text-teal-400">{ROLE_SUBTITLE[activeRole][language]}</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${
                active
                  ? 'bg-teal-50 dark:bg-teal-500/15 text-teal-800 dark:text-teal-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label[language]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenAlertCenter}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <Bell className="w-4 h-4 shrink-0" />
          <span>{language === 'mr' ? 'सूचना केंद्र' : language === 'hi' ? 'अलर्ट केंद्र' : 'Alert Center'}</span>
        </button>
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2">
        <a
          href={APK_DOWNLOAD_URL}
          download="MaatriSaarthi.apk"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-black">{language === 'mr' ? 'Android ॲप डाउनलोड' : language === 'hi' ? 'Android ऐप डाउनलोड' : 'Get the Android app'}</span>
            <span className="block text-[11px] font-bold opacity-75">v{APK_VERSION} • {APK_SIZE_LABEL}</span>
          </span>
        </a>
        <div className="px-3 text-xs font-black text-slate-900 dark:text-white truncate">{userName}</div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
        >
          <LogOut className="w-4 h-4" />
          <span>{language === 'mr' ? 'बाहेर पडा' : language === 'hi' ? 'लॉग आउट' : 'Sign out'}</span>
        </button>
      </div>
    </aside>
  );
};
