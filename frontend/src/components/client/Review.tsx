import { useState } from 'react';
import { ArrowRight, ChevronLeft, Star } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function Review() {
  const { selectedBooking, reviewRating, reviewText, setReviewRating, setReviewText, submitReview, navigate } = useAppStore();
  const [submitted, setSubmitted] = useState(false);

  if (!selectedBooking) { navigate('bookings'); return null; }

  const handleSubmit = () => {
    submitReview(selectedBooking.id);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="container page-main">
        <div className="success-panel">
          <span className="success-icon"><Star size={28} fill="currentColor" /></span>
          <h2>Thank you for your review!</h2>
          <p>Your feedback helps build trust in the Sahyog Seva community and helps workers grow.</p>
          <button className="primary-button" onClick={() => navigate('bookings')}>Back to My Bookings <ArrowRight size={17} /></button>
        </div>
      </main>
    );
  }

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('tracking')}><ChevronLeft size={17} /> Back</button>
      <div className="review-container">
        <h1>Rate your experience</h1>
        <div className="review-worker-card">
          <div className="worker-photo small"><img src={selectedBooking.workerImage} alt={selectedBooking.workerName} /></div>
          <div><h3>{selectedBooking.workerName}</h3><p>{selectedBooking.serviceName} · {selectedBooking.date}</p></div>
        </div>
        <div className="review-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setReviewRating(star)} className={star <= reviewRating ? 'active' : ''}>
              <Star size={36} fill={star <= reviewRating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
        <textarea
          className="review-textarea"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience... How was the service? Was the worker professional?"
          rows={5}
        />
        <button className="primary-button large" onClick={handleSubmit} disabled={reviewRating === 0}>
          Submit Review <ArrowRight size={17} />
        </button>
      </div>
    </main>
  );
}
