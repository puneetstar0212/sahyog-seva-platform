import { useState, useMemo, useEffect } from 'react';
import { BadgeCheck, BriefcaseBusiness, ChevronLeft, Clock3, MapPin, Search, Star } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function Workers() {
  const { workers, selectWorker, navigate, fetchWorkers } = useAppStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetchWorkers();
  }, [fetchWorkers]);

  const filtered = useMemo(() => workers.filter((w) => `${w.name} ${w.role} ${w.skills.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query, workers]);

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('services')}><ChevronLeft size={17} /> Back to Services</button>
      <section className="dashboard-intro">
        <span className="eyebrow">Browse workers</span>
        <h1>Find the right worker</h1>
        <p>Search and book trusted, verified professionals in your community.</p>
        <div className="dashboard-search">
          <Search size={19} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or skill..." />
          <button className="primary-button">Search</button>
        </div>
      </section>

      <section className="workers-section">
        <div className="section-heading row">
          <div>
            <span className="section-kicker"><BadgeCheck size={17} /> Verified near you</span>
            <h2>Nearby verified workers ({filtered.length})</h2>
          </div>
        </div>
        <div className="worker-grid">
          {filtered.map((worker, index) => (
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
          ))}
        </div>
        {filtered.length === 0 && <div className="empty-state"><Search size={26} /><h3>No workers found</h3><p>Try searching for another skill.</p></div>}
      </section>
    </main>
  );
}
