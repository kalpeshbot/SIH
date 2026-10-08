import React from 'react';
import { Database, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = <Database size={32} color="var(--text-muted)" />,
}) => {
  return (
    <div
      className="card"
      style={{
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        backgroundColor: 'var(--bg-subtle)',
      }}
    >
      <div style={{ marginBottom: '0.25rem' }}>{icon}</div>
      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: 0, fontSize: '0.85rem' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn btn-primary btn-sm"
          style={{ marginTop: '0.75rem' }}
        >
          <Plus size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
