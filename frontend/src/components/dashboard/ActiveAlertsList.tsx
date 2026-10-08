import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Radio, User } from 'lucide-react';
import { Alert } from '../../api/types';
import { SeverityBadge } from '../common/SeverityBadge';

interface ActiveAlertsListProps {
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
  onSelectAlert?: (alert: Alert) => void;
}

export const ActiveAlertsList: React.FC<ActiveAlertsListProps> = ({
  alerts,
  onAcknowledge,
  onSelectAlert,
}) => {
  if (alerts.length === 0) {
    return (
      <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--state-normal-text)' }}>
          <CheckCircle size={20} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No Active Safety Alerts</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              All monitored devices and sessions are currently within normal operating parameters.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderColor: 'var(--state-danger-border)', overflow: 'hidden' }}>
      <div
        className="card-header"
        style={{
          backgroundColor: 'var(--state-danger-bg)',
          borderBottom: '1px solid var(--state-danger-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--state-danger-text)' }}>
          <AlertTriangle size={18} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Active Safety Alerts ({alerts.length})
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--state-danger-text)', fontFamily: 'var(--font-mono)' }}>
          IMMEDIATE ACTION REQUIRED
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {alerts.map((alert) => {
          const isDanger = alert.severity === 'DANGER' || alert.severity === 'CRITICAL';
          return (
            <div
              key={alert.id}
              style={{
                padding: '0.85rem 1rem',
                borderBottom: '1px solid var(--border-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                backgroundColor: isDanger ? 'var(--state-danger-bg)' : 'var(--bg-surface)',
                cursor: onSelectAlert ? 'pointer' : 'default',
              }}
              onClick={() => onSelectAlert && onSelectAlert(alert)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <SeverityBadge severity={alert.severity} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {alert.message}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ({alert.alert_type})
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <User size={13} /> Session: {alert.session_id}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Radio size={13} /> Device: {alert.device_id}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={13} /> {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcknowledge(alert.id);
                  }}
                  title="Acknowledge hazard"
                >
                  <CheckCircle size={14} />
                  Acknowledge
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
