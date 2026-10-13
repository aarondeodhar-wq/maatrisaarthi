// Role navigation shared by the app's bottom tab bar and the website's sidebar.

import { Heart, Smartphone, ClipboardList, MessageSquare, Stethoscope, BarChart3, LucideIcon } from 'lucide-react';
import { Language, UserRole } from '../types';
import { isNativeApp } from './nativeAuth';

export interface RoleNavItem {
  id: string;
  label: Record<Language, string>;
  shortLabel: Record<Language, string>;
  icon: LucideIcon;
}

const DUE_LIST: RoleNavItem = {
  id: 'registry',
  label: { mr: 'ANC देय यादी', hi: 'ANC देय सूची', en: 'ANC Due List' },
  shortLabel: { mr: 'यादी', hi: 'सूची', en: 'Due list' },
  icon: ClipboardList
};

const REMINDERS: RoleNavItem = {
  id: 'reminders',
  label: { mr: 'स्मरणपत्रे व संदेश', hi: 'रिमाइंडर व संदेश', en: 'Reminders & Messages' },
  shortLabel: { mr: 'संदेश', hi: 'संदेश', en: 'Reminders' },
  icon: MessageSquare
};

export function getRoleNavItems(role: UserRole): RoleNavItem[] {
  switch (role) {
    case 'MOTHER':
      return [{
        id: 'mother_pass',
        label: { mr: 'माझा डिजिटल पास', hi: 'मेरा डिजिटल पास', en: 'My MCP Pass' },
        shortLabel: { mr: 'पास', hi: 'पास', en: 'My pass' },
        icon: Heart
      }];
    case 'ASHA_WORKER':
      return [{
        id: 'mobile_app',
        label: { mr: 'आशा फिल्ड कन्सोल', hi: 'आशा फील्ड कंसोल', en: 'ASHA Field Console' },
        shortLabel: { mr: 'होम', hi: 'होम', en: 'Home' },
        icon: Smartphone
      }, DUE_LIST, REMINDERS];
    case 'PHC_DOCTOR':
      return [{
        id: 'doctor_portal',
        label: { mr: 'डॉक्टर पोर्टल', hi: 'डॉक्टर पोर्टल', en: 'Clinical Portal' },
        shortLabel: { mr: 'पोर्टल', hi: 'पोर्टल', en: 'Portal' },
        icon: Stethoscope
      }, DUE_LIST, REMINDERS];
    case 'WARD_OFFICER':
      return [{
        id: 'ward_dashboard',
        label: { mr: 'प्रभाग डॅशबोर्ड', hi: 'वार्ड डैशबोर्ड', en: 'Ward Dashboard' },
        shortLabel: { mr: 'डॅशबोर्ड', hi: 'डैशबोर्ड', en: 'Dashboard' },
        icon: BarChart3
      }, DUE_LIST, REMINDERS];
  }
}

/**
 * True when the native-style app layout should be used: always inside the Android app,
 * and in a browser when opened with ?layout=app (for testing; remembered for the tab).
 */
export function isAppLayout(): boolean {
  if (isNativeApp()) return true;
  try {
    const param = new URLSearchParams(window.location.search).get('layout');
    if (param === 'app' || param === 'web') sessionStorage.setItem('maatrisaarthi_layout', param);
    return sessionStorage.getItem('maatrisaarthi_layout') === 'app';
  } catch (e) {
    return false;
  }
}
