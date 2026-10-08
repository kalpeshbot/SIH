import React from 'react';
import { Trainee } from '../../api/types';
import { UserCheck, Search, ShieldCheck } from 'lucide-react';

interface TraineeSelectorProps {
  trainees: Trainee[];
  loading: boolean;
  onSelectTrainee: (trainee: Trainee) => void;
}

export const TraineeSelector: React.FC<TraineeSelectorProps> = ({
  trainees,
  loading,
  onSelectTrainee,
}) => {
  const [search, setSearch] = React.useState('');

  const filtered = trainees.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.trainee_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-subtle)',
            border: '1px solid var(--primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <UserCheck size={28} color="var(--primary)" />
        </div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '0 0 0.5rem',
            letterSpacing: '0.04em',
            color: 'var(--text-primary)',
          }}
        >
          MORD TRAINEE PORTAL
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Select your trainee profile to monitor active session safety telemetry and status
        </p>
      </div>

      {/* Search Bar */}
      {trainees.length > 3 && (
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by name or Trainee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.4rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-main)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      )}

      {/* Trainees Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading trainee profiles...
        </div>
      ) : trainees.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-main)',
          }}
        >
          <ShieldCheck size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
            No Trainees Available
          </h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            There are no trainee profiles registered in the system. Please request your trainer to create a profile.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No trainees match "{search}"
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map((trainee) => (
            <div
              key={trainee.id}
              onClick={() => onSelectTrainee(trainee)}
              className="card"
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-main)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-main)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      backgroundColor: 'var(--primary-subtle)',
                      color: 'var(--primary-text)',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--primary-border)',
                    }}
                  >
                    {trainee.trainee_id}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{trainee.id}</span>
                </div>
                <h3 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {trainee.name}
                </h3>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
              >
                Select Profile
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
