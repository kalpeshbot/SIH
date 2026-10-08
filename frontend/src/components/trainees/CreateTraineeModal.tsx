import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { TraineeCreate } from '../../api/types';

interface CreateTraineeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TraineeCreate) => Promise<void>;
}

export const CreateTraineeModal: React.FC<CreateTraineeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [traineeId, setTraineeId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traineeId.trim() || !name.trim()) {
      setError('Trainee ID and Name are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        trainee_id: traineeId.trim(),
        name: name.trim(),
      });
      setTraineeId('');
      setName('');
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to register trainee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Trainee"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="create-trainee-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register Trainee'}
          </button>
        </>
      }
    >
      <form id="create-trainee-form" onSubmit={handleSubmit}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.6rem', backgroundColor: 'var(--state-danger-bg)', color: 'var(--state-danger-text)', border: '1px solid var(--state-danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="trn-id">
            Trainee Identifier
          </label>
          <input
            id="trn-id"
            type="text"
            className="form-input mono"
            value={traineeId}
            onChange={(e) => setTraineeId(e.target.value)}
            placeholder="e.g. TRN-004"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="trn-name">
            Full Name
          </label>
          <input
            id="trn-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            required
          />
        </div>
      </form>
    </Modal>
  );
};
