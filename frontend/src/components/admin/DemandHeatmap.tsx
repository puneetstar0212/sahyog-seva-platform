import { useState } from 'react';
import { ChevronLeft, MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { demandHeatmap } from '@/data/mockData';

export function DemandHeatmap() {
  const { navigate } = useAppStore();
  const [selectedArea, setSelectedArea] = useState<string>('All');

  const areas = ['All', ...Array.from(new Set(demandHeatmap.map((d) => d.area)))];
  const visible = selectedArea === 'All' ? demandHeatmap : demandHeatmap.filter((d) => d.area === selectedArea);

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

  return (
    <main className="container page-main">
      <button className="text-button back-link" onClick={() => navigate('adminDashboard')}><ChevronLeft size={17} /> Back to Overview</button>
      <div className="dashboard-intro">
        <span className="eyebrow">Demand Analysis</span>
        <h1>Demand vs Supply Heatmap</h1>
        <p>Identify service gaps across areas to guide worker recruitment and cooperative expansion.</p>
      </div>

      <div className="heatmap-filters">
        {areas.map((area) => (
          <button key={area} className={selectedArea === area ? 'selected' : ''} onClick={() => setSelectedArea(area)}>{area}</button>
        ))}
      </div>

      <div className="heatmap-grid">
        {visible.map((cell) => (
          <div className="heatmap-cell" key={`${cell.area}-${cell.category}`} style={{ borderLeft: `4px solid ${getGapColor(cell.gap)}` }}>
            <div className="heatmap-cell-head">
              <span className="heatmap-category">{cell.category}</span>
              <span className="heatmap-area"><MapPin size={11} /> {cell.area}</span>
            </div>
            <div className="heatmap-bars">
              <div className="heatmap-bar">
                <small>Demand</small>
                <div className="bar-track"><div className="bar-fill demand" style={{ width: `${cell.demand}%` }} /></div>
                <strong>{cell.demand}</strong>
              </div>
              <div className="heatmap-bar">
                <small>Supply</small>
                <div className="bar-track"><div className="bar-fill supply" style={{ width: `${cell.supply}%` }} /></div>
                <strong>{cell.supply}</strong>
              </div>
            </div>
            <div className="heatmap-gap" style={{ color: getGapColor(cell.gap) }}>
              {getGapIcon(cell.gap)}
              <span>Gap: {cell.gap}</span>
            </div>
          </div>
        ))}
      </div>

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
