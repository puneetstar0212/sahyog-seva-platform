import { useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronLeft, Clock3, MapPin, Navigation, Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function ExecutionMode() {
  const { selectedBooking, navigate, updateBookingStatus } = useAppStore();
  const [otpRevealed, setOtpRevealed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!selectedBooking) { navigate('workerDashboard'); return null; }

  // Map backend status to UI state
  const status = selectedBooking.status;
  
  // Define valid states in order to compute progress dot
  const flowOrder = ['accepted', 'travelling', 'arrived', 'working', 'awaiting_otp', 'completed', 'released'];
  const currentIndex = flowOrder.indexOf(status) >= 0 ? flowOrder.indexOf(status) : 0;
  
  const steps = [
    { id: 'accepted', label: 'Travelling', icon: Navigation },
    { id: 'travelling', label: 'Arrived', icon: MapPin },
    { id: 'arrived', label: 'Working', icon: Clock3 },
    { id: 'working', label: 'Awaiting OTP', icon: ShieldCheck },
    { id: 'awaiting_otp', label: 'Completed', icon: Check }
  ];

  // Which step circle are we currently on?
  // accepted -> 0, travelling -> 1, arrived -> 2, working -> 3, awaiting_otp -> 4, completed/released -> 5
  const circleIndex = Math.min(currentIndex, steps.length);

  const advance = async (nextStatus: typeof selectedBooking.status) => {
    if (isUpdating) return;
    setIsUpdating(true);
    setActionError(null);
    try {
      await updateBookingStatus(selectedBooking.id, nextStatus);
    } catch (err) {
      console.error("Failed to update status", err);
      setActionError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setIsUpdating(false);
    }
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
              <div key={step.id} className={`execution-step ${index <= circleIndex ? 'active' : ''} ${index === circleIndex ? 'current' : ''}`}>
                <span className="step-dot">{index < circleIndex ? <Check size={14} /> : index + 1}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          {actionError && (
            <div style={{ margin: '0 1rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.9rem' }}>
              ⚠ {actionError}
            </div>
          )}

          {status === 'accepted' && (
            <div className="execution-action-box">
              <Navigation size={28} />
              <h3>Navigate to client location</h3>
              <p>Use the map to navigate to the client's address. Tap "I'm Travelling" when you start your journey.</p>
              <button className="primary-button large" onClick={() => advance('travelling')} disabled={isUpdating}>
                {isUpdating ? <Loader2 size={17} className="spin" /> : "I'm Travelling"} <ArrowRight size={17} />
              </button>
            </div>
          )}
          {status === 'travelling' && (
            <div className="execution-action-box">
              <MapPin size={28} />
              <h3>You are travelling</h3>
              <p>Navigate to the client's address. Tap "I've Arrived" when you reach the location.</p>
              <button className="primary-button large" onClick={() => advance('arrived')} disabled={isUpdating}>
                {isUpdating ? <Loader2 size={17} className="spin" /> : "I've Arrived"} <ArrowRight size={17} />
              </button>
            </div>
          )}
          {status === 'arrived' && (
            <div className="execution-action-box">
              <Clock3 size={28} />
              <h3>You've arrived at the location</h3>
              <p>Confirm with the client and start the service work.</p>
              <button className="primary-button large" onClick={() => advance('working')} disabled={isUpdating}>
                {isUpdating ? <Loader2 size={17} className="spin" /> : "Start Working"} <ArrowRight size={17} />
              </button>
            </div>
          )}
          {status === 'working' && (
            <div className="execution-action-box">
              <Clock3 size={28} />
              <h3>Work in progress</h3>
              <p>Complete the service. Once done, generate an OTP for the client to release payment.</p>
              <button className="primary-button large" onClick={() => advance('awaiting_otp')} disabled={isUpdating}>
                {isUpdating ? <Loader2 size={17} className="spin" /> : "Mark Complete & Generate OTP"} <ArrowRight size={17} />
              </button>
            </div>
          )}
          {status === 'awaiting_otp' && (
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
              <button className="outline-button" onClick={() => advance('completed')} disabled={isUpdating}>
                {isUpdating ? <Loader2 size={17} className="spin" /> : "Simulate Client Verification"} <ArrowRight size={17} />
              </button>
            </div>
          )}
          {status === 'completed' && (
            <div className="execution-action-box">
              <span className="success-icon"><Check size={28} /></span>
              <h3>Job Completed!</h3>
              <p>Click below to finalize and release the funds.</p>
              <button className="primary-button" onClick={() => advance('released')} disabled={isUpdating}>
                {isUpdating ? <Loader2 size={17} className="spin" /> : "Release Payment"} <ArrowRight size={17} />
              </button>
            </div>
          )}
          {status === 'released' && (
            <div className="execution-action-box">
              <span className="success-icon"><Check size={28} /></span>
              <h3>Payment Released!</h3>
              <p>Payment of ₹{selectedBooking.price} has been released to your account. Great work!</p>
              <button className="primary-button" onClick={() => navigate('earnings')}>View Earnings <ArrowRight size={17} /></button>
              <button className="outline-button" onClick={() => navigate('workerDashboard')}>Back to Dashboard</button>
            </div>
          )}
        </div>

        <aside className="checkout-summary">
          <h3>Job Summary</h3>
          <div className="summary-row"><span>Booking ID</span><strong>#{selectedBooking.id.toUpperCase().slice(0, 8)}</strong></div>
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
