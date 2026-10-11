import React from 'react';

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--border-muted) 25%, var(--bg-surface-elevated) 50%, var(--border-muted) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 4,
  cols = 5,
}) => {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="table-container" role="status" aria-label="Loading data">
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}>
                  <div style={{ height: '12px', borderRadius: '2px', width: '70%', ...shimmerStyle }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}>
                    <div style={{ height: '14px', borderRadius: '2px', width: `${60 + ((r + c) % 3) * 15}%`, ...shimmerStyle, animationDelay: `${(r * cols + c) * 80}ms` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }} role="status" aria-label="Loading cards">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card" style={{ padding: '1rem', minHeight: '140px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ height: '16px', width: '50%', borderRadius: '2px', ...shimmerStyle, animationDelay: `${i * 120}ms` }} />
            <div style={{ height: '24px', width: '80%', borderRadius: '2px', ...shimmerStyle, animationDelay: `${i * 120 + 60}ms` }} />
            <div style={{ height: '12px', width: '40%', borderRadius: '2px', marginTop: 'auto', ...shimmerStyle, animationDelay: `${i * 120 + 120}ms` }} />
          </div>
        ))}
      </div>
    </>
  );
};

