import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Backend unavailable',
  message = 'Unable to retrieve the latest data from the backend service.',
  onRetry,
}) => {
  return (
    <div
      className="card"
      style={{
        padding: '2rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        borderColor: 'var(--state-danger-border)',
        backgroundColor: 'var(--state-danger-bg)',
      }}
      role="alert"
    >
      <AlertTriangle size={32} color="var(--state-danger-text)" />
      <h3 style={{ color: 'var(--state-danger-text)', margin: 0 }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: 0, fontSize: '0.85rem' }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary btn-sm"
          style={{ marginTop: '0.5rem' }}
        >
          <RefreshCw size={14} />
          Retry Request
        </button>
      )}
    </div>
  );
};
