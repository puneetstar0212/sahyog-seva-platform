import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, ChevronLeft, Clock3, MapPin, Phone, MessageCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function GigDetail() {
  const { selectedGig, navigate, acceptGig, updateBookingStatus, createBooking } = useAppStore();
  const [accepted, setAccepted] = useState(false);

  if (!selectedGig) { navigate('gigFeed'); return null; }

  const handleAccept = () => {
    acceptGig(selectedGig.id, 'w2');
    const bookingId = createBooking({
      serviceId: selectedGig.serviceId,
      serviceName: selectedGig.serviceName,
      workerId: 'w2',
      workerName: 'Rajesh Kumar',
      workerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAClkBPhMbnqYSRWOSFN2NOc_VEGKH2EBE5OxYSzztUMRby_8mqW11lK7rNpGQBtBGqRprR_zbPys0SuXFVTSkNqhumPiJOaCoKNVF2-T1XN1IFzeS4_2GWxlhe8WkmBiVZVjlapqdBuDjss-JuZGltpLPqxQ5Ue9zNRFnRbJF2_t_gbOtVVjxDoZuWNdUeOD-GYV2An1NDYYg5ae8rMnkjv1aRErqfFIRPBWhaljWbuGJNFvXxQ5QWNw',
      clientId: selectedGig.clientId,
      clientName: selectedGig.clientName,
      clientImage: selectedGig.clientImage,
      date: selectedGig.date,
      time: selectedGig.time,
      address: selectedGig.address,
      price: selectedGig.price,
    });
    updateBookingStatus(bookingId, 'accepted');
    setAccepted(true);
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
          <span className="eyebrow">{selectedGig.serviceName}</span>
          <h1>Job Details</h1>
          <div className={`status-badge ${selectedGig.status === 'open' ? 'pending' : 'accepted'}`}>{selectedGig.status}</div>
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
        <button className="primary-button large full" onClick={handleAccept} disabled={selectedGig.status !== 'open'}>
          {selectedGig.status === 'open' ? 'Accept This Gig' : 'Already Assigned'} <ArrowRight size={17} />
        </button>
      </div>
    </main>
  );
}
