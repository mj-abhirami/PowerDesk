import React from 'react';

export default function StatCard({ title, value, icon, tone, note }) {
  return (
    <div className="stat-card h-100">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="stat-title">
            {title}
          </div>

          <div className="stat-value">
            {value}
          </div>
        </div>

        <div className={`stat-icon ${tone}`}>
          <i className={`bi ${icon}`} />
        </div>
      </div>

      <div className="stat-note">
        {note}
      </div>
    </div>
  );
}
