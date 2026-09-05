import { ArrowRight, ChevronLeft, MapPin, Users, Wallet, Building2, Check, Clock3 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { societies } from '@/data/mockData';

export function SocietyManager() {
  const { navigate } = useAppStore();

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('adminDashboard')}><ChevronLeft size={17} /> Back to Overview</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Society Management</span>
        <h1>Cooperative Societies</h1>
        <p>Manage cooperative societies, approve new registrations, and track performance.</p>
      </div>

      <div className="society-list">
        {societies.map((society) => (
          <article className="society-card" key={society.id}>
            <div className="society-info">
              <h3>{society.name}</h3>
              <p><MapPin size={13} /> {society.location} · Established {society.established}</p>
              <div className="worker-tags">
                <span><Users size={13} /> {society.members} members</span>
                <span><Building2 size={13} /> {society.activeWorkers} active workers</span>
                <span><Wallet size={13} /> ₹{(society.totalEarnings / 1000).toFixed(0)}k total</span>
                <span><Wallet size={13} /> ₹{(society.dividendPool / 1000).toFixed(0)}k dividend pool</span>
              </div>
            </div>
            <div className="society-right">
              <div className={`status-badge ${society.status === 'active' ? 'released' : society.status === 'pending' ? 'pending' : 'accepted'}`}>
                {society.status === 'active' && <Check size={12} />}
                {society.status === 'pending' && <Clock3 size={12} />}
                {society.status}
              </div>
              {society.status === 'pending' && <button className="primary-button" onClick={() => undefined}>Approve <ArrowRight size={15} /></button>}
              {society.status === 'review' && <button className="primary-button" onClick={() => undefined}>Begin Review <ArrowRight size={15} /></button>}
              {society.status === 'active' && <button className="outline-button" onClick={() => navigate('dividendLedger')}>View Dividends <ArrowRight size={15} /></button>}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
