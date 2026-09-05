import { House, Wrench, CalendarDays, CircleUserRound, Users, ShieldCheck, BarChart3, Wallet } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Portal, Screen } from '@/types';

export function MobileNav() {
  const { portal, screen, navigate } = useAppStore();

  const clientItems: { key: Screen; icon: typeof House; label: string }[] = [
    { key: 'home', icon: House, label: 'Home' },
    { key: 'services', icon: Wrench, label: 'Services' },
    { key: 'bookings', icon: CalendarDays, label: 'Bookings' },
    { key: 'dashboard', icon: CircleUserRound, label: 'Profile' },
  ];
  const workerItems: { key: Screen; icon: typeof House; label: string }[] = [
    { key: 'workerDashboard', icon: House, label: 'Home' },
    { key: 'gigFeed', icon: Wrench, label: 'Gigs' },
    { key: 'earnings', icon: Wallet, label: 'Earnings' },
  ];
  const adminItems: { key: Screen; icon: typeof House; label: string }[] = [
    { key: 'adminDashboard', icon: House, label: 'Home' },
    { key: 'societyManager', icon: Users, label: 'Societies' },
    { key: 'demandHeatmap', icon: BarChart3, label: 'Heatmap' },
  ];

  const items = portal === 'client' ? clientItems : portal === 'worker' ? workerItems : adminItems;

  return (
    <nav className="mobile-nav">
      {items.map((item) => (
        <button key={item.key} className={screen === item.key ? 'active' : ''} onClick={() => navigate(item.key)}>
          <item.icon size={19} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
