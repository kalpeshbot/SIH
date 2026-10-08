import React from 'react';
import { ReadingStatistics, AlertStatistics } from '../../api/types';
import { BarChart2, ShieldAlert, CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

interface SessionAnalyticsCardProps {
  readingStats: ReadingStatistics;
  alertStats: AlertStatistics;
}

export const SessionAnalyticsCard: React.FC<SessionAnalyticsCardProps> = ({
  readingStats,
  alertStats,
}) => {
  const { by_sensor_type, total_readings } = readingStats;
  const { severity_counts, total_alerts, unacknowledged_alerts, acknowledged_alerts } = alertStats;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      {/* Sensor Reading Statistics Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={16} color="var(--primary)" />
            <span className="card-title">Telemetry Sensor Statistics</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {total_readings} Total Reading{total_readings === 1 ? '' : 's'}
          </span>
        </div>

        <div className="card-body">
          {by_sensor_type.length === 0 ? (
            <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No sensor readings recorded.</p>
              <span style={{ fontSize: '0.75rem' }}>Statistics will populate as hardware transmits telemetry.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {by_sensor_type.map((stat) => (
                <div
                  key={stat.sensor_type}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-main)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {stat.sensor_type}
                    </span>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {stat.count} sample{stat.count === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                    <div style={{ padding: '0.25rem', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Min</span>
                      <span className="mono" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {stat.min} {stat.unit}
                      </span>
                    </div>

                    <div style={{ padding: '0.25rem', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg</span>
                      <span className="mono" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-text)' }}>
                        {stat.avg} {stat.unit}
                      </span>
                    </div>

                    <div style={{ padding: '0.25rem', backgroundColor: 'var(--bg-surface)', borderRadius: '4px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max</span>
                      <span className="mono" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {stat.max} {stat.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alert Severity & Acknowledgement Breakdown Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={16} color="var(--primary)" />
            <span className="card-title">Hazard Alert Summary</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {total_alerts} Total Alert{total_alerts === 1 ? '' : 's'}
          </span>
        </div>

        <div className="card-body">
          {total_alerts === 0 ? (
            <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={24} color="var(--status-online)" style={{ margin: '0 auto 0.4rem' }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No alerts recorded during this session.</p>
              <span style={{ fontSize: '0.75rem' }}>Telemetry remained within standard safety parameters.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Acknowledgement Progress Bar */}
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <span>Acknowledged: <strong>{acknowledged_alerts}</strong></span>
                  <span>Unacknowledged: <strong>{unacknowledged_alerts}</strong></span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--border-main)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${total_alerts > 0 ? (acknowledged_alerts / total_alerts) * 100 : 0}%`,
                      backgroundColor: 'var(--status-online)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Severity Breakdown Pills */}
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Severity Breakdown
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Info size={14} color="#0284c7" />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>INFO</span>
                      <strong style={{ fontSize: '0.85rem' }}>{severity_counts.INFO}</strong>
                    </div>
                  </div>

                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={14} color="#d97706" />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>WARNING</span>
                      <strong style={{ fontSize: '0.85rem' }}>{severity_counts.WARNING}</strong>
                    </div>
                  </div>

                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertOctagon size={14} color="#dc2626" />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>DANGER</span>
                      <strong style={{ fontSize: '0.85rem' }}>{severity_counts.DANGER}</strong>
                    </div>
                  </div>

                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertOctagon size={14} color="#7c3aed" />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>CRITICAL/FAULT</span>
                      <strong style={{ fontSize: '0.85rem' }}>{severity_counts.CRITICAL + severity_counts.FAULT}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
