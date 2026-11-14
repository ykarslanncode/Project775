import {
  LayoutDashboard,
  TrendingUp,
  Brain,
  FlaskConical,
  Languages,
  CheckSquare,
  CalendarRange,
  Map,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Command Center', path: '/app', icon: LayoutDashboard },
  { label: 'Trading Journal', path: '/app/trading', icon: TrendingUp },
  { label: 'CS / AI-ML Tracker', path: '/app/learning', icon: Brain },
  { label: 'Business Lab', path: '/app/business', icon: FlaskConical },
  { label: 'English Practice', path: '/app/english', icon: Languages },
  { label: 'Daily Check-ins', path: '/app/checkins', icon: CheckSquare },
  { label: 'Weekly Reviews', path: '/app/reviews', icon: CalendarRange },
  { label: 'Two-Year Roadmap', path: '/app/roadmap', icon: Map },
  { label: 'Settings', path: '/app/settings', icon: Settings },
];
