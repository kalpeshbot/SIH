import React from 'react';
import { Alert } from '../../api/types';
import { AlertTriangle, AlertCircle, Info, ShieldCheck, Lock } from 'lucide-react';

interface TraineeAlertsListProps {
  alerts: Alert[];
}

export const TraineeAlertsList: React.FC<TraineeAlertsListProps> = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '1.25rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-main)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--state-normal-text)' }}>
          <ShieldCheck size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>NO ACTIVE SAFETY ALERTS</span>
        </div>
      </div>
    );
  }

  const getSeverityStyle = (severity: string) => {
    const s = severity.toUpperCase();
    if (s === 'CRITICAL' || s === 'DANGER') {
      return {
        bg: 'var(--state-danger-bg)',
        color: 'var(--state-danger-text)',
        border: 'var(--state-danger-border)',
        icon: <AlertTriangle size={18} color="var(--state-danger-text)" />,
      };
    }
    if (s === 'WARNING') {
      return {
        bg: 'var(--state-warning-bg)',
        color: 'var(--state-warning-text)',
        border: 'var(--state-warning-border)',
        icon: <AlertCircle size={18} color="var(--state-warning-text)" />,
      };
    }
    return {
      bg: 'var(--state-neutral-bg)',
      color: 'var(--text-secondary)',
      border: 'var(--border-main)',
      icon: <Info size={18} color="var(--text-secondary)" />,
    };
  };

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-main)',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} color="var(--state-danger-text)" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ACTIVE SESSION ALERTS ({alerts.length})
          </h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Lock size={12} /> Read-only
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.map((alert) => {
          const st = getSeverityStyle(alert.severity);
          return (
            <div
              key={alert.id}
              style={{
                padding: '1rem',
                backgroundColor: st.bg,
                border: `1px solid ${st.border}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: '0.15rem' }}>{st.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: st.color, textTransform: 'uppercase' }}>
                    [{alert.severity}] {alert.alert_type}
                  </span>
                  <span style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {alert.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-muted)',
          fontSize: '0.775rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        Note: Active alerts must be acknowledged and cleared by your safety supervisor on the Trainer Console.
      </div>
    </div>
  );
};
