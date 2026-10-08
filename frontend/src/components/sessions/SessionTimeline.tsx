import { Clock, Play, AlertTriangle, CheckCircle, Pause } from 'lucide-react';
import { SessionRecord, SensorReading, Alert } from '../../api/types';

interface SessionTimelineProps {
  session: SessionRecord;
  readings: SensorReading[];
  alerts: Alert[];
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'START' | 'ALERT' | 'END' | 'PAUSE';
}

export const SessionTimeline: React.FC<SessionTimelineProps> = ({
  session,
  alerts,
}) => {
  const events: TimelineEvent[] = [];

  // Start event
  events.push({
    id: 'start',
    timestamp: session.start_time,
    title: 'Session Started',
    description: `Initiated session ${session.session_id} for trainee ${session.trainee_id} on device ${session.device_id}`,
    type: 'START',
  });

  // Alerts events
  alerts.forEach((alert) => {
    events.push({
      id: `alert-${alert.id}`,
      timestamp: alert.timestamp,
      title: `${alert.severity} Hazard: ${alert.alert_type}`,
      description: alert.message,
      type: 'ALERT',
    });
  });

  // End event if completed/cancelled
  if (session.end_time) {
    events.push({
      id: 'end',
      timestamp: session.end_time,
      title: `Session ${session.status}`,
      description: `Result recorded: ${session.result || 'None'}`,
      type: session.status === 'COMPLETED' ? 'END' : 'PAUSE',
    });
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'START':
        return <Play size={14} color="var(--primary)" />;
      case 'ALERT':
        return <AlertTriangle size={14} color="var(--state-danger-text)" />;
      case 'END':
        return <CheckCircle size={14} color="var(--state-normal-text)" />;
      case 'PAUSE':
        return <Pause size={14} color="var(--state-warning-text)" />;
      default:
        return <Clock size={14} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} color="var(--primary)" />
          <span className="card-title">Session Chronology Timeline</span>
        </div>
      </div>

      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          {events.map((evt, idx) => (
            <div
              key={evt.id}
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                position: 'relative',
              }}
            >
              {/* Connector line */}
              {idx < events.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '24px',
                    bottom: '-16px',
                    width: '2px',
                    backgroundColor: 'var(--border-main)',
                  }}
                />
              )}

              {/* Icon marker */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  flexShrink: 0,
                }}
              >
                {getIcon(evt.type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{evt.title}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {evt.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
