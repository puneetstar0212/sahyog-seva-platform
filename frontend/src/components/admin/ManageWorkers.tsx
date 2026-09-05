import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Clock3, Mail, MapPin, Phone, Search, ShieldAlert, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import type { Profile, WorkerProfile } from '@/lib/supabase';

type WorkerRow = WorkerProfile & { profile: Profile };

export function ManageWorkers() {
  const { navigate, setAuthError } = useAppStore();
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadWorkers = async () => {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select('*, profile:profiles!worker_profiles_user_id_fkey(*)')
      .order('created_at', { ascending: false });
    if (error) {
      setAuthError('Could not load worker registrations.');
      setWorkers([]);
    } else {
      setWorkers((data as unknown as WorkerRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void loadWorkers(); }, []);

  const setApproval = async (worker: WorkerRow, status: 'approved' | 'rejected') => {
    setWorkingId(worker.user_id);
    setAuthError(null);
    const { error } = await supabase.rpc('approve_worker', {
      p_worker_id: worker.user_id,
      p_status: status,
      p_notes: status === 'approved' ? null : 'Application requires additional review.',
    });
    if (error) setAuthError('Could not update this worker. Admin access is required.');
    else await loadWorkers();
    setWorkingId(null);
  };

  const visible = workers.filter((worker) => {
    const matchesFilter = filter === 'all' || worker.approval_status === filter;
    const profile = worker.profile;
    const haystack = `${profile?.full_name ?? ''} ${profile?.email ?? ''} ${worker.skills.join(' ')}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  });

  const pendingCount = workers.filter((worker) => worker.approval_status === 'pending').length;
  const approvedCount = workers.filter((worker) => worker.approval_status === 'approved').length;

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('adminDashboard')}><ChevronLeft size={17} /> Back to Overview</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Admin · Verification Desk</span>
        <h1>Manage Workers</h1>
        <p>Review registrations, verify skills, and approve workers before they receive gigs.</p>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card"><ShieldAlert size={22} /><strong>{workers.length}</strong><span>Total Workers</span></div>
        <div className="stat-card"><Clock3 size={22} /><strong>{pendingCount}</strong><span>Pending Approval</span></div>
        <div className="stat-card"><Check size={22} /><strong>{approvedCount}</strong><span>Active Workers</span></div>
      </div>

      <div className="search-box admin-search">
        <Search size={19} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, or skill..." />
      </div>
      <div className="category-row admin-filter-row">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((value) => (
          <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All Workers' : value}</button>
        ))}
      </div>

      {loading ? <div className="empty-state"><h3>Loading worker registrations…</h3></div> : visible.length === 0 ? (
        <div className="empty-state"><Search size={26} /><h3>No workers found</h3><p>Try a different filter or search term.</p></div>
      ) : (
        <div className="admin-table worker-admin-table">
          <div className="admin-table-head"><span>Worker</span><span>Contact</span><span>Skills</span><span>Experience</span><span>Status</span><span>Actions</span></div>
          {visible.map((worker) => {
            const profile = worker.profile;
            return (
              <div className="admin-table-row" key={worker.id}>
                <div className="admin-user-cell">
                  <div className="worker-photo small"><span>{profile?.full_name?.charAt(0).toUpperCase() ?? '?'}</span></div>
                  <div><strong>{profile?.full_name ?? 'Unknown worker'}</strong><small>{profile?.address ?? 'Address not provided'}</small></div>
                </div>
                <div className="admin-contact-cell"><span><Mail size={13} /> {profile?.email ?? '—'}</span><span><Phone size={13} /> {profile?.phone ?? '—'}</span></div>
                <div className="admin-skill-cell">{worker.skills.length ? worker.skills.join(', ') : 'Not provided'}</div>
                <span>{worker.experience_years} years · ₹{worker.hourly_rate}/hr</span>
                <div className={`status-badge ${worker.approval_status === 'approved' ? 'released' : worker.approval_status === 'pending' ? 'pending' : 'cancelled'}`}>
                  {worker.approval_status === 'approved' && <Check size={12} />}{worker.approval_status === 'pending' && <Clock3 size={12} />}{worker.approval_status === 'rejected' && <X size={12} />}{worker.approval_status}
                </div>
                <div className="admin-action-buttons">
                  {worker.approval_status !== 'approved' && <button className="primary-button compact" disabled={workingId === worker.user_id} onClick={() => void setApproval(worker, 'approved')}><Check size={14} /> Approve</button>}
                  {worker.approval_status !== 'rejected' && <button className="outline-button compact danger" disabled={workingId === worker.user_id} onClick={() => void setApproval(worker, 'rejected')}><X size={14} /> Reject</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
