import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Alert } from '../../api/types';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Radio,
  PlaySquare,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface AlertDetailModalProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (id: number) => Promise<void>;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  isOpen,
  onClose,
  onAcknowledge,
}) => {
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  if (!alert) return null;

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      await onAcknowledge(alert.id);
      onClose();
    } finally {
      setIsAcknowledging(false);
    }
  };

  const isCriticalOrDanger = alert.severity === 'DANGER' || alert.severity === 'CRITICAL';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Hazard Inspection Record — #${alert.id}`}
      maxWidth="580px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            REC-ID: HAZ-{alert.id.toString().padStart(5, '0')}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
            {!alert.acknowledged && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
              >
                <CheckCircle size={14} />
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Hazard'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Banner with Hazard Description */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isCriticalOrDanger ? 'var(--state-danger-bg)' : 'var(--state-warning-bg)',
            border: `1px solid ${isCriticalOrDanger ? 'var(--state-danger-border)' : 'var(--state-warning-border)'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle
            size={20}
            color={isCriticalOrDanger ? 'var(--state-danger-text)' : 'var(--state-warning-text)'}
            style={{ flexShrink: 0, marginTop: '2px' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              {alert.message}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Hazard Classification: <strong className="mono">{alert.alert_type}</strong>
            </div>
          </div>
        </div>

        {/* Section 1: Observed Telemetry & Facts */}
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '0.4rem',
            }}
          >
            Observed Evidence & Context
          </div>
          <div className="table-container">
            <table className="data-table">
              <tbody>
                <tr>
                  <td style={{ width: '38%', color: 'var(--text-muted)' }}>Severity Level</td>
                  <td>
                    <SeverityBadge severity={alert.severity} />
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Diagnostic Device</td>
                  <td className="mono">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Radio size={13} color="var(--primary)" /> {alert.device_id}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Training Session</td>
                  <td className="mono">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <PlaySquare size={13} color="var(--text-secondary)" /> {alert.session_id}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Timestamp Recorded</td>
                  <td className="mono" style={{ fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} color="var(--text-muted)" /> {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Audit Status</td>
                  <td>
                    <StatusBadge status={alert.acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE'} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Derived Interpretation vs Observed Fact */}
        <div
          style={{
            padding: '0.75rem 0.85rem',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
            <Info size={13} color="var(--primary-text)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Derived Interpretation (Rule-Based Engine)
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Triggered by automated Alert Engine rule matching <code className="mono">{alert.alert_type}</code> criteria. This record represents an observed sensor threshold breach, not a certified fault diagnosis. Trainer inspection is required to confirm machinery physical condition.
          </p>
        </div>

        {/* Section 3: Recommended Action */}
        <div
          style={{
            padding: '0.65rem 0.85rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-main)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <ShieldAlert size={16} color="var(--state-warning-text)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <strong>Action Protocol:</strong> Verify trainee safety zone adherence. Check physical sensor coupling before clearing hazard.
          </div>
        </div>
      </div>
    </Modal>
  );
};
