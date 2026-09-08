import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, TrendingUp, Wallet, BriefcaseBusiness, Star, Download, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function Earnings() {
  const { navigate, workerEarnings, fetchWorkerEarnings } = useAppStore();
  const workerId = useAppStore.getState().session?.user?.id;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workerId) {
      setLoading(true);
      void fetchWorkerEarnings(workerId).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const maxAmount = workerEarnings && workerEarnings.monthlyHistory.length > 0
    ? Math.max(...workerEarnings.monthlyHistory.map((m) => m.amount), 1)
    : 1;


  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('workerDashboard')}><ChevronLeft size={17} /> Back to Dashboard</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Earnings Dashboard</span>
        <h1>Your earnings</h1>
        <p>Track your income, payouts, and performance over time.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem 0', opacity: 0.65 }}>
          <Loader2 size={20} className="spin" />
          <span>Loading earnings data…</span>
        </div>
      ) : (
        <>
          <div className="dashboard-stats-grid">
            <div className="stat-card"><Wallet size={22} /><strong>₹{workerEarnings?.total?.toLocaleString() ?? 0}</strong><span>Total Earnings</span></div>
            <div className="stat-card"><TrendingUp size={22} /><strong>₹{workerEarnings?.thisMonth?.toLocaleString() ?? 0}</strong><span>This Month</span></div>
            <div className="stat-card"><BriefcaseBusiness size={22} /><strong>{workerEarnings?.jobsCompleted ?? 0}</strong><span>Jobs Completed</span></div>
            <div className="stat-card"><Star size={22} /><strong>{workerEarnings?.averageRating ?? '—'}</strong><span>Average Rating</span></div>
          </div>

          <section className="dashboard-section">
            <div className="section-heading row">
              <h2>Monthly Earnings</h2>
              <button className="text-button"><Download size={16} /> Download Statement</button>
            </div>
            <div className="earnings-chart">
              {workerEarnings?.monthlyHistory?.map((m) => (
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
                <strong>₹{workerEarnings?.pendingPayout?.toLocaleString() ?? 0}</strong>
                <button className="primary-button full">Withdraw to Bank <ArrowRight size={16} /></button>
              </div>
              <div className="payout-card">
                <small>This Week</small>
                <strong>₹{workerEarnings?.thisWeek?.toLocaleString() ?? 0}</strong>
                <span className="payout-info">Payout scheduled for Friday</span>
              </div>
              <div className="payout-card">
                <small>Hourly Rate</small>
                <strong>₹{workerEarnings?.hourlyRate ?? 0}</strong>
                <span className="payout-info">Set your own rate</span>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
