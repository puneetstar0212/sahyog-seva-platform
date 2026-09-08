import { ArrowRight, BadgeCheck, BriefcaseBusiness, ChevronLeft, Clock3, MapPin, Star, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ServiceIcon } from '@/components/shared/ServiceIcon';

export function ServiceDetail() {
  const { selectedService, workers, selectWorker, navigate } = useAppStore();
  if (!selectedService) { navigate('services'); return null; }

  const serviceWorkers = workers.filter((w) => {
    const searchTerms = [
      selectedService.category.toLowerCase(),
      selectedService.name.toLowerCase(),
      ...selectedService.tags.map(t => t.toLowerCase())
    ];
    return w.skills.some((skill) => {
      const s = skill.toLowerCase();
      return searchTerms.some(term => term.includes(s) || s.includes(term));
    });
  });

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('services')}><ChevronLeft size={17} /> Back to Services</button>
      <section className="service-detail-hero">
        <span className={`service-icon ${selectedService.color} large-icon`}><ServiceIcon name={selectedService.icon} size={36} /></span>
        <div>
          <span className="eyebrow">{selectedService.category}</span>
          <h1>{selectedService.name}</h1>
          <p>{selectedService.description}</p>
          <div className="service-tags">{selectedService.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
        <div className="service-price-card">
          <small>Starting from</small>
          <strong>₹{selectedService.basePrice}</strong>
          <span>per {selectedService.unit}</span>
          <button className="primary-button full" onClick={() => navigate('workers')}>Book Now <ArrowRight size={17} /></button>
        </div>
      </section>

      <section className="workers-section">
        <div className="section-heading row">
          <div>
            <span className="section-kicker"><BadgeCheck size={17} /> Verified near you</span>
            <h2>Available workers ({serviceWorkers.length})</h2>
          </div>
          <button className="text-button" onClick={() => navigate('workers')}>View all <ArrowRight size={16} /></button>
        </div>
        <div className="worker-grid">
          {serviceWorkers.length > 0 ? serviceWorkers.map((worker, index) => (
            <article className="worker-card" key={worker.id}>
              {index === 0 && <span className="match-badge"><Star size={13} fill="currentColor" /> Top match for you</span>}
              <div className="worker-head">
                <div className="worker-photo">
                  <img src={worker.image} alt={worker.name} />
                  <span><BadgeCheck size={12} fill="currentColor" /></span>
                </div>
                <div><h3>{worker.name}</h3><p>{worker.role}</p></div>
                <div className="rating"><span><Star size={15} fill="currentColor" /> {worker.rating}</span><small>({worker.totalJobs})</small></div>
              </div>
              <div className="worker-tags">
                <span><BriefcaseBusiness size={13} /> {worker.experience}</span>
                <span><MapPin size={13} /> {worker.distance}</span>
                <span className={worker.availableToday ? 'available' : ''}><Clock3 size={13} /> {worker.availability}</span>
              </div>
              <button className={index === 0 ? 'primary-button full' : 'outline-button full'} onClick={() => { selectWorker(worker); navigate('workerProfile'); }}>
                {index === 0 ? 'Book Now' : 'View Profile'}
              </button>
            </article>
          )) : <div className="empty-state"><Users size={26} /><h3>No workers available</h3><p>Try browsing all workers instead.</p><button className="primary-button" onClick={() => navigate('workers')}>View all workers</button></div>}
        </div>
      </section>
    </main>
  );
}
