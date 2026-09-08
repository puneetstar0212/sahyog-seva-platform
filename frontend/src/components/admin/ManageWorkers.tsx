import { useEffect, useState, useCallback } from 'react';
import { Check, ChevronLeft, Clock3, Search, ShieldAlert, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';

type WorkerRow = {
  id: string;
  name: string;
  skill: string;
  hourly_rate: number;
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
    setErrorMsg(null);
    const { data, error } = await supabase
      .from('worker_profiles')
      .select('user_id, skills, hourly_rate, experience_years, approval_status, created_at, profiles!inner(full_name, phone, address)')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("ManageWorkers Supabase error:", error);
      setErrorMsg(`Database error: ${error.message} (Hint: Check RLS or profile relations)`);
      setWorkers([]);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: WorkerRow[] = (data || []).map((row: any) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.user_id,
          name: profile?.full_name || 'Unknown',
          phone: profile?.phone || '-',
          location: profile?.address || '-',
          skill: row.skills ? row.skills.join(', ') : '',
          experience: row.experience_years || 0,
          hourly_rate: row.hourly_rate || 0,
          approval_status: row.approval_status || 'pending',
          created_at: row.created_at,
        };
      });
      setWorkers(mapped);
    }
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
      
    if (error) setAuthError(`Failed to update: ${error.message || 'Admin access required.'}`);
    else await loadWorkers();
    
    setWorkingId(null);
  };

  const visible = workers.filter((worker) => {
    const matchesFilter = filter === 'all' || worker.approval_status === filter;
    const name = worker.name ?? '';
    const skill = worker.skill ?? '';
    const q = query.toLowerCase();
    return matchesFilter && (name.toLowerCase().includes(q) || skill.toLowerCase().includes(q));
  });

  const pendingCount = workers.filter((worker) => worker.approval_status === 'pending').length;
  const approvedCount = workers.filter((worker) => worker.approval_status === 'approved').length;

  return (
    <main className="container page-main p-6 max-w-7xl mx-auto font-sans">
      <button className="text-emerald-600 flex items-center mb-6 hover:underline font-medium" onClick={() => navigate('adminDashboard')}>
        <ChevronLeft size={17} className="mr-1" /> Back to Dashboard
      </button>
      
      <div className="mb-8">
        <span className="text-emerald-600 font-medium text-sm tracking-wide uppercase">Admin · Verification Desk</span>
        <h1 className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">Manage Workers</h1>
        <p className="text-gray-500 mt-1">Review registrations, view balances, and manage worker status.</p>
      </div>

      {profile?.role !== 'admin' && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800">
          <ShieldAlert className="shrink-0 mt-0.5 text-amber-600" size={20} />
          <div>
            <h4 className="font-semibold">Restricted View (Not an Admin)</h4>
            <p className="text-sm mt-1">
              You are currently logged in as a <strong>{profile?.role}</strong>. For security reasons, non-admins can only view <strong>approved</strong> workers and cannot approve or reject applications.
              To get full access, log out and register a new account with "admin" in the email address (e.g. <em>admin@sahyog.com</em>).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center text-gray-500 mb-2 font-medium"><ShieldAlert size={20} className="mr-2 text-gray-400" /> Total Workers</div>
          <strong className="text-4xl font-bold text-gray-900">{workers.length}</strong>
        </div>
        <div className="bg-white p-6 rounded-xl border border-amber-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock3 size={64} className="text-amber-500" /></div>
          <div className="flex items-center text-amber-700 mb-2 font-medium"><Clock3 size={20} className="mr-2" /> Pending Approval</div>
          <strong className="text-4xl font-bold text-gray-900 z-10">{pendingCount}</strong>
        </div>
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Check size={64} className="text-emerald-500" /></div>
          <div className="flex items-center text-emerald-600 mb-2 font-medium"><Check size={20} className="mr-2" /> Approved Workers</div>
          <strong className="text-4xl font-bold text-gray-900 z-10">{approvedCount}</strong>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search by worker name..." 
          />
        </div>
        <div className="flex bg-gray-100/80 p-1 rounded-lg w-fit border border-gray-200">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((value) => (
            <button 
              key={value} 
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-200 ${filter === value ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`} 
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-emerald-600 bg-white rounded-xl border border-gray-200 shadow-sm">
          <svg className="animate-spin h-8 w-8 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-medium animate-pulse">Loading worker registrations...</p>
        </div>
      ) : errorMsg ? (
        <div className="py-16 text-center bg-red-50 rounded-xl border border-red-200 shadow-sm flex flex-col items-center justify-center">
          <ShieldAlert size={32} className="text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-1">Failed to load workers</h3>
          <p className="text-red-600 text-sm">{errorMsg}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
          <div className="bg-gray-50 p-4 rounded-full mb-4">
            <Search size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No workers found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your filters or search term.</p>
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
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {visible.map((worker) => {
                  const name = worker.name || 'Unknown';
                  return (
                  <tr key={worker.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mr-3">
                          {name ? name.charAt(0).toUpperCase() : '?'}
                        </div>
                        {name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm">
                        <span className="text-gray-900">{worker.phone}</span>
                        <span className="text-gray-500 text-xs truncate max-w-[150px]">{worker.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{worker.skill || 'None'}</td>
                    <td className="px-6 py-4 text-gray-600">{worker.experience} yrs</td>
                    <td className="px-6 py-4 font-mono text-gray-500">
                      &#8377;{Number(worker.hourly_rate ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
                        worker.approval_status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                        worker.approval_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {worker.approval_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${worker.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700 cursor-default' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                          onClick={() => updateStatus(worker, 'approved')}
                          disabled={worker.approval_status === 'approved' || profile?.role !== 'admin'}
                        >
                          <Check size={16} /> {worker.approval_status === 'approved' ? 'Approved' : 'Approve'}
                        </button>
                        <button 
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${worker.approval_status === 'rejected' ? 'bg-red-100 text-red-700 cursor-default' : 'bg-white border border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                          onClick={() => updateStatus(worker, 'rejected')}
                          disabled={worker.approval_status === 'rejected' || profile?.role !== 'admin'}
                        >
                          <X size={16} /> {worker.approval_status === 'rejected' ? 'Rejected' : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
