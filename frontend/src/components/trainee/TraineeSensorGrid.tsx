import React from 'react';
import { SensorReading } from '../../api/types';
import { Cpu, Activity, Clock } from 'lucide-react';

interface TraineeSensorGridProps {
  readings: SensorReading[];
  sessionActive: boolean;
}

export const TraineeSensorGrid: React.FC<TraineeSensorGridProps> = ({
  readings,
  sessionActive,
}) => {
  // Deduplicate to show only the latest reading per sensor_type
  const latestBySensorType = React.useMemo(() => {
    const map = new Map<string, SensorReading>();
    for (const r of readings) {
      const existing = map.get(r.sensor_type);
      if (!existing || new Date(r.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        map.set(r.sensor_type, r);
      }
    }
    return Array.from(map.values());
  }, [readings]);

  const formatReadingTime = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  const getStatusBadge = (status: string) => {
    const upper = (status || '').toUpperCase();
    if (upper === 'DANGER' || upper === 'CRITICAL') {
      return {
        bg: 'var(--state-danger-bg)',
        color: 'var(--state-danger-text)',
        border: 'var(--state-danger-border)',
        label: 'DANGER',
      };
    }
    if (upper === 'WARNING') {
      return {
        bg: 'var(--state-warning-bg)',
        color: 'var(--state-warning-text)',
        border: 'var(--state-warning-border)',
        label: 'WARNING',
      };
    }
    return {
      bg: 'var(--state-normal-bg)',
      color: 'var(--state-normal-text)',
      border: 'var(--state-normal-border)',
      label: 'NORMAL',
    };
  };

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={18} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            SENSOR TELEMETRY READINGS
          </h3>
        </div>
        {sessionActive && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Activity size={13} color="var(--state-normal-dot)" />
            Real-Time Data
          </span>
        )}
      </div>

      {!sessionActive ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No session active. Telemetry data unavailable.
        </div>
      ) : latestBySensorType.length === 0 ? (
        <div
          style={{
            padding: '2rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-main)',
          }}
        >
          <Activity size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Waiting for sensor readings...
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Sensors have not transmitted telemetry data for this active session yet.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {latestBySensorType.map((reading) => {
            const st = getStatusBadge(reading.status);
            return (
              <div
                key={reading.id || reading.sensor_type}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-main)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {reading.sensor_type}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.4rem',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: st.bg,
                        color: st.color,
                        border: `1px solid ${st.border}`,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', margin: '0.35rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {reading.value}
                    </span>
                    {reading.unit && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {reading.unit}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-muted)',
                    fontSize: '0.725rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={11} /> {formatReadingTime(reading.timestamp)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                    {new Date(reading.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
