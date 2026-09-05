import { ArrowRight, ChevronLeft, TrendingUp, Wallet, BriefcaseBusiness, Star, Download } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { workerEarnings } from '@/data/mockData';

export function Earnings() {
  const { navigate } = useAppStore();
  const maxAmount = Math.max(...workerEarnings.monthlyHistory.map((m) => m.amount));

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('workerDashboard')}><ChevronLeft size={17} /> Back to Dashboard</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Earnings Dashboard</span>
        <h1>Your earnings</h1>
        <p>Track your income, payouts, and performance over time.</p>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card"><Wallet size={22} /><strong>₹{workerEarnings.total.toLocaleString()}</strong><span>Total Earnings</span></div>
        <div className="stat-card"><TrendingUp size={22} /><strong>₹{workerEarnings.thisMonth.toLocaleString()}</strong><span>This Month</span></div>
        <div className="stat-card"><BriefcaseBusiness size={22} /><strong>{workerEarnings.jobsCompleted}</strong><span>Jobs Completed</span></div>
        <div className="stat-card"><Star size={22} /><strong>{workerEarnings.averageRating}</strong><span>Average Rating</span></div>
      </div>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>Monthly Earnings</h2>
          <button className="text-button"><Download size={16} /> Download Statement</button>
        </div>
        <div className="earnings-chart">
          {workerEarnings.monthlyHistory.map((m) => (
            <div key={m.month} className="chart-bar">
              <div className="chart-bar-fill" style={{ height: `${(m.amount / maxAmount) * 100}%` }}>
                <span className="chart-bar-value">₹{(m.amount / 1000).toFixed(1)}k</span>
              </div>
              <span className="chart-bar-label">{m.month}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>Payout Details</h2>
        </div>
        <div className="payout-grid">
          <div className="payout-card">
            <small>Available for Payout</small>
            <strong>₹{workerEarnings.pendingPayout.toLocaleString()}</strong>
            <button className="primary-button full">Withdraw to Bank <ArrowRight size={16} /></button>
          </div>
          <div className="payout-card">
            <small>This Week</small>
            <strong>₹{workerEarnings.thisWeek.toLocaleString()}</strong>
            <span className="payout-info">Payout scheduled for Friday</span>
          </div>
          <div className="payout-card">
            <small>Hourly Rate</small>
            <strong>₹{workerEarnings.hourlyRate}</strong>
            <span className="payout-info">Set your own rate</span>
          </div>
        </div>
      </section>
    </main>
  );
}
