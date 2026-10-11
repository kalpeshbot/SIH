import React from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, ShieldAlert, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

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
        padding: '2rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Brand Terminal Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-main)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--primary-text)',
              marginBottom: '1rem',
              letterSpacing: '0.04em',
            }}
          >
            <Cpu size={13} />
            <span>MORD OPERATIONAL GATEWAY</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '2.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.15,
            }}
          >
            Industrial Workbench
          </h1>
          <p
            style={{
              margin: '0.5rem 0 0',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              letterSpacing: '0.01em',
              maxWidth: '520px',
            }}
          >
            Select your operational role to access local telemetry processing, session safety auditing, and machine diagnostics.
          </p>
        </div>

        {/* Portal Options Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem',
            width: '100%',
          }}
        >
          {/* Trainee Portal Card */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-main)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary-subtle)',
                    border: '1px solid var(--primary-border)',
                    display: 'flex',
                  }}
                >
                  <UserCheck size={18} color="var(--primary-text)" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    TRAINEE PORTAL
                  </h2>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    PERSONAL SAFETY MONITOR
                  </span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Inspect your assigned training session, real-time wearable telemetry, environment thresholds, and active safety state.
              </p>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <Link
                to="/trainee"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', height: '36px' }}
              >
                <span>Launch Trainee Portal</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Trainer Console Card */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-main)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary-subtle)',
                    border: '1px solid var(--primary-border)',
                    display: 'flex',
                  }}
                >
                  <ShieldAlert size={18} color="var(--primary-text)" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    TRAINER CONSOLE
                  </h2>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    OPERATIONS & SUPERVISION
                  </span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Supervise workshop sessions, manage IoT diagnostic hardware, conduct evidence-guided inspections, and export session debriefs.
              </p>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <Link
                to="/trainer"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', height: '36px' }}
              >
                <span>Enter Trainer Console</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Context */}
        <div
          style={{
            marginTop: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <ShieldCheck size={14} />
          <span>Offline-First Vocational Architecture • Edge Telemetry & Evidence Verification</span>
        </div>
      </div>
    </div>
  );
};
