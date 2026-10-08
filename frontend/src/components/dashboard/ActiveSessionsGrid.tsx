import React from 'react';
import { Link } from 'react-router-dom';
import { PlaySquare, User, Radio, ArrowRight } from 'lucide-react';
import { SessionRecord } from '../../api/types';
import { StatusBadge } from '../common/StatusBadge';

interface ActiveSessionsGridProps {
  sessions: SessionRecord[];
}

export const ActiveSessionsGrid: React.FC<ActiveSessionsGridProps> = ({ sessions }) => {
  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE' || s.status === 'PAUSED');

  if (activeSessions.length === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No training sessions are currently active.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
      }}
    >
      {activeSessions.map((session) => (
        <div key={session.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlaySquare size={16} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                {session.session_id}
              </span>
            </div>
            <StatusBadge status={session.status} />
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={14} /> Trainee:
              </span>
              <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{session.trainee_id}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Radio size={14} /> Device:
              </span>
              <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{session.device_id}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Type:</span>
              <span>{session.session_type}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Started:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {new Date(session.start_time).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid var(--border-main)', backgroundColor: 'var(--bg-subtle)' }}>
            <Link
              to={`/sessions/${session.id}`}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <span>Inspect Live Session</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};
