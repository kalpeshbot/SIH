import React, { useEffect, useState } from 'react';
import { SessionRecord, Device, Zone } from '../../api/types';
import { Radio, MapPin, Activity, Battery } from 'lucide-react';

interface TraineeSessionCardProps {
  session: SessionRecord | null;
  device: Device | null;
  zone: Zone | null;
}

export const TraineeSessionCard: React.FC<TraineeSessionCardProps> = ({
  session,
  device,
  zone,
}) => {
  const [elapsed, setElapsed] = useState<string>('00:00:00');

  // Live timer calculation based on backend session.start_time
  useEffect(() => {
    if (!session || !session.start_time) {
      setElapsed('00:00:00');
      return;
    }

    const updateTimer = () => {
      const start = new Date(session.start_time).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - start) / 1000));

      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      const pad = (n: number) => String(n).padStart(2, '0');
      setElapsed(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const isDeviceConnected = (() => {
    if (!device) return false;
    if (device.status === 'OFFLINE') return false;
    if (!device.last_seen) return false;
    const ageMs = Date.now() - new Date(device.last_seen).getTime();
    return ageMs < 30_000;
  })();

  const formatLastSeen = (lastSeen?: string | null) => {
    if (!lastSeen) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* 1. Session Status & Live Timer */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-main)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              SESSION STATUS
            </span>
          </div>
          {session ? (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--state-normal-bg)',
                color: 'var(--state-normal-text)',
                border: '1px solid var(--state-normal-border)',
                letterSpacing: '0.04em',
              }}
            >
              ACTIVE
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--state-neutral-bg)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-main)',
              }}
            >
              INACTIVE
            </span>
          )}
        </div>

        {session ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {elapsed}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>elapsed</span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Session ID:</strong> {session.session_id}
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Type:</strong> {session.session_type}
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Started:</strong> {new Date(session.start_time).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No active session currently assigned.
          </div>
        )}
      </div>

      {/* 2. Device & Connectivity */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-main)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Radio size={18} color={isDeviceConnected ? 'var(--state-normal-text)' : 'var(--state-danger-text)'} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              DEVICE STATUS
            </span>
          </div>
          {device ? (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: isDeviceConnected ? 'var(--state-normal-bg)' : 'var(--state-danger-bg)',
                color: isDeviceConnected ? 'var(--state-normal-text)' : 'var(--state-danger-text)',
                border: `1px solid ${isDeviceConnected ? 'var(--state-normal-border)' : 'var(--state-danger-border)'}`,
                letterSpacing: '0.04em',
              }}
            >
              {isDeviceConnected ? 'CONNECTED' : 'CONNECTION LOST'}
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--state-neutral-bg)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-main)',
              }}
            >
              NOT ASSIGNED
            </span>
          )}
        </div>

        {device ? (
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {device.device_id}
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                ({device.device_type})
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Last Heartbeat:</strong> {formatLastSeen(device.last_seen)}
              </div>
              {device.battery !== undefined && device.battery !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Battery:</strong>
                  <Battery size={14} color="var(--primary)" />
                  <span>{device.battery}%</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No monitoring device currently linked.
          </div>
        )}
      </div>

      {/* 3. Current Zone */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-main)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <MapPin size={18} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            CURRENT ZONE
          </span>
        </div>

        {zone ? (
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {zone.name}
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-text)', marginBottom: '0.35rem' }}>
              ID: {zone.zone_id}
            </div>
            {zone.description && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {zone.description}
              </div>
            )}
          </div>
        ) : session?.zone_id ? (
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {session.zone_id}
            </div>
          </div>
        ) : (
          <div style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Zone not assigned to this session.
          </div>
        )}
      </div>
    </div>
  );
};
