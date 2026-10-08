import React from 'react';
import { SessionAnalytics } from '../../api/types';
import { X, Printer, Download, FileText } from 'lucide-react';
import { downloadSessionExport } from '../../api/endpoints';

interface SessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: SessionAnalytics;
}

export const SessionReportModal: React.FC<SessionReportModalProps> = ({
  isOpen,
  onClose,
  analytics,
}) => {
  if (!isOpen) return null;

  const { session: s, reading_stats, alert_stats, recent_alerts } = analytics;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-main)',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              SESSION REPORT — {s.session_id}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => downloadSessionExport(s.session_id, 'csv')}
            >
              <Download size={14} />
              CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} />
              Print
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ padding: '0.25rem 0.5rem' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          className="card-body"
          style={{
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Section 1: Session Information */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Session Metadata
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-main)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Session ID</span>
                <strong className="mono" style={{ fontSize: '0.85rem' }}>{s.session_id}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Trainee ID</span>
                <strong className="mono" style={{ fontSize: '0.85rem' }}>{s.trainee_id}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Device / Type</span>
                <strong className="mono" style={{ fontSize: '0.85rem' }}>{s.device_id} ({s.device_type || 'N/A'})</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Zone</span>
                <strong className="mono" style={{ fontSize: '0.85rem' }}>{s.zone_id || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Status / Result</span>
                <strong style={{ fontSize: '0.85rem' }}>{s.status} {s.result ? `(${s.result})` : ''}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Start Time</span>
                <span className="mono" style={{ fontSize: '0.8rem' }}>{new Date(s.start_time).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>End Time</span>
                <span className="mono" style={{ fontSize: '0.8rem' }}>{s.end_time ? new Date(s.end_time).toLocaleString() : 'In Progress'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Duration</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--primary-text)' }}>{s.duration_formatted}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Sensor Telemetry Statistics */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Sensor Telemetry Summary ({reading_stats.total_readings} Total Samples)
            </h4>
            {reading_stats.by_sensor_type.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sensor readings recorded for this session.</p>
            ) : (
              <table className="data-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Sensor Type</th>
                    <th>Samples</th>
                    <th>Minimum</th>
                    <th>Average</th>
                    <th>Maximum</th>
                  </tr>
                </thead>
                <tbody>
                  {reading_stats.by_sensor_type.map((st) => (
                    <tr key={st.sensor_type}>
                      <td><strong>{st.sensor_type}</strong></td>
                      <td className="mono">{st.count}</td>
                      <td className="mono">{st.min} {st.unit}</td>
                      <td className="mono">{st.avg} {st.unit}</td>
                      <td className="mono">{st.max} {st.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 3: Hazard Alerts Summary */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3. Hazard Alert Summary ({alert_stats.total_alerts} Total Alerts)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>INFO</span>
                <strong>{alert_stats.severity_counts.INFO}</strong>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>WARNING</span>
                <strong>{alert_stats.severity_counts.WARNING}</strong>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>DANGER</span>
                <strong>{alert_stats.severity_counts.DANGER}</strong>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>CRITICAL/FAULT</span>
                <strong>{alert_stats.severity_counts.CRITICAL + alert_stats.severity_counts.FAULT}</strong>
              </div>
            </div>

            {/* Alert Timeline */}
            {recent_alerts.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No alerts recorded during this session.</p>
            ) : (
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Hazard</th>
                    <th>Severity</th>
                    <th>Message</th>
                    <th>Acknowledged</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_alerts.map((a) => (
                    <tr key={a.id}>
                      <td className="mono">{new Date(a.timestamp).toLocaleString()}</td>
                      <td>{a.alert_type}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: a.severity === 'DANGER' ? 'var(--status-danger)' : a.severity === 'WARNING' ? 'var(--status-warning)' : 'var(--text-primary)' }}>
                          {a.severity}
                        </span>
                      </td>
                      <td>{a.message}</td>
                      <td>{a.acknowledged ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
