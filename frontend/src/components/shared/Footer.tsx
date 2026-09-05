import { Leaf } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Portal } from '@/types';

export function Footer() {
  const { navigate, setPortal } = useAppStore();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="brand">
          <span className="brand-mark"><Leaf size={22} fill="currentColor" /></span>
          <span><strong>Sahyog Seva</strong><small>सेवा भी, सहयोग से विकास भी।</small></span>
        </div>
        <div className="footer-links">
          <button onClick={() => { setPortal('client'); navigate('home'); }}>About</button>
          <button onClick={() => { setPortal('client'); navigate('services'); }}>Services</button>
          <button onClick={() => setPortal('worker')}>For Workers</button>
          <button onClick={() => setPortal('admin')}>Admin Portal</button>
          <button>Privacy</button>
          <button>Contact</button>
        </div>
        <span>© 2024 Sahyog Seva Cooperative</span>
      </div>
    </footer>
  );
}
