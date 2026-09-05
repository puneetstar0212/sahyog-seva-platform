import { useState } from 'react';
import { ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ServiceIcon } from '@/components/shared/ServiceIcon';
import { heroImages } from '@/data/mockData';

export function Services() {
  const { services, selectService, navigate } = useAppStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Services');

  const categories = ['All Services', 'Electrical', 'Plumbing', 'Carpentry', 'Painting', 'Cleaning', 'Driving', 'Outdoor', 'Caregiving', 'Domestic'];
  const visible = services.filter((s) => (category === 'All Services' || s.category === category) && s.name.toLowerCase().includes(query.toLowerCase()));

  const openDetail = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) { selectService(service); navigate('serviceDetail'); }
  };

  return (
    <main className="container page-main">
      <section className="services-intro">
        <div>
          <span className="eyebrow">Trusted by communities across India</span>
          <h1>What service do you need?</h1>
          <p>Find trusted cooperative workers for your everyday needs.</p>
          <div className="verified-note"><ShieldCheck size={16} /> All workers are registered and verified through cooperative organizations.</div>
        </div>
        <div className="service-feature">
          <img src={heroImages[0]} alt="Expert carpenter at work" />
          <div><small>FEATURED SERVICE</small><strong>Expert Carpentry</strong></div>
        </div>
      </section>

      <div className="search-box">
        <Search size={19} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services by name" />
        <button className="primary-button">Search</button>
      </div>

      <div className="category-row">
        {categories.map((item) => <button className={category === item ? 'selected' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>

      <div className="service-grid">
        {visible.map((service) => (
          <article className="service-card" key={service.id}>
            <span className={`service-icon ${service.color}`}><ServiceIcon name={service.icon} size={24} /></span>
            <h3>{service.name}</h3>
            <p>{service.description}</p>
            <div className="service-price">Starting from ₹{service.basePrice}/{service.unit}</div>
            <div className="card-actions">
              <button className="outline-button" onClick={() => openDetail(service.id)}>View Details</button>
              <button className="primary-button" onClick={() => openDetail(service.id)}>Book Now <ArrowRight size={15} /></button>
            </div>
          </article>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="empty-state"><Search size={26} /><h3>No services found</h3><p>Try another service or clear your filters.</p></div>
      )}
    </main>
  );
}
