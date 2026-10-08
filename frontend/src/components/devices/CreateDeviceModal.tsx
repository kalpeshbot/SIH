import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { DeviceCreate, DeviceType, DeviceStatus, Zone } from '../../api/types';

interface CreateDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DeviceCreate) => Promise<void>;
  zones: Zone[];
}

export const CreateDeviceModal: React.FC<CreateDeviceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  zones,
}) => {
  const [deviceId, setDeviceId] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('HANDHELD');
  const [status, setStatus] = useState<DeviceStatus>('ONLINE');
  const [battery, setBattery] = useState(100);
  const [zoneId, setZoneId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId.trim()) {
      setError('Device ID is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        device_id: deviceId.trim(),
        device_type: deviceType,
        status,
        battery,
        zone_id: zoneId ? zoneId : null,
      });
      setDeviceId('');
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to register device.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Hardware Diagnostic Device"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="create-device-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register Device'}
          </button>
        </>
      }
    >
      <form id="create-device-form" onSubmit={handleSubmit}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.6rem', backgroundColor: 'var(--state-danger-bg)', color: 'var(--state-danger-text)', border: '1px solid var(--state-danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="dev-id">
            Device Identifier
          </label>
          <input
            id="dev-id"
            type="text"
            className="form-input mono"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g. HANDHELD-002"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="dev-type">
            Hardware Device Form Factor
          </label>
          <select
            id="dev-type"
            className="form-select"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value as DeviceType)}
            required
          >
            <option value="HANDHELD">Handheld Probe (ESP32 Multi-sensor)</option>
            <option value="WEARABLE">Wearable Trainee Unit</option>
            <option value="BEACON">Fixed Environmental Beacon</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="dev-zone">
            Assigned Workshop Zone (Optional)
          </label>
          <select
            id="dev-zone"
            className="form-select"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {zones.map((z) => (
              <option key={z.id} value={z.zone_id}>
                {z.name} ({z.zone_id})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="dev-status">
              Initial Status
            </label>
            <select
              id="dev-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as DeviceStatus)}
            >
              <option value="ONLINE">ONLINE</option>
              <option value="OFFLINE">OFFLINE</option>
              <option value="FAULT">FAULT</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dev-battery">
              Battery Level (%)
            </label>
            <input
              id="dev-battery"
              type="number"
              min="0"
              max="100"
              className="form-input"
              value={battery}
              onChange={(e) => setBattery(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
