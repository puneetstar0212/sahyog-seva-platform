import { useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function Checkout() {
  const { selectedService, selectedWorker, navigate, createBooking, isBookingSubmitting, bookingError, session } = useAppStore();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState(2);

  if (!selectedService) { navigate('services'); return null; }

  const pricePerUnit = selectedWorker?.pricePerHour ?? selectedService.basePrice;
  const total = pricePerUnit * hours;

  const handleConfirm = async () => {
    if (!date || !time || !address) return;
    if (isBookingSubmitting) return; // Guard against double-click

    await createBooking({
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      workerId: selectedWorker?.id ?? 'w1',
      workerName: selectedWorker?.name ?? 'Auto-assigned',
      workerImage: selectedWorker?.image ?? '',
      clientId: session?.user.id ?? 'c1',
      clientName: session?.user.email?.split('@')[0] ?? 'Ananya Sharma',
      clientImage: session?.user.email?.slice(0, 2).toUpperCase() ?? 'AS',
      date,
      time,
      address,
      price: total,
    });
    // Navigate even if API failed — optimistic booking is already in Zustand
    navigate('payment');
  };

  return (
    <main className="container page-main checkout-page">
      <button className="text-button back-link" onClick={() => navigate('workerProfile')}><ChevronLeft size={17} /> Back</button>
      <h1>Checkout</h1>
      <div className="checkout-grid">
        <section className="form-card">
          <div className="form-title">
            <span className={`service-icon ${selectedService.color}`}><CalendarDays size={21} /></span>
            <div><h2>Booking details</h2><p>Schedule your service appointment.</p></div>
          </div>
          <div className="form-grid">
            <label className="wide">Service<input value={selectedService.name} readOnly /></label>
            {selectedWorker && <label className="wide">Worker<input value={selectedWorker.name} readOnly /></label>}
            <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className="wide">Address<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House/Flat No., Street, Area" /></label>
            <label>Duration (hours)<input type="number" min="1" max="8" value={hours} onChange={(e) => setHours(Math.max(1, Number(e.target.value)))} /></label>
          </div>
        </section>

        <aside className="checkout-summary">
          <h3>Order Summary</h3>
          <div className="summary-row"><span>Service</span><strong>{selectedService.name}</strong></div>
          {selectedWorker && <div className="summary-row"><span>Worker</span><strong>{selectedWorker.name}</strong></div>}
          <div className="summary-row"><span>Rate</span><strong>₹{pricePerUnit}/hr</strong></div>
          <div className="summary-row"><span>Duration</span><strong>{hours} hours</strong></div>
          <div className="summary-divider" />
          <div className="summary-row total"><span>Gross Amount</span><strong>₹{total}</strong></div>
          
          <div className="summary-row" style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            <span>Worker Payout (95%)</span>
            <strong>₹{Math.round(total * 0.95)}</strong>
          </div>
          <div className="summary-row" style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            <span>Cooperative Contribution (5%)</span>
            <strong>₹{Math.round(total * 0.05)}</strong>
          </div>

          {bookingError && (
            <small className="error-text" style={{ display: 'block', marginBottom: '0.5rem' }}>
              ⚠ {bookingError} (continuing in demo mode)
            </small>
          )}

          <button
            className="primary-button full large"
            onClick={handleConfirm}
            disabled={!date || !time || !address || isBookingSubmitting}
            id="checkout-confirm-btn"
          >
            {isBookingSubmitting
              ? <><Loader2 size={17} className="spin" /> Creating booking…</>
              : <>Proceed to Payment <ArrowRight size={17} /></>}
          </button>
          {!date || !time || !address ? <small className="form-hint">Fill in date, time and address to continue</small> : null}
        </aside>
      </div>
    </main>
  );
}
