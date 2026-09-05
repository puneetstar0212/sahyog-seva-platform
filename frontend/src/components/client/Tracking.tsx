import { useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, Clock3, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { BookingStatus } from '@/types';

const statusSteps: { key: BookingStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'awaiting_otp', label: 'Awaiting OTP' },
  { key: 'released', label: 'Completed' },
];

export function Tracking() {
  const { selectedBooking, navigate, updateBookingStatus } = useAppStore();
  if (!selectedBooking) { navigate('bookings'); return null; }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === selectedBooking.status);
  const isCompleted = selectedBooking.status === 'released' || selectedBooking.status === 'completed';

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('bookings')}><ChevronLeft size={17} /> Back to Bookings</button>
      <h1>Track Booking</h1>
      <div className="tracking-grid">
        <div className="tracking-main">
          <div className="tracking-status-card">
            <div className="tracking-worker">
              <div className="worker-photo"><img src={selectedBooking.workerImage} alt={selectedBooking.workerName} /></div>
              <div><h3>{selectedBooking.workerName}</h3><p>{selectedBooking.serviceName}</p></div>
              <div className="tracking-actions">
                <button className="icon-button" onClick={() => navigate('chat')} aria-label="Chat"><MessageCircle size={20} /></button>
                <button className="icon-button" aria-label="Call"><Phone size={20} /></button>
              </div>
            </div>
            <div className="tracking-info">
              <span><CalendarDays size={16} /> {selectedBooking.date}</span>
              <span><Clock3 size={16} /> {selectedBooking.time}</span>
              <span><MapPin size={16} /> {selectedBooking.address}</span>
            </div>
          </div>

          <div className="tracking-progress">
            {statusSteps.map((step, index) => (
              <div key={step.key} className={`tracking-step ${index <= currentStepIndex ? 'active' : ''} ${index === currentStepIndex ? 'current' : ''}`}>
                <span className="step-dot">{index < currentStepIndex ? '✓' : index + 1}</span>
                <span className="step-label">{step.label}</span>
              </div>
            ))}
          </div>

          {selectedBooking.status === 'accepted' && (
            <div className="tracking-action-box">
              <h3>Worker is on the way</h3>
              <p>Your worker has accepted the booking and will arrive at the scheduled time. You can chat or call to coordinate.</p>
              <button className="primary-button" onClick={() => { updateBookingStatus(selectedBooking.id, 'in_progress'); }}>Mark as Started <ArrowRight size={17} /></button>
            </div>
          )}
          {selectedBooking.status === 'in_progress' && (
            <div className="tracking-action-box">
              <h3>Work in progress</h3>
              <p>The worker is currently performing the service. Once complete, you'll receive an OTP to release payment.</p>
              <button className="primary-button" onClick={() => { updateBookingStatus(selectedBooking.id, 'awaiting_otp'); }}>Mark as Complete <ArrowRight size={17} /></button>
            </div>
          )}
          {selectedBooking.status === 'awaiting_otp' && (
            <div className="tracking-action-box highlight">
              <ShieldCheck size={28} />
              <h3>Enter OTP to release payment</h3>
              <p>Your worker has completed the service. Enter the 4-digit OTP they shared with you to release the escrow payment.</p>
              <OtpInput bookingId={selectedBooking.id} expectedOtp={selectedBooking.otp} />
            </div>
          )}
          {isCompleted && (
            <div className="tracking-action-box">
              <h3>Service Completed!</h3>
              <p>Payment has been released to the worker. Please rate your experience.</p>
              <button className="primary-button" onClick={() => navigate('review')}>Leave a Review <ArrowRight size={17} /></button>
            </div>
          )}
        </div>

        <aside className="checkout-summary">
          <h3>Booking Summary</h3>
          <div className="summary-row"><span>Booking ID</span><strong>#{selectedBooking.id.toUpperCase()}</strong></div>
          <div className="summary-row"><span>Service</span><strong>{selectedBooking.serviceName}</strong></div>
          <div className="summary-row"><span>Worker</span><strong>{selectedBooking.workerName}</strong></div>
          <div className="summary-row"><span>Date</span><strong>{selectedBooking.date}</strong></div>
          <div className="summary-row"><span>Time</span><strong>{selectedBooking.time}</strong></div>
          <div className="summary-divider" />
          <div className="summary-row total"><span>Amount</span><strong>₹{selectedBooking.price}</strong></div>
          <div className={`status-badge ${selectedBooking.status}`}>{selectedBooking.status.replace('_', ' ')}</div>
        </aside>
      </div>
    </main>
  );
}

function OtpInput({ bookingId, expectedOtp }: { bookingId: string; expectedOtp: string }) {
  const { otpInput, setOtpInput, releasePayment, navigate } = useAppStore();
  const [error, setError] = useState(false);

  const handleVerify = () => {
    if (otpInput === expectedOtp) { releasePayment(bookingId); navigate('review'); }
    else setError(true);
  };

  return (
    <div className="otp-input-box">
      <input
        type="text"
        maxLength={4}
        value={otpInput}
        onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, '')); setError(false); }}
        placeholder="Enter 4-digit OTP"
        className="otp-input"
      />
      {error && <small className="error-text">Incorrect OTP. Please check with your worker.</small>}
      <button className="primary-button full" onClick={handleVerify} disabled={otpInput.length !== 4}>
        Verify & Release Payment <ArrowRight size={17} />
      </button>
    </div>
  );
}
