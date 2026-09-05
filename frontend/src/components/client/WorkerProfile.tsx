import { ArrowRight, BadgeCheck, BriefcaseBusiness, ChevronLeft, Clock3, MapPin, Star, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function WorkerProfile() {
  const { selectedWorker, navigate, selectService, services } = useAppStore();
  if (!selectedWorker) { navigate('workers'); return null; }

  const handleBook = () => {
    const matchingService = services.find((s) => selectedWorker.skills.some((skill) => s.tags.includes(skill) || s.category.includes(skill)));
    if (matchingService) { selectService(matchingService); navigate('checkout'); }
    else navigate('services');
  };

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('workers')}><ChevronLeft size={17} /> Back to Workers</button>
      <section className="worker-profile-section">
        <div className="worker-profile-card">
          <div className="worker-profile-head">
            <div className="worker-photo large">
              <img src={selectedWorker.image} alt={selectedWorker.name} />
              <span><BadgeCheck size={16} fill="currentColor" /></span>
            </div>
            <div className="worker-profile-info">
              <h1>{selectedWorker.name}</h1>
              <p>{selectedWorker.role}</p>
              <div className="worker-profile-stats">
                <span><Star size={16} fill="currentColor" /> {selectedWorker.rating} rating</span>
                <span><BriefcaseBusiness size={16} /> {selectedWorker.totalJobs} jobs</span>
                <span><Clock3 size={16} /> {selectedWorker.experience}</span>
                <span><MapPin size={16} /> {selectedWorker.distance}</span>
              </div>
              <div className="worker-tags">
                <span className={selectedWorker.availableToday ? 'available' : ''}><Clock3 size={13} /> {selectedWorker.availability}</span>
                <span><Users size={13} /> {selectedWorker.society}</span>
              </div>
            </div>
            <div className="worker-profile-price">
              <small>Hourly rate</small>
              <strong>₹{selectedWorker.pricePerHour}</strong>
              <button className="primary-button full" onClick={handleBook}>Book Now <ArrowRight size={17} /></button>
            </div>
          </div>
          <div className="worker-profile-body">
            <div>
              <h3>About</h3>
              <p>{selectedWorker.bio}</p>
            </div>
            <div>
              <h3>Skills</h3>
              <div className="skill-tags">{selectedWorker.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
