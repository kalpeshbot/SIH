import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { SessionCreate, Trainee, Device } from '../../api/types';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SessionCreate) => Promise<void>;
  trainees: Trainee[];
  devices: Device[];
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  trainees,
  devices,
}) => {
  const [sessionId, setSessionId] = useState('');
  const [traineeId, setTraineeId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [sessionType, setSessionType] = useState('TRAINING');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default dropdown values if available
  React.useEffect(() => {
    if (trainees.length > 0 && !traineeId) setTraineeId(trainees[0].trainee_id);
    if (devices.length > 0 && !deviceId) setDeviceId(devices[0].device_id);
    if (!sessionId) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setSessionId(`SESS-TRN-${randomSuffix}`);
    }
  }, [isOpen, trainees, devices, traineeId, deviceId, sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim() || !traineeId || !deviceId || !sessionType.trim()) {
      setError('All fields are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        session_id: sessionId.trim(),
        trainee_id: traineeId,
        device_id: deviceId,
        session_type: sessionType.trim(),
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to initiate session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New Training Session"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="create-session-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Starting Session...' : 'Start Session'}
          </button>
        </>
      }
    >
      <form id="create-session-form" onSubmit={handleSubmit}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.6rem', backgroundColor: 'var(--state-danger-bg)', color: 'var(--state-danger-text)', border: '1px solid var(--state-danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="sess-id">
            Session Code / Identifier
          </label>
          <input
            id="sess-id"
            type="text"
            className="form-input mono"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="e.g. SESS-TRN-101"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sess-trainee">
            Assigned Trainee
          </label>
          <select
            id="sess-trainee"
            className="form-select"
            value={traineeId}
            onChange={(e) => setTraineeId(e.target.value)}
            required
          >
            {trainees.map((t) => (
              <option key={t.id} value={t.trainee_id}>
                {t.name} ({t.trainee_id})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sess-device">
            Assigned Diagnostic Device
          </label>
          <select
            id="sess-device"
            className="form-select"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            required
          >
            {devices.map((d) => (
              <option key={d.id} value={d.device_id}>
                {d.device_id} ({d.device_type} - {d.status})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sess-type">
            Session Type
          </label>
          <select
            id="sess-type"
            className="form-select"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            required
          >
            <option value="TRAINING">Standard Training Module</option>
            <option value="EXAM">Practical Assessment / Exam</option>
            <option value="PRACTICE">Diagnostic Practice</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};
