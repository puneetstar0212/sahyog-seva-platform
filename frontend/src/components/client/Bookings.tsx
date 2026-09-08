import { useEffect } from 'react';
import { ArrowRight, CalendarDays, Clock3, Loader2, MapPin, Star } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Booking } from '@/types';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  travelling: 'Worker Travelling',
  arrived: 'Worker Arrived',
  working: 'In Progress',
  awaiting_otp: 'Awaiting OTP',
  completed: 'Completed',
  released: 'Completed',
  cancelled: 'Cancelled',
};

export function Bookings() {
  const { bookings, selectBooking, navigate, session, fetchUserBookings, isBookingLoading } = useAppStore();

  // On mount: if the user is logged in, load their persisted bookings from the backend.
  // Falls back to mock data if not logged in or backend is unavailable.
  useEffect(() => {
    if (session?.user.id) {
      fetchUserBookings();
    }
  }, [session?.user.id, fetchUserBookings]);

  // Show bookings belonging to the current user (or demo user 'c1')
  const currentClientId = session?.user.id ?? 'c1';
  const clientBookings = bookings.filter(
    (b) => b.clientId === currentClientId || b.clientId === 'c1'
  );

  const openTracking = (booking: Booking) => { selectBooking(booking); navigate('tracking'); };

  return (
    <main className="container page-main">
      <div className="section-heading row">
        <div>
          <span className="eyebrow">My Bookings</span>
          <h1>Your bookings</h1>
        </div>
        <button className="primary-button" onClick={() => navigate('services')}>Book a Service <ArrowRight size={17} /></button>
      </div>

      {isBookingLoading && (
        <div className="loading-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', opacity: 0.6 }}>
          <Loader2 size={16} className="spin" />
          <small>Loading your bookings…</small>
        </div>
      )}

      {clientBookings.length === 0 ? (
        <div className="empty-state">
          <CalendarDays size={26} />
          <h3>No bookings yet</h3>
          <p>Browse services and book your first worker.</p>
          <button className="primary-button" onClick={() => navigate('services')}>Browse Services</button>
        </div>
      ) : (
        <div className="booking-list">
          {clientBookings.map((booking) => (
            <article className="booking-list-card" key={booking.id}>
              <div className="worker-photo small"><img src={booking.workerImage} alt={booking.workerName} /></div>
              <div className="booking-list-info">
                <h3>{booking.serviceName}</h3>
                <p>{booking.workerName}</p>
                <div className="booking-list-meta">
                  <span><CalendarDays size={13} /> {booking.date}</span>
                  <span><Clock3 size={13} /> {booking.time}</span>
                  <span><MapPin size={13} /> {booking.address.split(',')[0]}</span>
                </div>
              </div>
              <div className="booking-list-right">
                <div className={`status-badge ${booking.status}`}>{statusLabels[booking.status] ?? booking.status}</div>
                <strong>₹{booking.price}</strong>
                {booking.rating && <span className="booking-rating"><Star size={13} fill="currentColor" /> {booking.rating}</span>}
                <button className="primary-button" onClick={() => openTracking(booking)}>
                  {booking.status === 'completed' || booking.status === 'released' ? 'View' : 'Track'} <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
