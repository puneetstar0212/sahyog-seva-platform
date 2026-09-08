import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, ChevronLeft, Clock3, MapPin, Phone, MessageCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function GigDetail() {
  const { selectedGig, navigate, acceptGig, updateBookingStatus, createBooking } = useAppStore();
  const [accepted, setAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  if (!selectedGig) { navigate('gigFeed'); return null; }

  const handleAccept = async () => {
    if (isAccepting) return;
    setIsAccepting(true);
    setAcceptError(null);
    try {
      await acceptGig(selectedGig.id);
      
      const session = useAppStore.getState().session;
      const workerId = session?.user?.id || 'w2';
      
      const bookingId = await createBooking({
        serviceId: selectedGig.serviceId || 'gig',
        serviceName: selectedGig.serviceName || selectedGig.title || 'Gig',
        gig_id: selectedGig.id,
        workerId: workerId,
        workerName: useAppStore.getState().profile?.full_name || 'Worker',
        workerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAClkBPhMbnqYSRWOSFN2NOc_VEGKH2EBE5OxYSzztUMRby_8mqW11lK7rNpGQBtBGqRprR_zbPys0SuXFVTSkNqhumPiJOaCoKNVF2-T1XN1IFzeS4_2GWxlhe8WkmBiVZVjlapqdBuDjss-JuZGltpLPqxQ5Ue9zNRFnRbJF2_t_gbOtVVjxDoZuWNdUeOD-GYV2An1NDYYg5ae8rMnkjv1aRErqfFIRPBWhaljWbuGJNFvXxQ5QWNw',
        clientId: selectedGig.consumer_id || selectedGig.clientId || 'c1',
        clientName: selectedGig.clientName || 'Client',
        clientImage: selectedGig.clientImage,
        date: selectedGig.date || new Date().toISOString().split('T')[0],
        time: selectedGig.time || '10:00 AM',
        address: selectedGig.address || 'User Address',
        price: selectedGig.price || selectedGig.budget || selectedGig.total_amount || 0,
      });
      
      if (bookingId) {
        await updateBookingStatus(bookingId, 'accepted');
      }
      setAccepted(true);
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : "Could not accept gig. It may have already been accepted or network error.");
      console.error(err);
    } finally {
      setIsAccepting(false);
    }
  };

  if (accepted) {
    return (
      <main className="container page-main">
        <div className="success-panel">
          <span className="success-icon"><Check size={28} /></span>
          <h2>Gig Accepted!</h2>
          <p>You have accepted this gig. Navigate to your active jobs to start the execution flow.</p>
          <button className="primary-button" onClick={() => navigate('executionMode')}>Go to Execution Mode <ArrowRight size={17} /></button>
          <button className="outline-button" onClick={() => navigate('workerDashboard')}>Back to Dashboard</button>
        </div>
      </main>
    );
  }

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('gigFeed')}><ChevronLeft size={17} /> Back to Gigs</button>
      <div className="gig-detail-card">
        <div className="gig-detail-head">
          <span className="eyebrow">{selectedGig.serviceName || selectedGig.title}</span>
          <h1>Job Details</h1>
          <div className={`status-badge ${selectedGig.status === 'SEARCHING' || selectedGig.status === 'open' ? 'pending' : 'accepted'}`}>{selectedGig.status}</div>
        </div>
        <div className="gig-detail-body">
          <div className="gig-detail-section">
            <h3>Description</h3>
            <p>{selectedGig.description}</p>
          </div>
          <div className="gig-detail-section">
            <h3>Client</h3>
            <div className="gig-detail-client">
              <div className="worker-photo small"><span>{selectedGig.clientImage}</span></div>
              <div><strong>{selectedGig.clientName}</strong></div>
              <button className="icon-button"><Phone size={18} /></button>
              <button className="icon-button"><MessageCircle size={18} /></button>
            </div>
          </div>
          <div className="gig-detail-section">
            <h3>Location & Schedule</h3>
            <div className="worker-tags">
              <span><MapPin size={13} /> {selectedGig.address}</span>
              <span><CalendarDays size={13} /> {selectedGig.date}</span>
              <span><Clock3 size={13} /> {selectedGig.time}</span>
              <span><BriefcaseBusiness size={13} /> {selectedGig.duration}</span>
            </div>
          </div>
          <div className="gig-detail-section">
            <h3>Payment</h3>
            <div className="gig-detail-price">
              <strong>₹{selectedGig.price}</strong>
              <small>Payment held in escrow, released after OTP verification</small>
            </div>
          </div>
        </div>
        {acceptError && (
          <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem' }}>
            ⚠ {acceptError}
          </div>
        )}
        <button className="primary-button large full" onClick={handleAccept} disabled={selectedGig.status !== 'open' && selectedGig.status !== 'SEARCHING' || isAccepting}>
          {isAccepting ? <><Loader2 size={17} className="spin" /> Accepting…</> : (selectedGig.status === 'open' || selectedGig.status === 'SEARCHING') ? <>Accept This Gig <ArrowRight size={17} /></> : 'Already Assigned'}
        </button>
      </div>
    </main>
  );
}
