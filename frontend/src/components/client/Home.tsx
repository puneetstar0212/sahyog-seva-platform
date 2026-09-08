import { useState, useEffect } from 'react';
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, HandHeart, House, ShieldCheck, Sparkles, Users, Wrench } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { heroImages } from '@/data/mockData';
import { ServiceIcon } from '@/components/shared/ServiceIcon';

export function Home() {
  const { navigate, services, fetchGigs, fetchWorkers } = useAppStore();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    void fetchGigs();
    void fetchWorkers();
  }, [fetchGigs, fetchWorkers]);

  return (
    <>
      <section className="hero">
        <div className="hero-shape hero-shape-one" />
        <div className="hero-shape hero-shape-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">People · Skills · Opportunities · Stronger Communities</span>
            <h1>तकनीक के साथ सहकार,<br /><em>हुनर के साथ रोजगार।</em></h1>
            <p>हम जोड़ते हैं कुशल सहकारी श्रमिकों को आपके घरों और समुदायों की जरूरतों से — उचित मेहनताना, भरोसेमंद सेवाएं और एक बेहतर समाज के लिए।</p>
            <div className="hero-actions">
              <button className="primary-button large" onClick={() => navigate('services')}>Find a Service <ArrowRight size={18} /></button>
              <button className="text-button" onClick={() => { useAppStore.getState().setAuthMode('register'); navigate('register'); }}>Join as a Worker <ArrowRight size={17} /></button>
            </div>
            <div className="trust-points">
              <span><i className="trust-icon peach"><BadgeCheck size={19} /></i>Verified<br />Workers</span>
              <span><i className="trust-icon gold"><span>₹</span></i>Fair Wages</span>
              <span><i className="trust-icon stone"><Users size={19} /></i>Community<br />Driven</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="blob" />
            <div className="image-frame">
              <img src={heroImages[slide]} alt="Sahyog Seva community worker" />
              <button className="slider-arrow left" onClick={() => setSlide((slide + heroImages.length - 1) % heroImages.length)} aria-label="Previous image"><ChevronLeft size={20} /></button>
              <button className="slider-arrow right" onClick={() => setSlide((slide + 1) % heroImages.length)} aria-label="Next image"><ChevronRight size={20} /></button>
              <div className="dots">{heroImages.map((_, index) => <button key={index} className={index === slide ? 'selected' : ''} onClick={() => setSlide(index)} aria-label={`Show image ${index + 1}`} />)}</div>
            </div>
            <div className="floating-card top-card"><strong>Local People<br />Stronger Communities</strong><span>♥</span></div>
            <div className="floating-card bottom-card"><span className="mini-icon"><House size={18} /></span><strong>Your Trust<br />Our Strength</strong></div>
          </div>
        </div>
      </section>

      <section className="container access-section">
        <div className="section-heading centered">
          <span className="section-kicker"><Sparkles size={18} /> Easy access</span>
          <h2>Choose your journey</h2>
          <p>Whether you need a helping hand or want to offer your skills, we are here for you.</p>
        </div>
        <div className="access-grid">
          <div className="access-card">
            <span className="access-illustration customer"><House size={72} strokeWidth={1.2} /></span>
            <h3>Find a Service</h3>
            <p>Browse and book verified workers for your home and community needs.</p>
            <button className="primary-button full" onClick={() => navigate('services')}>Browse Services <ArrowRight size={17} /></button>
          </div>
          <div className="access-card worker-card">
            <span className="access-illustration worker"><Wrench size={72} strokeWidth={1.2} /></span>
            <h3>Join as a Worker</h3>
            <p>Register, get verified, and start receiving gigs from your community.</p>
            <button className="secondary-button full" onClick={() => { useAppStore.getState().setPortal('worker'); useAppStore.getState().navigate('workerOnboarding'); }}>Worker Registration <ArrowRight size={17} /></button>
          </div>
        </div>
      </section>

      <section className="container popular">
        <div className="section-heading">
          <span className="section-kicker"><Sparkles size={18} /> Explore</span>
          <h2>Popular services</h2>
        </div>
        <div className="popular-grid">
          {services.slice(0, 6).map((service) => (
            <button key={service.id} className="popular-item" onClick={() => { useAppStore.getState().selectService(service); navigate('serviceDetail'); }}>
              <span className={`service-icon ${service.color}`}><ServiceIcon name={service.icon} size={27} /></span>
              <strong>{service.name.replace(' Services', '')}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="stats">
        <div className="container stats-grid">
          <div><Users size={30} /><strong>10K+</strong><span>Skilled Workers</span></div>
          <div><House size={30} /><strong>5K+</strong><span>Happy Households</span></div>
          <div><HandHeart size={30} /><strong>100+</strong><span>Cooperative Societies</span></div>
          <div className="verified-stat"><ShieldCheck size={30} /><strong>Verified & Safe</strong><span>Trusted Services</span></div>
        </div>
      </section>
    </>
  );
}
