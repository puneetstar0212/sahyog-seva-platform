import { Leaf } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Portal } from '@/types';

export function Logo({ compact = false }: { compact?: boolean }) {
  const setPortal = useAppStore((s) => s.setPortal);
  return (
    <button className="brand" onClick={() => setPortal('client')} aria-label="Sahyog Seva home">
      <span className="brand-mark"><Leaf size={22} fill="currentColor" /></span>
      {!compact && <span><strong>Sahyog Seva</strong><small>सेवा भी, सहयोग से विकास भी।</small></span>}
    </button>
  );
}
