import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Grid } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="card fade-in"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-main)',
        }}
      >
        <AlertCircle size={36} color="var(--state-danger-text)" style={{ margin: '0 auto 1rem' }} />

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '2.5rem',
            fontWeight: 800,
            color: 'var(--state-danger-text)',
            letterSpacing: '0.08em',
            marginBottom: '0.25rem',
            lineHeight: 1,
          }}
        >
          404
        </div>

        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Route Not Found
        </h1>

        <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          The requested page route does not exist in the MORD Workbench or has been moved.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            <Grid size={14} /> Portal Selection
          </Link>
          <Link to="/trainer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Trainer Console
          </Link>
        </div>
      </div>
    </div>
  );
};

