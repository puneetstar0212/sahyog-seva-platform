import { ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, MapPin, Star, TrendingUp, Wallet, Wrench } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { workerEarnings } from '@/data/mockData';

export function WorkerDashboard() {
  const { navigate, workerOnline, setWorkerOnline, gigs, bookings } = useAppStore();
  const openGigs = gigs.filter((g) => g.status === 'open');
  const myJobs = bookings.filter((b) => b.workerId === 'w2' && !['released', 'completed', 'cancelled'].includes(b.status));

  return (
    <main className="container page-main">
      <div className="dashboard-hero">
        <div className="worker-photo large"><img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAClkBPhMbnqYSRWOSFN2NOc_VEGKH2EBE5OxYSzztUMRby_8mqW11lK7rNpGQBtBGqRprR_zbPys0SuXFVTSkNqhumPiJOaCoKNVF2-T1XN1IFzeS4_2GWxlhe8WkmBiVZVjlapqdBuDjss-JuZGltpLPqxQ5Ue9zNRFnRbJF2_t_gbOtVVjxDoZuWNdUeOD-GYV2An1NDYYg5ae8rMnkjv1aRErqfFIRPBWhaljWbuGJNFvXxQ5QWNw" alt="Rajesh Kumar" /></div>
        <div>
          <span className="eyebrow">Worker Dashboard</span>
          <h1>Rajesh Kumar</h1>
          <p>Expert Electrician · Bharat Workers Co-op · Verified</p>
        </div>
        <button className={`toggle-button ${workerOnline ? 'online' : 'offline'}`} onClick={() => setWorkerOnline(!workerOnline)}>
          <span className="toggle-dot" /> {workerOnline ? 'Online' : 'Go Online'}
        </button>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card"><Wallet size={22} /><strong>₹{workerEarnings.thisMonth.toLocaleString()}</strong><span>This Month</span></div>
        <div className="stat-card"><BriefcaseBusiness size={22} /><strong>{workerEarnings.jobsCompleted}</strong><span>Jobs Completed</span></div>
        <div className="stat-card"><Star size={22} /><strong>{workerEarnings.averageRating}</strong><span>Average Rating</span></div>
        <div className="stat-card"><TrendingUp size={22} /><strong>₹{workerEarnings.pendingPayout.toLocaleString()}</strong><span>Pending Payout</span></div>
      </div>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>Available Gigs ({openGigs.length})</h2>
          <button className="text-button" onClick={() => navigate('gigFeed')}>View all <ArrowRight size={16} /></button>
        </div>
        <div className="gig-list">
          {openGigs.slice(0, 3).map((gig) => (
            <article className="gig-card" key={gig.id}>
              <div className="gig-card-info">
                <h3>{gig.serviceName}</h3>
                <p>{gig.description}</p>
                <div className="worker-tags">
                  <span><MapPin size={13} /> {gig.distance}</span>
                  <span><CalendarDays size={13} /> {gig.date}</span>
                  <span><Clock3 size={13} /> {gig.time}</span>
                </div>
              </div>
              <div className="gig-card-right">
                <strong>₹{gig.price}</strong>
                <small>{gig.duration}</small>
                <button className="primary-button" onClick={() => { useAppStore.getState().selectGig(gig); navigate('gigDetail'); }}>View & Accept <ArrowRight size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>My Active Jobs ({myJobs.length})</h2>
        </div>
        {myJobs.length > 0 ? (
          <div className="booking-list">
            {myJobs.map((job) => (
              <article className="booking-list-card" key={job.id}>
                <div className="worker-photo small"><img src={job.workerImage} alt={job.workerName} /></div>
                <div className="booking-list-info">
                  <h3>{job.serviceName}</h3><p>{job.clientName}</p>
                  <div className="booking-list-meta"><span><CalendarDays size={13} /> {job.date}</span><span><Clock3 size={13} /> {job.time}</span></div>
                </div>
                <div className="booking-list-right">
                  <div className={`status-badge ${job.status}`}>{job.status.replace('_', ' ')}</div>
                  <strong>₹{job.price}</strong>
                  <button className="primary-button" onClick={() => { useAppStore.getState().selectBooking(job); navigate('executionMode'); }}>Start Job <ArrowRight size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state small"><Wrench size={24} /><h3>No active jobs</h3><p>Accept a gig to start earning.</p><button className="primary-button" onClick={() => navigate('gigFeed')}>Browse Gigs</button></div>}
      </section>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>Quick Actions</h2>
        </div>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={() => navigate('gigFeed')}><Wrench size={28} /><strong>Browse Gigs</strong><p>Find work near you</p></button>
          <button className="quick-action-card" onClick={() => navigate('earnings')}><Wallet size={28} /><strong>Earnings</strong><p>Track your income</p></button>
          <button className="quick-action-card" onClick={() => navigate('workerOnboarding')}><CheckCircle2 size={28} /><strong>My KYC</strong><p>Verification status</p></button>
          <button className="quick-action-card" onClick={() => useAppStore.getState().setPortal('client')}><BriefcaseBusiness size={28} /><strong>Switch to Client</strong><p>Book services</p></button>
        </div>
      </section>
    </main>
  );
}
