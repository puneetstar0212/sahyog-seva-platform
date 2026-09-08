import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { Auth } from '@/components/auth/Auth';
import { AdminLogin } from '@/components/auth/AdminLogin';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { MobileNav } from '@/components/shared/MobileNav';

import { Home } from '@/components/client/Home';
import { Services } from '@/components/client/Services';
import { ServiceDetail } from '@/components/client/ServiceDetail';
import { Workers } from '@/components/client/Workers';
import { WorkerProfile } from '@/components/client/WorkerProfile';
import { Checkout } from '@/components/client/Checkout';
import { Payment } from '@/components/client/Payment';
import { Tracking } from '@/components/client/Tracking';
import { Chat } from '@/components/client/Chat';
import { Review } from '@/components/client/Review';
import { Bookings } from '@/components/client/Bookings';
import { Dashboard } from '@/components/client/Dashboard';

import { WorkerOnboarding } from '@/components/worker/WorkerOnboarding';
import { WorkerDashboard } from '@/components/worker/WorkerDashboard';
import { GigFeed } from '@/components/worker/GigFeed';
import { GigDetail } from '@/components/worker/GigDetail';
import { ExecutionMode } from '@/components/worker/ExecutionMode';
import { Earnings } from '@/components/worker/Earnings';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { SocietyManager } from '@/components/admin/SocietyManager';
import { DividendLedger } from '@/components/admin/DividendLedger';
import { DemandHeatmap } from '@/components/admin/DemandHeatmap';
import { ManageCustomers } from '@/components/admin/ManageCustomers';
import { ManageWorkers } from '@/components/admin/ManageWorkers';

function App() {
  const { portal, screen, session, profile, setSession, setProfile, setWorkerProfile, setAuthLoading } = useAppStore();

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setSession({ user: { id: data.session.user.id, email: data.session.user.email ?? '' } });
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
        if (profile) {
          setProfile(profile as never);
          if (profile.role === 'worker') {
            const { data: workerProfile } = await supabase.from('worker_profiles').select('*').eq('user_id', data.session.user.id).maybeSingle();
            setWorkerProfile(workerProfile as never);
          }
        }
      }
      setAuthLoading(false);
    };
    void loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') setSession(null);
      if (session) setSession({ user: { id: session.user.id, email: session.user.email ?? '' } });
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [setAuthLoading, setProfile, setSession, setWorkerProfile]);

  const renderScreen = () => {
    if (screen === 'login' || screen === 'register') return <Auth />;

    if (portal === 'client') {
      switch (screen) {
        case 'home': return <Home />;
        case 'services': return <Services />;
        case 'serviceDetail': return <ServiceDetail />;
        case 'workers': return <Workers />;
        case 'workerProfile': return <WorkerProfile />;
        case 'checkout': return <Checkout />;
        case 'payment': return <Payment />;
        case 'tracking': return <Tracking />;
        case 'chat': return <Chat />;
        case 'review': return <Review />;
        case 'bookings': return <Bookings />;
        case 'dashboard': return <Dashboard />;
        default: return <Home />;
      }
    }
    if (portal === 'worker') {
      switch (screen) {
        case 'workerOnboarding': return <WorkerOnboarding />;
        case 'workerDashboard': return <WorkerDashboard />;
        case 'gigFeed': return <GigFeed />;
        case 'gigDetail': return <GigDetail />;
        case 'executionMode': return <ExecutionMode />;
        case 'earnings': return <Earnings />;
        default: return <WorkerDashboard />;
      }
    }
    if (portal === 'admin') {
      if (!session) {
        return <AdminLogin />;
      }
      if (profile?.role !== 'admin') {
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-red-600 text-3xl font-bold">!</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Access Denied</h2>
            <p className="text-gray-600 mb-6 max-w-md">You do not have administrator privileges to view this area.</p>
            <button 
              className="px-6 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 transition-colors" 
              onClick={() => useAppStore.getState().setPortal('client')}
            >
              Return to Main App
            </button>
          </div>
        );
      }

      switch (screen) {
        case 'adminDashboard': return <AdminDashboard />;
        case 'societyManager': return <SocietyManager />;
        case 'dividendLedger': return <DividendLedger />;
        case 'demandHeatmap': return <DemandHeatmap />;
        case 'manageCustomers': return <ManageCustomers />;
        case 'manageWorkers': return <ManageWorkers />;
        default: return <AdminDashboard />;
      }
    }
    return <Home />;
  };

  return (
    <div className="app-shell">
      <Header />
      {renderScreen()}
      <Footer />
      <MobileNav />
    </div>
  );
}

export default App;
