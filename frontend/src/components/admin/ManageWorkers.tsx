import { useEffect, useState, useCallback } from 'react';
import { Check, ChevronLeft, Clock3, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

// Complete WorkerRow type — includes all fields used in JSX
type WorkerRow = {
  id: string;          // = worker_profiles.user_id
  name: string;        // from profiles.full_name
  email?: string;      // from profiles.email
  phone: string;       // from profiles.phone
  location: string;    // from profiles.address
  skill: string;       // joined from worker_profiles.skills[]
  experience: number;  // from worker_profiles.experience_years
  hourly_rate: number; // from worker_profiles.hourly_rate
  working_hours?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export function ManageWorkers() {
  const { navigate, setAuthError, profile } = useAppStore();
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadWorkers = useCallback(async () => {
    // Always reset to loading state so refresh shows spinner
    setLoading(true);
    setErrorMsg(null);

    // ── Strategy: Two-step fetch to avoid PostgREST FK resolution ambiguity ──
    // 1. Fetch all worker_profiles rows (admin can see all via RLS policy)
    // 2. Fetch matching profiles rows by user_id IN (...) 
    // This avoids the `profiles!inner(...)` join syntax which can fail if
    // Supabase cannot auto-detect the FK relationship name at query time.

    const { data: workerData, error: workerError } = await supabase
      .from('worker_profiles')
      .select('user_id, skills, hourly_rate, experience_years, working_hours, approval_status, created_at')
      .order('created_at', { ascending: false });

    if (workerError) {
      // Log the full Supabase error for debugging — this is the REAL error,
      // not a misleading "no workers found" message.
      console.error('ManageWorkers — worker_profiles fetch error:', {
        message: workerError.message,
        code: workerError.code,
        details: workerError.details,
        hint: workerError.hint,
      });
      setErrorMsg(
        `Unable to load workers. ${workerError.message}` +
        (workerError.hint ? ` Hint: ${workerError.hint}` : '') +
        (workerError.code ? ` (Code: ${workerError.code})` : '') +
        ` — Check that you are logged in as an admin and that RLS policies are applied.`
      );
      setWorkers([]);
      setLoading(false);
      return;
    }

    if (!workerData || workerData.length === 0) {
      // There are genuinely no worker profiles in the database yet.
      setWorkers([]);
      setLoading(false);
      return;
    }

    // Collect all user_ids to fetch matching profiles
    const userIds = workerData.map((w) => w.user_id).filter(Boolean);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, address')
      .in('id', userIds);

    if (profileError) {
      console.error('ManageWorkers — profiles fetch error:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
      });
      // We still have worker data — show workers with partial info rather than failing completely
      console.warn('Profile data unavailable — showing workers without contact details');
    }

    // Build a quick lookup map: user_id → profile
    const profileMap = new Map<string, { full_name: string; email: string; phone: string; address: string }>();
    for (const p of (profileData || [])) {
      profileMap.set(p.id, p);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: WorkerRow[] = workerData.map((row: any) => {
      const prof = profileMap.get(row.user_id);
      return {
        id: row.user_id,
        name: prof?.full_name || 'Unknown',
        email: prof?.email || '',
        phone: prof?.phone || '—',
        location: prof?.address || '—',
        skill: Array.isArray(row.skills) ? row.skills.join(', ') : (row.skills || ''),
        experience: Number(row.experience_years) || 0,
        hourly_rate: Number(row.hourly_rate) || 0,
        working_hours: row.working_hours || '',
        approval_status: row.approval_status || 'pending',
        created_at: row.created_at,
      };
    });

    setWorkers(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { void loadWorkers(); }, [loadWorkers]);

  const updateStatus = async (worker: WorkerRow, status: 'approved' | 'rejected') => {
    setWorkingId(worker.id);
    setAuthError(null);

    const { error } = await supabase.rpc('approve_worker', {
      p_worker_id: worker.id,
      p_status: status,
    });

    if (error) {
      console.error('approve_worker RPC error:', error);
      setAuthError(`Failed to update status: ${error.message || 'Admin access required.'}`);
    } else {
      // Refresh the worker list after successful status change
      await loadWorkers();
    }

    setWorkingId(null);
  };

  const visible = workers.filter((worker) => {
    const matchesFilter = filter === 'all' || worker.approval_status === filter;
    const name = worker.name ?? '';
    const skill = worker.skill ?? '';
    const q = query.toLowerCase();
    return matchesFilter && (name.toLowerCase().includes(q) || skill.toLowerCase().includes(q));
  });

  const pendingCount = workers.filter((w) => w.approval_status === 'pending').length;
  const approvedCount = workers.filter((w) => w.approval_status === 'approved').length;
  const rejectedCount = workers.filter((w) => w.approval_status === 'rejected').length;

  const isAdmin = profile?.role === 'admin';

  return (
    <main className="container page-main p-6 max-w-7xl mx-auto font-sans">
      <div className="flex items-center justify-between mb-6">
        <button className="text-emerald-600 flex items-center hover:underline font-medium" onClick={() => navigate('adminDashboard')}>
          <ChevronLeft size={17} className="mr-1" /> Back to Dashboard
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          onClick={() => void loadWorkers()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="mb-8">
        <span className="text-emerald-600 font-medium text-sm tracking-wide uppercase">Admin · Verification Desk</span>
        <h1 className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">Manage Workers</h1>
        <p className="text-gray-500 mt-1">Review registrations, view balances, and manage worker status.</p>
      </div>

      {!isAdmin && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800">
          <ShieldAlert className="shrink-0 mt-0.5 text-amber-600" size={20} />
          <div>
            <h4 className="font-semibold">Restricted View</h4>
            <p className="text-sm mt-1">
              You are logged in as <strong>{profile?.role || 'unknown'}</strong>. Only admins can approve or reject workers, and only admins can see all worker profiles including pending ones.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center text-gray-500 mb-2 font-medium"><ShieldAlert size={20} className="mr-2 text-gray-400" /> Total Workers</div>
          <strong className="text-4xl font-bold text-gray-900">{workers.length}</strong>
        </div>
        <div className="bg-white p-6 rounded-xl border border-amber-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock3 size={64} className="text-amber-500" /></div>
          <div className="flex items-center text-amber-700 mb-2 font-medium"><Clock3 size={20} className="mr-2" /> Pending</div>
          <strong className="text-4xl font-bold text-gray-900 z-10">{pendingCount}</strong>
        </div>
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Check size={64} className="text-emerald-500" /></div>
          <div className="flex items-center text-emerald-600 mb-2 font-medium"><Check size={20} className="mr-2" /> Approved</div>
          <strong className="text-4xl font-bold text-gray-900 z-10">{approvedCount}</strong>
        </div>
        <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><X size={64} className="text-red-500" /></div>
          <div className="flex items-center text-red-600 mb-2 font-medium"><X size={20} className="mr-2" /> Rejected</div>
          <strong className="text-4xl font-bold text-gray-900 z-10">{rejectedCount}</strong>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or skill..."
          />
        </div>
        <div className="flex bg-gray-100/80 p-1 rounded-lg w-fit border border-gray-200">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((value) => (
            <button
              key={value}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-200 ${
                filter === value
                  ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-900/5'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
              }`}
              onClick={() => setFilter(value)}
            >
              {value}
              {value !== 'all' && (
                <span className="ml-1.5 text-xs font-semibold text-gray-400">
                  ({value === 'pending' ? pendingCount : value === 'approved' ? approvedCount : rejectedCount})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-emerald-600 bg-white rounded-xl border border-gray-200 shadow-sm">
          <svg className="animate-spin h-8 w-8 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-medium animate-pulse">Loading worker registrations...</p>
        </div>
      ) : errorMsg ? (
        <div className="py-16 text-center bg-red-50 rounded-xl border border-red-200 shadow-sm flex flex-col items-center justify-center px-6">
          <ShieldAlert size={32} className="text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-1">Unable to load workers</h3>
          <p className="text-red-600 text-sm mb-4 max-w-lg">{errorMsg}</p>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            onClick={() => void loadWorkers()}
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
          <div className="bg-gray-50 p-4 rounded-full mb-4">
            <Search size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {workers.length === 0 ? 'No workers registered yet' : 'No workers match your filters'}
          </h3>
          <p className="text-gray-500 text-sm">
            {workers.length === 0
              ? 'Workers will appear here once they register on the platform.'
              : 'Try adjusting your filters or search term.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Worker Name</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Skills</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Hourly Rate</th>
                  <th className="px-6 py-4">Working Hours</th>
                  <th className="px-6 py-4">Status</th>
                  {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {visible.map((worker) => {
                  const name = worker.name || 'Unknown';
                  const isWorking = workingId === worker.id;
                  return (
                    <tr key={worker.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mr-3">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{name}</div>
                            {worker.email && (
                              <div className="text-xs text-gray-400">{worker.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-sm">
                          <span className="text-gray-900">{worker.phone}</span>
                          <span className="text-gray-500 text-xs truncate max-w-[150px]">{worker.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{worker.skill || 'None listed'}</td>
                      <td className="px-6 py-4 text-gray-600">{worker.experience} yrs</td>
                      <td className="px-6 py-4 font-mono text-gray-500">
                        &#8377;{Number(worker.hourly_rate ?? 0).toFixed(2)}/hr
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{worker.working_hours || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
                          worker.approval_status === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : worker.approval_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {worker.approval_status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-end">
                            <button
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                worker.approval_status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                              onClick={() => updateStatus(worker, 'approved')}
                              disabled={worker.approval_status === 'approved' || isWorking}
                            >
                              <Check size={16} /> {worker.approval_status === 'approved' ? 'Approved' : isWorking ? '...' : 'Approve'}
                            </button>
                            <button
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                worker.approval_status === 'rejected'
                                  ? 'bg-red-100 text-red-700 cursor-default'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                              onClick={() => updateStatus(worker, 'rejected')}
                              disabled={worker.approval_status === 'rejected' || isWorking}
                            >
                              <X size={16} /> {worker.approval_status === 'rejected' ? 'Rejected' : isWorking ? '...' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
