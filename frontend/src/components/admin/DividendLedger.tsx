import { useState, useEffect } from 'react';
import { ChevronLeft, CircleDollarSign, Download, Search, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';

export function DividendLedger() {
  const { navigate } = useAppStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.listCooperativeTransactions()
      .then(data => {
        setTransactions(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const visible = transactions.filter((d) => {
    // Note: status is either COMPLETED or something else, map paid to COMPLETED
    const mappedStatus = d.transaction_status === 'COMPLETED' ? 'paid' : 'pending';
    return (filter === 'all' || mappedStatus === filter) &&
           `${d.cooperative_id} ${d.worker_id}`.toLowerCase().includes(query.toLowerCase());
  });

  const totalPaid = transactions.filter((d) => d.transaction_status === 'COMPLETED').reduce((sum, d) => sum + Number(d.cooperative_amount), 0);
  const totalPending = transactions.filter((d) => d.transaction_status !== 'COMPLETED').reduce((sum, d) => sum + Number(d.cooperative_amount), 0);
  const payoutsMade = transactions.filter((d) => d.transaction_status === 'COMPLETED').length;
  const payoutsPending = transactions.filter((d) => d.transaction_status !== 'COMPLETED').length;

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('adminDashboard')}><ChevronLeft size={17} /> Back to Overview</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Dividend Ledger</span>
        <h1>Cooperative Transactions</h1>
        <p>Track and manage 5% cooperative commissions from gigs.</p>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card"><CircleDollarSign size={22} /><strong>₹{totalPaid.toLocaleString()}</strong><span>Total Accumulated</span></div>
        <div className="stat-card"><CircleDollarSign size={22} /><strong>₹{totalPending.toLocaleString()}</strong><span>Pending Collection</span></div>
        <div className="stat-card"><CircleDollarSign size={22} /><strong>{payoutsMade}</strong><span>Completed Transfers</span></div>
        <div className="stat-card"><CircleDollarSign size={22} /><strong>{payoutsPending}</strong><span>Awaiting Resolution</span></div>
      </div>

      <div className="search-box">
        <Search size={19} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by society or worker..." />
        <button className={`filter-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-pill ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>Completed</button>
        <button className={`filter-pill ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
      </div>

      <div className="dividend-table">
        <div className="dividend-table-head">
          <span>Society</span><span>Worker ID</span><span>Quarter</span><span>Date</span><span>Amount</span><span>Status</span><span>Action</span>
        </div>
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : (
          visible.map((record) => (
            <div className="dividend-table-row" key={record.id}>
              <span>{record.cooperative_id}</span>
              <span title={record.worker_id}>{record.worker_id.substring(0, 8)}...</span>
              <span>Q{Math.ceil((new Date(record.created_at).getMonth() + 1) / 3)}</span>
              <span>{new Date(record.created_at).toLocaleDateString()}</span>
              <strong>₹{Number(record.cooperative_amount).toLocaleString()}</strong>
              <div className={`status-badge ${record.transaction_status === 'COMPLETED' ? 'released' : 'pending'}`}>{record.transaction_status}</div>
              <div>
                {record.transaction_status !== 'COMPLETED' ? <button className="primary-button">Collect Now</button> : <button className="text-button"><CheckCircle size={15} /> Settled</button>}
              </div>
            </div>
          ))
        )}
        {!loading && visible.length === 0 && <div className="empty-state"><Search size={26} /><h3>No records found</h3></div>}
      </div>
    </main>
  );
}
