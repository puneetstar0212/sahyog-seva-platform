import { useState } from 'react';
import { ChevronLeft, CircleDollarSign, Download, Search } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { dividendRecords } from '@/data/mockData';

export function DividendLedger() {
  const { navigate } = useAppStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const visible = dividendRecords.filter((d) => (filter === 'all' || d.status === filter) && `${d.societyName} ${d.workerName}`.toLowerCase().includes(query.toLowerCase()));
  const totalPaid = dividendRecords.filter((d) => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0);
  const totalPending = dividendRecords.filter((d) => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0);

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('adminDashboard')}><ChevronLeft size={17} /> Back to Overview</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Dividend Ledger</span>
        <h1>Dividend Distribution</h1>
        <p>Track and manage dividend payouts to cooperative members.</p>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card"><CircleDollarSign size={22} /><strong>₹{totalPaid.toLocaleString()}</strong><span>Total Paid</span></div>
        <div className="stat-card"><CircleDollarSign size={22} /><strong>₹{totalPending.toLocaleString()}</strong><span>Pending Payouts</span></div>
        <div className="stat-card"><CircleDollarSign size={22} /><strong>{dividendRecords.filter((d) => d.status === 'paid').length}</strong><span>Payouts Made</span></div>
        <div className="stat-card"><CircleDollarSign size={22} /><strong>{dividendRecords.filter((d) => d.status === 'pending').length}</strong><span>Awaiting Payout</span></div>
      </div>

      <div className="search-box">
        <Search size={19} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by society or worker..." />
        <button className={`filter-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-pill ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>Paid</button>
        <button className={`filter-pill ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
      </div>

      <div className="dividend-table">
        <div className="dividend-table-head">
          <span>Society</span><span>Worker</span><span>Quarter</span><span>Date</span><span>Amount</span><span>Status</span><span>Action</span>
        </div>
        {visible.map((record) => (
          <div className="dividend-table-row" key={record.id}>
            <span>{record.societyName}</span>
            <span>{record.workerName}</span>
            <span>{record.quarter}</span>
            <span>{record.date}</span>
            <strong>₹{record.amount.toLocaleString()}</strong>
            <div className={`status-badge ${record.status === 'paid' ? 'released' : 'pending'}`}>{record.status}</div>
            <div>
              {record.status === 'pending' ? <button className="primary-button">Pay Now</button> : <button className="text-button"><Download size={15} /> Receipt</button>}
            </div>
          </div>
        ))}
        {visible.length === 0 && <div className="empty-state"><Search size={26} /><h3>No records found</h3></div>}
      </div>
    </main>
  );
}
