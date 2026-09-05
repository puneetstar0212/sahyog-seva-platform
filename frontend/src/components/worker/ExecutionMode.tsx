import { useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronLeft, Clock3, MapPin, Navigation, Phone, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function ExecutionMode() {
  const { selectedBooking, navigate, updateBookingStatus, executionStep, setExecutionStep } = useAppStore();
  const [otpRevealed, setOtpRevealed] = useState(false);

  if (!selectedBooking) { navigate('workerDashboard'); return null; }

  const steps = ['travel', 'arrived', 'working', 'awaiting_otp', 'done'] as const;
  const stepIndex = steps.indexOf(executionStep);
  const stepLabels: Record<string, string> = { travel: 'Travelling', arrived: 'Arrived', working: 'Working', awaiting_otp: 'Awaiting OTP', done: 'Completed' };

  const advance = () => {
    const next = steps[Math.min(stepIndex + 1, steps.length - 1)];
    setExecutionStep(next);
    if (next === 'awaiting_otp') updateBookingStatus(selectedBooking.id, 'awaiting_otp');
    if (next === 'done') updateBookingStatus(selectedBooking.id, 'released');
  };

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('workerDashboard')}><ChevronLeft size={17} /> Back to Dashboard</button>
      <div className="execution-grid">
        <div className="execution-main">
          <div className="execution-header">
            <h1>Execution Mode</h1>
            <div className={`status-badge ${selectedBooking.status}`}>{selectedBooking.status.replace('_', ' ')}</div>
          </div>
          <div className="execution-job-card">
            <h3>{selectedBooking.serviceName}</h3>
            <div className="worker-tags">
              <span><CalendarDays size={13} /> {selectedBooking.date}</span>
              <span><Clock3 size={13} /> {selectedBooking.time}</span>
              <span><MapPin size={13} /> {selectedBooking.address}</span>
            </div>
            <div className="execution-client-row">
              <div className="worker-photo small"><span>{selectedBooking.clientImage}</span></div>
              <strong>{selectedBooking.clientName}</strong>
              <button className="icon-button"><Phone size={18} /></button>
            </div>
          </div>

          <div className="execution-steps">
            {steps.map((step, index) => (
              <div key={step} className={`execution-step ${index <= stepIndex ? 'active' : ''} ${index === stepIndex ? 'current' : ''}`}>
                <span className="step-dot">{index < stepIndex ? <Check size={14} /> : index + 1}</span>
                <span>{stepLabels[step]}</span>
              </div>
            ))}
          </div>

          {executionStep === 'travel' && (
            <div className="execution-action-box">
              <Navigation size={28} />
              <h3>Navigate to client location</h3>
              <p>Use the map to navigate to the client's address. Tap "I've Arrived" when you reach the location.</p>
              <button className="primary-button large" onClick={advance}>I've Arrived <ArrowRight size={17} /></button>
            </div>
          )}
          {executionStep === 'arrived' && (
            <div className="execution-action-box">
              <MapPin size={28} />
              <h3>You've arrived at the location</h3>
              <p>Confirm with the client and start the service work.</p>
              <button className="primary-button large" onClick={advance}>Start Working <ArrowRight size={17} /></button>
            </div>
          )}
          {executionStep === 'working' && (
            <div className="execution-action-box">
              <Clock3 size={28} />
              <h3>Work in progress</h3>
              <p>Complete the service. Once done, generate an OTP for the client to release payment.</p>
              <button className="primary-button large" onClick={advance}>Mark Complete & Generate OTP <ArrowRight size={17} /></button>
            </div>
          )}
          {executionStep === 'awaiting_otp' && (
            <div className="execution-action-box highlight">
              <ShieldCheck size={28} />
              <h3>Share OTP with client</h3>
              <p>Share this 4-digit OTP with the client. They will enter it to release your payment from escrow.</p>
              <div className="otp-display">
                <button className="otp-reveal-btn" onClick={() => setOtpRevealed(!otpRevealed)}>
                  {otpRevealed ? selectedBooking.otp : '• • • •'}
                </button>
              </div>
              <small>Waiting for client to verify...</small>
              <button className="outline-button" onClick={() => { setExecutionStep('done'); updateBookingStatus(selectedBooking.id, 'released'); }}>
                Simulate Client Verification <ArrowRight size={17} />
              </button>
            </div>
          )}
          {executionStep === 'done' && (
            <div className="execution-action-box">
              <span className="success-icon"><Check size={28} /></span>
              <h3>Job Completed!</h3>
              <p>Payment of ₹{selectedBooking.price} has been released to your account. Great work!</p>
              <button className="primary-button" onClick={() => navigate('earnings')}>View Earnings <ArrowRight size={17} /></button>
              <button className="outline-button" onClick={() => navigate('workerDashboard')}>Back to Dashboard</button>
            </div>
          )}
        </div>

        <aside className="checkout-summary">
          <h3>Job Summary</h3>
          <div className="summary-row"><span>Booking ID</span><strong>#{selectedBooking.id.toUpperCase()}</strong></div>
          <div className="summary-row"><span>Service</span><strong>{selectedBooking.serviceName}</strong></div>
          <div className="summary-row"><span>Client</span><strong>{selectedBooking.clientName}</strong></div>
          <div className="summary-row"><span>Date</span><strong>{selectedBooking.date}</strong></div>
          <div className="summary-row"><span>Time</span><strong>{selectedBooking.time}</strong></div>
          <div className="summary-divider" />
          <div className="summary-row total"><span>Earnings</span><strong>₹{selectedBooking.price}</strong></div>
        </aside>
      </div>
    </main>
  );
}
