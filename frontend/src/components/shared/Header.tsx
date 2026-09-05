import { Menu, X, Search, CircleUserRound, Users, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Portal, Screen } from '@/types';
import { Logo } from './Logo';
import { OnlineIndicator } from './OnlineIndicator';

interface NavItem { key: Screen; label: string; }

const clientNav: NavItem[] = [
  { key: 'home', label: 'Home' },
  { key: 'services', label: 'Services' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'dashboard', label: 'Dashboard' },
];

const workerNav: NavItem[] = [
  { key: 'workerDashboard', label: 'Dashboard' },
  { key: 'gigFeed', label: 'Gig Feed' },
  { key: 'earnings', label: 'Earnings' },
];

const adminNav: NavItem[] = [
  { key: 'adminDashboard', label: 'Overview' },
  { key: 'manageCustomers', label: 'Customers' },
  { key: 'manageWorkers', label: 'Workers' },
  { key: 'societyManager', label: 'Societies' },
  { key: 'dividendLedger', label: 'Dividends' },
  { key: 'demandHeatmap', label: 'Heatmap' },
];

export function Header() {
  const { portal, screen, navigate, setPortal } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = portal === 'client' ? clientNav : portal === 'worker' ? workerNav : adminNav;
  const nav = (target: Screen) => { navigate(target); setMenuOpen(false); };
  const switchPortal = (p: Portal) => { setPortal(p); setMenuOpen(false); };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Logo />
        <nav className="desktop-nav">
          {navItems.map((item) => (
            <button key={item.key} className={screen === item.key ? 'active' : ''} onClick={() => nav(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <OnlineIndicator />
          <div className="portal-switcher desktop-only">
            <button className={portal === 'client' ? 'active' : ''} onClick={() => switchPortal('client')} title="Client Portal">
              <CircleUserRound size={16} /> Client
            </button>
            <button className={portal === 'worker' ? 'active' : ''} onClick={() => switchPortal('worker')} title="Worker Portal">
              <Users size={16} /> Worker
            </button>
            <button className={portal === 'admin' ? 'active' : ''} onClick={() => switchPortal('admin')} title="Admin Portal">
              <ShieldCheck size={16} /> Admin
            </button>
          </div>
          <button className="avatar" onClick={() => nav(portal === 'client' ? 'dashboard' : portal === 'worker' ? 'workerDashboard' : 'adminDashboard')} aria-label="Open dashboard">
            {portal === 'client' ? 'AS' : portal === 'worker' ? 'RD' : 'AD'}
          </button>
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="mobile-menu">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => nav(item.key)}>{item.label}</button>
          ))}
          <div className="mobile-portal-switcher">
            <button className={portal === 'client' ? 'active' : ''} onClick={() => switchPortal('client')}>Client</button>
            <button className={portal === 'worker' ? 'active' : ''} onClick={() => switchPortal('worker')}>Worker</button>
            <button className={portal === 'admin' ? 'active' : ''} onClick={() => switchPortal('admin')}>Admin</button>
          </div>
        </div>
      )}
    </header>
  );
}
