import { useState, useEffect } from 'react';
import { ChevronLeft, Search, Users, CircleUserRound, Mail, Phone, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

export function ManageCustomers() {
  const { navigate } = useAppStore();
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching customers:', error);
      }
      setCustomers((data as Profile[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const visible = customers.filter((c) => `${c.full_name} ${c.email} ${c.phone ?? ''}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('adminDashboard')}><ChevronLeft size={17} /> Back to Overview</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Admin · User Management</span>
        <h1>Manage Customers</h1>
        <p>View and manage all registered customer accounts.</p>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card"><Users size={22} /><strong>{customers.length}</strong><span>Total Customers</span></div>
        <div className="stat-card"><CircleUserRound size={22} /><strong>{visible.length}</strong><span>Matching Search</span></div>
      </div>

      <div className="search-box" style={{ marginTop: 24 }}>
        <Search size={19} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, or phone..." />
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading customers…</h3></div>
      ) : visible.length === 0 ? (
        <div className="empty-state"><Search size={26} /><h3>No customers found</h3><p>Try a different search term.</p></div>
      ) : (
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Name</span><span>Email</span><span>Phone</span><span>Address</span><span>Joined</span>
          </div>
          {visible.map((c) => (
            <div className="admin-table-row" key={c.id}>
              <div className="admin-user-cell">
                <div className="worker-photo small"><span>{c.full_name.charAt(0).toUpperCase()}</span></div>
                <strong>{c.full_name}</strong>
              </div>
              <span><Mail size={13} /> {c.email}</span>
              <span><Phone size={13} /> {c.phone ?? '—'}</span>
              <span><MapPin size={13} /> {c.address ?? '—'}</span>
              <span>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
