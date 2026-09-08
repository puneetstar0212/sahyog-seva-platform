import { useState, useMemo, useEffect } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarDays, ChevronLeft, Clock3, MapPin, Search, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function GigFeed() {
  const { gigs, selectGig, navigate, fetchGigs, isGigsLoading, gigsError } = useAppStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'open'>('open');

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  const visible = useMemo(() => gigs.filter((g) => (filter === 'all' || g.status === 'open' || g.status === 'SEARCHING') && `${g.serviceName || g.title} ${g.description}`.toLowerCase().includes(query.toLowerCase())), [gigs, query, filter]);

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('workerDashboard')}><ChevronLeft size={17} /> Back to Dashboard</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Gig Feed</span>
        <h1>Available work near you</h1>
        <p>Browse and accept gigs that match your skills.</p>
        <div className="dashboard-search">
          <Search size={19} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search gigs..." />
          <button className={`filter-pill ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Open</button>
          <button className={`filter-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        </div>
      </div>

      {isGigsLoading ? (
        <div className="empty-state">
          <Loader2 size={26} className="animate-spin text-primary" />
          <h3>Loading gigs...</h3>
        </div>
      ) : gigsError ? (
        <div className="empty-state">
          <AlertCircle size={26} className="text-red-500" />
          <h3>Error loading gigs</h3>
          <p>{gigsError}</p>
          <button className="primary-button" onClick={fetchGigs} style={{ marginTop: 12 }}>Try Again</button>
        </div>
      ) : (
        <>
          <div className="gig-list">
        {visible.map((gig) => (
          <article className="gig-card" key={gig.id}>
            <div className="gig-card-info">
              <h3>{gig.serviceName || gig.title}</h3>
              <p>{gig.description}</p>
              <div className="worker-tags">
                <span><MapPin size={13} /> {gig.distance}</span>
                <span><CalendarDays size={13} /> {gig.date}</span>
                <span><Clock3 size={13} /> {gig.time}</span>
                <span><BriefcaseBusiness size={13} /> {gig.duration}</span>
              </div>
              <small className="gig-client">Client: {gig.clientName} · {gig.address}</small>
            </div>
            <div className="gig-card-right">
              <strong>₹{gig.price}</strong>
              <div className={`status-badge ${gig.status === 'open' || gig.status === 'SEARCHING' ? 'pending' : 'accepted'}`}>{gig.status}</div>
              <button className="primary-button" onClick={() => { selectGig(gig); navigate('gigDetail'); }}>
                {gig.status === 'open' || gig.status === 'SEARCHING' ? 'View & Accept' : 'View Details'} <ArrowRight size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && <div className="empty-state"><Search size={26} /><h3>No gigs found</h3><p>Try a different search or filter.</p></div>}
      </>
      )}
    </main>
  );
}
