import { useEffect, useState } from 'react';
import { ArrowRight, Building2, CircleDollarSign, Clock3, TrendingUp, Users, Wallet, Wrench, ShieldAlert, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { societies, dividendRecords, demandHeatmap } from '@/data/mockData';

type Stats = { totalCustomers: number; totalWorkers: number; pendingApprovals: number };

export function AdminDashboard() {
  const { navigate } = useAppStore();
  const [stats, setStats] = useState<Stats>({ totalCustomers: 0, totalWorkers: 0, pendingApprovals: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: totalCustomers }, { count: totalWorkers }, { count: pendingApprovals }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('worker_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('worker_profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      ]);
      setStats({
        totalCustomers: totalCustomers ?? 0,
        totalWorkers: totalWorkers ?? 0,
        pendingApprovals: pendingApprovals ?? 0,
      });
    })();
  }, []);

  const totalMembers = societies.reduce((sum, s) => sum + s.members, 0);
  const totalEarnings = societies.reduce((sum, s) => sum + s.totalEarnings, 0);
  const totalDividend = societies.reduce((sum, s) => sum + s.dividendPool, 0);
  const activeSocieties = societies.filter((s) => s.status === 'active').length;
  const pendingDividends = dividendRecords.filter((d) => d.status === 'pending').length;
  const highDemandAreas = demandHeatmap.filter((d) => d.gap > 25).length;

  return (
    <main className="container page-main">
      <div className="dashboard-hero">
        <div className="worker-photo large"><span>AD</span></div>
        <div>
          <span className="eyebrow">Admin Portal</span>
          <h1>Sahyog Seva Cooperative</h1>
          <p>Platform-wide overview · Mumbai Region</p>
        </div>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card"><Users size={22} /><strong>{stats.totalCustomers}</strong><span>Total Customers</span></div>
        <div className="stat-card"><Wrench size={22} /><strong>{stats.totalWorkers}</strong><span>Total Workers</span></div>
        <div className="stat-card highlight-stat"><Clock3 size={22} /><strong>{stats.pendingApprovals}</strong><span>Pending Approvals</span></div>
        <div className="stat-card"><Building2 size={22} /><strong>{activeSocieties}</strong><span>Active Societies</span></div>
        <div className="stat-card"><Wallet size={22} /><strong>₹{(totalEarnings / 1000).toFixed(0)}k</strong><span>Total Revenue</span></div>
        <div className="stat-card"><CircleDollarSign size={22} /><strong>₹{(totalDividend / 1000).toFixed(0)}k</strong><span>Dividend Pool</span></div>
        <div className="stat-card"><Users size={22} /><strong>{totalMembers}</strong><span>Co-op Members</span></div>
        <div className="stat-card"><TrendingUp size={22} /><strong>{highDemandAreas}</strong><span>High-Demand Areas</span></div>
      </div>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>Quick Actions</h2>
        </div>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={() => navigate('manageWorkers')}><ShieldAlert size={28} /><strong>Approve Workers</strong><p>{stats.pendingApprovals} pending review</p></button>
          <button className="quick-action-card" onClick={() => navigate('manageCustomers')}><Users size={28} /><strong>Manage Customers</strong><p>{stats.totalCustomers} registered</p></button>
          <button className="quick-action-card" onClick={() => navigate('societyManager')}><Building2 size={28} /><strong>Society Manager</strong><p>Manage cooperatives</p></button>
          <button className="quick-action-card" onClick={() => navigate('dividendLedger')}><CircleDollarSign size={28} /><strong>Dividend Ledger</strong><p>{pendingDividends} pending payouts</p></button>
          <button className="quick-action-card" onClick={() => navigate('demandHeatmap')}><TrendingUp size={28} /><strong>Demand Heatmap</strong><p>{highDemandAreas} high-demand areas</p></button>
          <button className="quick-action-card" onClick={() => useAppStore.getState().setPortal('client')}><Users size={28} /><strong>Switch to Client</strong><p>View as customer</p></button>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>Recent Societies</h2>
          <button className="text-button" onClick={() => navigate('societyManager')}>View all <ArrowRight size={16} /></button>
        </div>
        <div className="society-list">
          {societies.slice(0, 3).map((society) => (
            <article className="society-card" key={society.id}>
              <div className="society-info">
                <h3>{society.name}</h3>
                <p>{society.location} · Est. {society.established}</p>
                <div className="worker-tags">
                  <span><Users size={13} /> {society.members} members</span>
                  <span><Wallet size={13} /> ₹{(society.totalEarnings / 1000).toFixed(0)}k revenue</span>
                </div>
              </div>
              <div className="society-right">
                <div className={`status-badge ${society.status === 'active' ? 'released' : society.status === 'pending' ? 'pending' : 'accepted'}`}>{society.status === 'active' && <Check size={12} />}{society.status}</div>
                <button className="outline-button" onClick={() => navigate('societyManager')}>Manage <ArrowRight size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
