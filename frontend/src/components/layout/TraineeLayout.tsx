import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { PortalProvider } from '../../context/PortalContext';
import { UserCheck, Grid } from 'lucide-react';

export const TraineeLayout: React.FC = () => {
  return (
    <PortalProvider portal="TRAINEE">
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <header
          style={{
            height: '48px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-main)',
            padding: '0 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              MORD
            </span>
            <span style={{ color: 'var(--border-muted)', fontSize: '0.8rem' }}>|</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <UserCheck size={14} color="var(--primary)" /> Trainee Portal
            </span>
          </div>

          <Link
            to="/"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', gap: '0.35rem' }}
          >
            <Grid size={13} />
            Choose Portal
          </Link>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </PortalProvider>
  );
};
