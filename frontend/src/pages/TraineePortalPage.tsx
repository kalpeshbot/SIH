import React from 'react';
import { UserCheck } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';

export const TraineePortalPage: React.FC = () => {
  return (
    <>
      <TopBar
        title="Trainee Safety Portal"
        subtitle="Individual trainee safety telemetry, session status, and personal alerts"
      />

      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          className="card"
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-main)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-subtle)',
              border: '1px solid var(--primary-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <UserCheck size={24} color="var(--primary)" />
          </div>

          <h1
            style={{
              margin: '0 0 0.25rem',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--text-primary)',
            }}
          >
            MORD
          </h1>

          <h2
            style={{
              margin: '0 0 1rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--primary-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Trainee Portal
          </h2>

          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Trainee monitoring interface will appear here.
          </p>
        </div>
      </div>
    </>
  );
};
