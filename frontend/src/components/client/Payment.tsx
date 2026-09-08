import { useState } from 'react';
import { ArrowRight, Check, ChevronLeft, CreditCard, Landmark, Smartphone, Wallet, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';

export function Payment() {
  const { selectedBooking, navigate, updateBookingStatus } = useAppStore();
  const [method, setMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrowDetails, setEscrowDetails] = useState<{
    worker_payout: number;
    coop_commission: number;
    status: string;
  } | null>(null);

  if (!selectedBooking) { navigate('services'); return null; }

  const methods = [
    { id: 'upi', label: 'UPI Payment', icon: Smartphone, desc: 'Pay via PhonePe, GPay, Paytm' },
    { id: 'card', label: 'Credit/Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
    { id: 'netbanking', label: 'Net Banking', icon: Landmark, desc: 'All major banks' },
    { id: 'wallet', label: 'Sahyog Wallet', icon: Wallet, desc: 'Balance: ₹1,200' },
  ];

  const handlePay = async () => {
    if (processing) return;
    setProcessing(true);
    setError(null);
    try {
      let gigId = selectedBooking.gig_id;
      if (!gigId) {
        throw new Error('Booking is not properly linked to a gig. Please try creating the booking again.');
      }

      const escrowResult = await api.payments.lockEscrow({
        gig_id: gigId,
        amount: selectedBooking.price,
      });

      await updateBookingStatus(selectedBooking.id, 'accepted');
      
      setEscrowDetails({
        worker_payout: escrowResult.worker_payout,
        coop_commission: escrowResult.coop_commission,
        status: escrowResult.status,
      });
      setPaid(true);
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
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
            {escrowDetails && (
              <>
                <div className="summary-divider" style={{ margin: '1rem 0', height: 1, background: '#eee' }} />
                <div className="summary-row"><span>Escrow Status</span><strong>{escrowDetails.status}</strong></div>
                <div className="summary-row"><span>Worker Payout</span><strong>₹{escrowDetails.worker_payout}</strong></div>
                <div className="summary-row"><span>Cooperative Amount</span><strong>₹{escrowDetails.coop_commission}</strong></div>
              </>
            )}
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
          {error && (
            <small className="error-text" style={{ display: 'block', marginBottom: '0.5rem', color: 'red' }}>
              ⚠ {error}
            </small>
          )}
          <button className="primary-button full large" onClick={handlePay} disabled={processing}>
            {processing ? <><Loader2 size={17} className="spin" /> Processing…</> : `Pay ₹${selectedBooking.price} `}
            {!processing && <ArrowRight size={17} />}
          </button>
          <small className="form-hint">Payment is held in escrow and released to the worker after OTP verification.</small>
        </aside>
      </div>
    </main>
  );
}
