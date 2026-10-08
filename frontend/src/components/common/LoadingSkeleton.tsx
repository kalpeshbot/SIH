import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 4,
  cols = 5,
}) => {
  return (
    <div className="table-container" role="status" aria-label="Loading data">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div style={{ height: '12px', background: 'var(--border-main)', borderRadius: '2px', width: '70%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div style={{ height: '14px', background: 'var(--bg-surface-elevated)', borderRadius: '2px', width: `${60 + ((r + c) % 3) * 15}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }} role="status" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '1rem', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ height: '16px', width: '50%', background: 'var(--border-main)', borderRadius: '2px' }} />
          <div style={{ height: '24px', width: '80%', background: 'var(--bg-surface-elevated)', borderRadius: '2px' }} />
          <div style={{ height: '12px', width: '40%', background: 'var(--bg-surface-elevated)', borderRadius: '2px', marginTop: 'auto' }} />
        </div>
      ))}
    </div>
  );
};
