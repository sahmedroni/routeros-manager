import React, { memo } from 'react';
import './StatCard.css';

const StatCard = memo(({ title, value, unit, trend, icon, color, progress = 0 }) => {
  return (
    <div className="glass-card stat-card">
      <div className="stat-header">
        <div className="stat-icon" style={{ backgroundColor: `rgba(${color}, 0.1)`, color: `rgb(${color})` }}>
          {icon}
        </div>
      </div>

      <div className="stat-body">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value">
          <span className="value">{value}</span>
          <span className="unit">{unit}</span>
        </div>
      </div>

      <div className="stat-footer">
        <div className="stat-progress-bg">
          <div className="stat-progress-bar" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: `rgb(${color})`, boxShadow: `0 0 10px rgb(${color})` }} />
        </div>
      </div>
    </div>
  );
});

export default StatCard;
