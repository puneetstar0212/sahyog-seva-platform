import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, MapPin, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, DatabaseZap, CalendarRange } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import type { DemandCell } from '@/types';

// Extended DemandCell includes live-data extras returned by the backend.
interface LiveDemandCell extends DemandCell {
  status: string;
  booking_count?: number;
  worker_count?: number;
}

export function DemandHeatmap() {
  const { navigate } = useAppStore();
  const [selectedArea, setSelectedArea] = useState<string>('All');

  // ── Date-range state (defaults to last 90 days) ────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(ninetyDaysAgo);
  const [toDate, setToDate] = useState<string>(today);

  // ── Live data state ────────────────────────────────────────────────────────
  const [cells, setCells] = useState<LiveDemandCell[]>([]);
  const [dataSource, setDataSource] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch heatmap from backend ─────────────────────────────────────────────
  const fetchHeatmap = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.admin.getDemandHeatmap({ from_date: fromDate, to_date: toDate });
      setCells(result.cells as LiveDemandCell[]);
      setDataSource(result.data_source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demand data.');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void fetchHeatmap();
  }, [fetchHeatmap]);

  // ── Derived area list and visible rows ────────────────────────────────────
  const areas = ['All', ...Array.from(new Set(cells.map((d) => d.area)))];
  const visible = selectedArea === 'All' ? cells : cells.filter((d) => d.area === selectedArea);

  // ── Gap colour / icon helpers (unchanged from original) ───────────────────
  const getGapColor = (gap: number) => {
    if (gap >= 30) return '#c0392b';
    if (gap >= 20) return '#e67e22';
    if (gap >= 10) return '#f39c12';
    return '#27ae60';
  };

  const getGapIcon = (gap: number) => {
    if (gap >= 20) return <TrendingUp size={14} />;
    if (gap >= 10) return <Minus size={14} />;
    return <TrendingDown size={14} />;
  };

  // ── Status badge helper ────────────────────────────────────────────────────
  const getStatusStyle = (status: string): React.CSSProperties => {
    const map: Record<string, string> = {
      Critical: '#c0392b',
      High:     '#e67e22',
      Moderate: '#f39c12',
      Balanced: '#27ae60',
    };
    return {
      background: map[status] ?? '#888',
      color: '#fff',
      fontSize: '0.7rem',
      fontWeight: 600,
      borderRadius: '4px',
      padding: '2px 6px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    };
  };

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('adminDashboard')}>
        <ChevronLeft size={17} /> Back to Overview
      </button>

      <div className="dashboard-intro">
        <span className="eyebrow">Demand Analysis</span>
        <h1>Demand vs Supply Heatmap</h1>
        <p>Identify service gaps across areas to guide worker recruitment and cooperative expansion.</p>
      </div>

      {/* ── Data-source badge ─────────────────────────────────────────────── */}
      {dataSource && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', opacity: 0.75, fontSize: '0.82rem' }}>
          <DatabaseZap size={14} />
          <span>{dataSource}</span>
        </div>
      )}

      {/* ── Date-range filter ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <CalendarRange size={16} style={{ opacity: 0.6 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          From
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          To
          <input
            type="date"
            value={toDate}
            min={fromDate}
            max={today}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' }}
          />
        </label>
        <button
          className="primary-button"
          style={{ padding: '5px 14px', fontSize: '0.85rem' }}
          onClick={fetchHeatmap}
        >
          Apply
        </button>
      </div>

      {/* ── Area filter tabs ──────────────────────────────────────────────── */}
      {!isLoading && !error && (
        <div className="heatmap-filters">
          {areas.map((area) => (
            <button key={area} className={selectedArea === area ? 'selected' : ''} onClick={() => setSelectedArea(area)}>
              {area}
            </button>
          ))}
        </div>
      )}

      {/* ── States: loading / error / empty / data ────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem 0', opacity: 0.65 }}>
          <Loader2 size={20} className="spin" />
          <span>Loading demand data from database…</span>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', background: '#fff0f0', borderRadius: '8px', color: '#c0392b' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="text-button" onClick={fetchHeatmap} style={{ marginLeft: 'auto' }}>Retry</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state small">
          <DatabaseZap size={28} />
          <h3>No data for this period</h3>
          <p>No bookings found in the selected date range. Try widening the filter.</p>
        </div>
      ) : (
        <div className="heatmap-grid">
          {visible.map((cell) => (
            <div
              className="heatmap-cell"
              key={`${cell.area}-${cell.category}`}
              style={{ borderLeft: `4px solid ${getGapColor(cell.gap)}` }}
            >
              <div className="heatmap-cell-head">
                <span className="heatmap-category">{cell.category}</span>
                <span className="heatmap-area"><MapPin size={11} /> {cell.area}</span>
                {cell.status && (
                  <span style={getStatusStyle(cell.status)}>{cell.status}</span>
                )}
              </div>

              <div className="heatmap-bars">
                <div className="heatmap-bar">
                  <small>Demand</small>
                  <div className="bar-track"><div className="bar-fill demand" style={{ width: `${cell.demand}%` }} /></div>
                  <strong>{cell.demand}</strong>
                  {cell.booking_count != null && (
                    <small style={{ opacity: 0.6, marginLeft: '4px' }}>({cell.booking_count} booking{cell.booking_count !== 1 ? 's' : ''})</small>
                  )}
                </div>
                <div className="heatmap-bar">
                  <small>Supply</small>
                  <div className="bar-track"><div className="bar-fill supply" style={{ width: `${cell.supply}%` }} /></div>
                  <strong>{cell.supply}</strong>
                  {cell.worker_count != null && (
                    <small style={{ opacity: 0.6, marginLeft: '4px' }}>({cell.worker_count} worker{cell.worker_count !== 1 ? 's' : ''})</small>
                  )}
                </div>
              </div>

              <div className="heatmap-gap" style={{ color: getGapColor(cell.gap) }}>
                {getGapIcon(cell.gap)}
                <span>Gap: {cell.gap}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Legend (unchanged) ────────────────────────────────────────────── */}
      <section className="dashboard-section">
        <h2>Legend</h2>
        <div className="heatmap-legend">
          <span><span className="legend-dot" style={{ background: '#c0392b' }} /> Critical Gap (30+)</span>
          <span><span className="legend-dot" style={{ background: '#e67e22' }} /> High Gap (20-29)</span>
          <span><span className="legend-dot" style={{ background: '#f39c12' }} /> Moderate Gap (10-19)</span>
          <span><span className="legend-dot" style={{ background: '#27ae60' }} /> Balanced (0-9)</span>
        </div>
      </section>
    </main>
  );
}
