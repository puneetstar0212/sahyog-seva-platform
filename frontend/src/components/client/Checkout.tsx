import { useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, Clock3, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function Checkout() {
  const { selectedService, selectedWorker, navigate, createBooking } = useAppStore();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState(2);

  if (!selectedService) { navigate('services'); return null; }

  const pricePerUnit = selectedWorker?.pricePerHour ?? selectedService.basePrice;
  const total = pricePerUnit * hours;

  const handleConfirm = () => {
    if (!date || !time || !address) return;
    const bookingId = createBooking({
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      workerId: selectedWorker?.id ?? 'w1',
      workerName: selectedWorker?.name ?? 'Auto-assigned',
      workerImage: selectedWorker?.image ?? '',
      clientId: 'c1',
      clientName: 'Ananya Sharma',
      clientImage: 'AS',
      date,
      time,
      address,
      price: total,
    });
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
          <div className="summary-row total"><span>Total</span><strong>₹{total}</strong></div>
          <button className="primary-button full large" onClick={handleConfirm} disabled={!date || !time || !address}>
            Proceed to Payment <ArrowRight size={17} />
          </button>
          {!date || !time || !address ? <small className="form-hint">Fill in date, time and address to continue</small> : null}
        </aside>
      </div>
    </main>
  );
}
