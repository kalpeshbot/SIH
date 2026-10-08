import React from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, ShieldAlert, ArrowRight } from 'lucide-react';

export const PortalSelectionPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-primary)',
            }}
          >
            MORD
          </h1>
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}
          >
            Choose Portal
          </p>
        </div>

        {/* Portal Options Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            width: '100%',
          }}
        >
          {/* Trainee Portal Card */}
          <div
            className="card"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--border-main)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                <UserCheck size={20} color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  TRAINEE PORTAL
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                View your safety status and session
              </p>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <Link
                to="/trainee"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>ENTER</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Trainer Console Card */}
          <div
            className="card"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--border-main)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                <ShieldAlert size={20} color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  TRAINER CONSOLE
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Monitor trainees, devices and alerts
              </p>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <Link
                to="/trainer"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>ENTER</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
