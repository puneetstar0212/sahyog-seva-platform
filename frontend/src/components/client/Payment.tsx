import { useState } from 'react';
import { ArrowRight, Check, ChevronLeft, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function Payment() {
  const { selectedBooking, navigate, updateBookingStatus } = useAppStore();
  const [method, setMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  if (!selectedBooking) { navigate('services'); return null; }

  const methods = [
    { id: 'upi', label: 'UPI Payment', icon: Smartphone, desc: 'Pay via PhonePe, GPay, Paytm' },
    { id: 'card', label: 'Credit/Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
    { id: 'netbanking', label: 'Net Banking', icon: Landmark, desc: 'All major banks' },
    { id: 'wallet', label: 'Sahyog Wallet', icon: Wallet, desc: 'Balance: ₹1,200' },
  ];

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setPaid(true);
      updateBookingStatus(selectedBooking.id, 'accepted');
    }, 2000);
  };

  if (paid) {
    return (
      <main className="container page-main">
        <div className="success-panel">
          <span className="success-icon"><Check size={28} /></span>
          <h2>Payment Successful!</h2>
          <p>Your booking has been confirmed. The worker has been notified and will arrive at the scheduled time.</p>
          <div className="payment-receipt">
            <div className="summary-row"><span>Booking ID</span><strong>#{selectedBooking.id.toUpperCase()}</strong></div>
            <div className="summary-row"><span>Amount Paid</span><strong>₹{selectedBooking.price}</strong></div>
            <div className="summary-row"><span>Worker</span><strong>{selectedBooking.workerName}</strong></div>
            <div className="summary-row"><span>Date</span><strong>{selectedBooking.date} at {selectedBooking.time}</strong></div>
          </div>
          <div className="receipt-actions">
            <button className="primary-button" onClick={() => navigate('tracking')}>Track Booking <ArrowRight size={17} /></button>
            <button className="outline-button" onClick={() => navigate('bookings')}>View My Bookings</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container page-main checkout-page">
      <button className="text-button back-link" onClick={() => navigate('checkout')}><ChevronLeft size={17} /> Back to Checkout</button>
      <h1>Payment</h1>
      <div className="checkout-grid">
        <section className="payment-methods">
          <h3>Select payment method</h3>
          {methods.map((m) => (
            <button key={m.id} className={`payment-method ${method === m.id ? 'selected' : ''}`} onClick={() => setMethod(m.id)}>
              <span className="payment-method-icon"><m.icon size={20} /></span>
              <div><strong>{m.label}</strong><small>{m.desc}</small></div>
              <span className={`radio-dot ${method === m.id ? 'checked' : ''}`} />
            </button>
          ))}
        </section>
        <aside className="checkout-summary">
          <h3>Payment Summary</h3>
          <div className="summary-row"><span>Service</span><strong>{selectedBooking.serviceName}</strong></div>
          <div className="summary-row"><span>Worker</span><strong>{selectedBooking.workerName}</strong></div>
          <div className="summary-row"><span>Date</span><strong>{selectedBooking.date}</strong></div>
          <div className="summary-row"><span>Time</span><strong>{selectedBooking.time}</strong></div>
          <div className="summary-divider" />
          <div className="summary-row total"><span>Total</span><strong>₹{selectedBooking.price}</strong></div>
          <button className="primary-button full large" onClick={handlePay} disabled={processing}>
            {processing ? 'Processing...' : `Pay ₹${selectedBooking.price} <ArrowRight size={17} />`}
          </button>
          <small className="form-hint">Payment is held in escrow and released to the worker after OTP verification.</small>
        </aside>
      </div>
    </main>
  );
}
