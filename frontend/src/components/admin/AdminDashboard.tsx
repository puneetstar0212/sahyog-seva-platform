import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Users, Briefcase, FileText, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

type Tab = 'users' | 'workers' | 'gigs' | 'escrow';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Still allowing them to switch out of admin via the store like the old dash
  const { adminLogout } = useAppStore();

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: Tab) => {
    setLoading(true);
    setError(null);
    setData([]);
    
    try {
      let query;
      switch (tab) {
        case 'users':
          query = supabase.from('profiles').select('id, full_name, email, role, kyc_status').order('created_at', { ascending: false });
          break;
        case 'workers':
          query = supabase.from('worker_profiles').select('user_id, skills, hourly_rate, approval_status, created_at, profiles!inner(full_name, phone, address)').order('created_at', { ascending: false });
          break;
        case 'gigs':
          query = supabase.from('gigs').select('id, title, budget, status, payment_mode').order('created_at', { ascending: false });
          break;
        case 'escrow':
          query = supabase.from('escrow_transactions').select('id, gig_id, amount, status').order('created_at', { ascending: false });
          break;
      }

      const { data: result, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      let resultData = result || [];
      if (tab === 'workers') {
        resultData = resultData.map((row: any) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return {
            id: row.user_id,
            name: profile?.full_name || 'Unknown',
            skill: row.skills ? row.skills.join(', ') : '',
            hourly_rate: row.hourly_rate || 0,
            phone: profile?.phone || '',
            location: profile?.address || '',
            approval_status: row.approval_status || 'pending',
            created_at: row.created_at,
          };
        });
      }

      setData(resultData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(`Error fetching ${tab}:`, err);
      setError(err.message || `Failed to fetch ${tab} data.`);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleWorkerToggle = async (worker: any) => {
    const newStatus = worker.approval_status === 'approved' ? 'rejected' : 'approved';
    const { error } = await supabase.from('worker_profiles').update({ approval_status: newStatus }).eq('user_id', worker.id);
    if (!error) {
      setData((prev) => prev.map((w) => w.id === worker.id ? { ...w, approval_status: newStatus } : w));
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Users', icon: <Users size={18} /> },
    { id: 'workers', label: 'Workers', icon: <Briefcase size={18} /> },
    { id: 'gigs', label: 'Gigs', icon: <FileText size={18} /> },
    { id: 'escrow', label: 'Escrow', icon: <Activity size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage users, workers, gigs, and transactions.</p>
          </div>
          <button 
            onClick={() => void adminLogout()}
            className="text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors"
          >
            Logout Admin
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100/80 p-1 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out
                ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-900/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {loading && (
            <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
              <svg className="animate-spin h-8 w-8 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm font-medium animate-pulse">Loading {activeTab}...</p>
            </div>
          )}

          {error && !loading && (
            <div className="m-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start space-x-3">
              <XCircle className="text-red-500 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <button 
                  onClick={() => fetchData(activeTab)} 
                  className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline underline-offset-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-4">
                <FileText className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 text-sm">No {activeTab} found in the database.</p>
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    {activeTab === 'users' && (
                      <>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">KYC</th>
                      </>
                    )}
                    {activeTab === 'workers' && (
                      <>
                        <th className="px-6 py-4">Worker ID</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Skill</th>
                        <th className="px-6 py-4">Hourly Rate</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Status</th>
                      </>
                    )}
                    {activeTab === 'gigs' && (
                      <>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Budget</th>
                        <th className="px-6 py-4">Payment Mode</th>
                        <th className="px-6 py-4">Status</th>
                      </>
                    )}
                    {activeTab === 'escrow' && (
                      <>
                        <th className="px-6 py-4">Gig ID (FK)</th>
                        <th className="px-6 py-4">Total Amount</th>
                        <th className="px-6 py-4">Status</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {data.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                      {/* USERS */}
                      {activeTab === 'users' && (
                        <>
                          <td className="px-6 py-4 font-medium text-gray-900">{item.full_name || '—'}</td>
                          <td className="px-6 py-4 text-gray-500">{item.email}</td>
                          <td className="px-6 py-4 capitalize">{item.role}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.kyc_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                              item.kyc_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {item.kyc_status}
                            </span>
                          </td>
                        </>
                      )}
                      
                      {/* WORKERS */}
                      {activeTab === 'workers' && (
                        <>
                          <td className="px-6 py-4 font-medium text-gray-900 font-mono text-xs">{item.id}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{item.name || 'Unknown'}</td>
                          <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{item.skill || 'None'}</td>
                          <td className="px-6 py-4 font-mono font-medium text-gray-900">₹{item.hourly_rate ?? 250}</td>
                          <td className="px-6 py-4 text-gray-500 font-mono">{item.phone || '-'}</td>
                          <td className="px-6 py-4 text-gray-500">{item.location || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
                              item.approval_status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                              item.approval_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {item.approval_status || 'approved'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* GIGS */}
                      {activeTab === 'gigs' && (
                        <>
                          <td className="px-6 py-4 font-medium text-gray-900">{item.title}</td>
                          <td className="px-6 py-4">₹{item.budget}</td>
                          <td className="px-6 py-4 text-gray-500">{item.payment_mode}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.status === 'Open' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* ESCROW */}
                      {activeTab === 'escrow' && (
                        <>
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">{item.gig_id}</td>
                          <td className="px-6 py-4 font-medium">₹{item.amount}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.status === 'HELD' || item.status === 'LOCKED' ? 'bg-amber-100 text-amber-800' :
                              item.status === 'RELEASED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {activeTab === 'workers' && (
                            <button 
                              onClick={() => void handleWorkerToggle(item)}
                              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                                item.approval_status === 'approved' 
                                  ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                  : 'text-white bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {item.approval_status === 'approved' ? 'Reject' : 'Approve'}
                            </button>
                          )}
                          {activeTab === 'gigs' && item.status === 'Open' && (
                            <button className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">
                              Cancel
                            </button>
                          )}
                          {activeTab === 'users' && (
                            <button className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors">
                              View
                            </button>
                          )}
                          {activeTab === 'escrow' && item.status === 'HELD' && (
                            <button className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors">
                              Release Funds
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
