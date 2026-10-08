import React from 'react';
import { Modal } from '../common/Modal';
import { Alert } from '../../api/types';
import { SeverityBadge } from '../common/SeverityBadge';
import { CheckCircle, AlertTriangle, Clock, Radio, PlaySquare } from 'lucide-react';

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
  const [isAcknowledging, setIsAcknowledging] = React.useState(false);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Hazard Alert Inspection - #${alert.id}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {!alert.acknowledged && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
            >
              <CheckCircle size={14} />
              {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Hazard'}
            </button>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            padding: '0.85rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: alert.severity === 'DANGER' || alert.severity === 'CRITICAL' ? 'var(--state-danger-bg)' : 'var(--state-warning-bg)',
            border: `1px solid ${alert.severity === 'DANGER' || alert.severity === 'CRITICAL' ? 'var(--state-danger-border)' : 'var(--state-warning-border)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle size={24} color={alert.severity === 'DANGER' || alert.severity === 'CRITICAL' ? 'var(--state-danger-text)' : 'var(--state-warning-text)'} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {alert.message}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Hazard Type: <strong>{alert.alert_type}</strong>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <tbody>
              <tr>
                <td style={{ width: '35%', color: 'var(--text-muted)' }}>Severity Level</td>
                <td>
                  <SeverityBadge severity={alert.severity} />
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Session Identifier</td>
                <td className="mono">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <PlaySquare size={13} /> {alert.session_id}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Diagnostic Device</td>
                <td className="mono">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Radio size={13} /> {alert.device_id}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Timestamp Recorded</td>
                <td className="mono">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} /> {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--text-muted)' }}>Acknowledgment Status</td>
                <td>
                  {alert.acknowledged ? (
                    <span className="badge badge-normal">
                      <CheckCircle size={12} /> ACKNOWLEDGED
                    </span>
                  ) : (
                    <span className="badge badge-danger">
                      <AlertTriangle size={12} /> UNACKNOWLEDGED
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
