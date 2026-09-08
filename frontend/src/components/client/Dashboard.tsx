import { ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Star, Users, Wallet, House, Plus, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Clock3 } from 'lucide-react';
import { useState } from 'react';

export function Dashboard() {
  const { bookings, navigate, setPortal, createNewGig } = useAppStore();
  const [showPostGig, setShowPostGig] = useState(false);
  const [gigForm, setGigForm] = useState({ title: '', description: '', price: 500, address: 'Bandra West, Mumbai' });
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const handlePostGig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    setPostError('');
    try {
      await createNewGig({
        serviceName: gigForm.title,
        description: gigForm.description,
        price: gigForm.price,
        address: gigForm.address,
        clientId: 'c1',
        clientName: 'Ananya Sharma',
        clientImage: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        status: 'open',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: '1-2 hours',
        distance: '1.2 km',
      });
      setShowPostGig(false);
      setGigForm({ title: '', description: '', price: 500, address: 'Bandra West, Mumbai' });
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : 'Failed to post gig');
    } finally {
      setIsPosting(false);
    }
  };
  const clientBookings = bookings.filter((b) => b.clientId === 'c1');
  const activeBookings = clientBookings.filter((b) => !['released', 'completed', 'cancelled'].includes(b.status));
  const completedBookings = clientBookings.filter((b) => ['released', 'completed'].includes(b.status));

  return (
    <main className="container page-main">
      <div className="dashboard-hero">
        <div className="worker-photo large"><span>AS</span></div>
        <div>
          <span className="eyebrow">Welcome back</span>
          <h1>Ananya Sharma</h1>
          <p>ananya.sharma@email.com · Bandra West, Mumbai</p>
        </div>
        <button className="primary-button" onClick={() => navigate('services')}>Book a Service <ArrowRight size={17} /></button>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card"><CalendarDays size={22} /><strong>{activeBookings.length}</strong><span>Active Bookings</span></div>
        <div className="stat-card"><CheckCircle2 size={22} /><strong>{completedBookings.length}</strong><span>Completed</span></div>
        <div className="stat-card"><Wallet size={22} /><strong>₹{completedBookings.reduce((sum, b) => sum + b.price, 0)}</strong><span>Total Spent</span></div>
        <div className="stat-card"><Star size={22} /><strong>{completedBookings.filter((b) => b.rating).length}</strong><span>Reviews Given</span></div>
      </div>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>Active Bookings</h2>
          <button className="text-button" onClick={() => navigate('bookings')}>View all <ArrowRight size={16} /></button>
        </div>
        {activeBookings.length > 0 ? (
          <div className="booking-list">
            {activeBookings.map((booking) => (
              <article className="booking-list-card" key={booking.id}>
                <div className="worker-photo small"><img src={booking.workerImage} alt={booking.workerName} /></div>
                <div className="booking-list-info">
                  <h3>{booking.serviceName}</h3><p>{booking.workerName}</p>
                  <div className="booking-list-meta"><span><CalendarDays size={13} /> {booking.date}</span><span><Clock3 size={13} /> {booking.time}</span></div>
                </div>
                <div className="booking-list-right">
                  <div className={`status-badge ${booking.status}`}>{booking.status.replace('_', ' ')}</div>
                  <strong>₹{booking.price}</strong>
                  <button className="primary-button" onClick={() => { useAppStore.getState().selectBooking(booking); navigate('tracking'); }}>Track <ArrowRight size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-state small"><CalendarDays size={24} /><h3>No active bookings</h3><p>Book a service to see it here.</p><button className="primary-button" onClick={() => navigate('services')}>Browse Services</button></div>}
      </section>

      <section className="dashboard-section">
        <div className="section-heading row">
          <h2>Quick Actions</h2>
        </div>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={() => setShowPostGig(true)}><Plus size={28} /><strong>Post a Gig</strong><p>Broadcast to local workers</p></button>
          <button className="quick-action-card" onClick={() => navigate('services')}><House size={28} /><strong>Book a Service</strong><p>Browse and book workers</p></button>
          <button className="quick-action-card" onClick={() => navigate('bookings')}><CalendarDays size={28} /><strong>My Bookings</strong><p>Track and manage</p></button>
          <button className="quick-action-card" onClick={() => setPortal('worker')}><BriefcaseBusiness size={28} /><strong>Become a Worker</strong><p>Join the cooperative</p></button>
          <button className="quick-action-card" onClick={() => setPortal('admin')}><Users size={28} /><strong>Admin Portal</strong><p>Manage societies</p></button>
        </div>
      </section>

      {showPostGig && (
        <section className="dashboard-section mt-8 border border-[#eaded8] p-6 rounded-2xl bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Post a New Gig</h2>
            <button className="text-[#a08c82]" onClick={() => setShowPostGig(false)}>Cancel</button>
          </div>
          {postError && <p className="text-red-500 mb-4">{postError}</p>}
          <form onSubmit={handlePostGig} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Gig Title / Service Needed</label>
              <input required className="w-full border border-[#eaded8] rounded-xl p-3" value={gigForm.title} onChange={e => setGigForm({...gigForm, title: e.target.value})} placeholder="e.g. Need a plumber urgently" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea required className="w-full border border-[#eaded8] rounded-xl p-3" value={gigForm.description} onChange={e => setGigForm({...gigForm, description: e.target.value})} placeholder="More details about the job" rows={3}></textarea>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Estimated Price (₹)</label>
                <input required type="number" className="w-full border border-[#eaded8] rounded-xl p-3" value={gigForm.price} onChange={e => setGigForm({...gigForm, price: Number(e.target.value)})} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Address</label>
                <input required className="w-full border border-[#eaded8] rounded-xl p-3" value={gigForm.address} onChange={e => setGigForm({...gigForm, address: e.target.value})} />
              </div>
            </div>
            <button disabled={isPosting} className="primary-button justify-center mt-2" type="submit">
              {isPosting ? <Loader2 className="animate-spin" size={20} /> : 'Post Gig'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
