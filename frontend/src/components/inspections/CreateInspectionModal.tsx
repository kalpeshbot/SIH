import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, AlertCircle } from 'lucide-react';
import { InspectionTemplate, SessionRecord, InspectionCreate } from '../../api/types';
import { getInspectionTemplates, getSessions } from '../../api/endpoints';

interface CreateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InspectionCreate) => Promise<void>;
  defaultSessionId?: string;
  defaultEventId?: string;
  defaultMachineId?: string;
}

export const CreateInspectionModal: React.FC<CreateInspectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultSessionId,
  defaultEventId,
  defaultMachineId,
}) => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inspectionId, setInspectionId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [templateId, setTemplateId] = useState('LATHE_MECHANICAL_INSPECTION');
  const [machineId, setMachineId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [reason, setReason] = useState('');
  const [trainerNotes, setTrainerNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initId = `INSP-${Date.now().toString().slice(-6)}`;
      setInspectionId(initId);
      setSessionId(defaultSessionId || '');
      setMachineId(defaultMachineId || '');
      setReason(defaultEventId ? `Follow-up inspection for safety event ${defaultEventId}` : '');
      setTrainerNotes('');
      setError(null);

      setLoading(true);
      Promise.all([getSessions(), getInspectionTemplates()])
        .then(([sessData, tmplData]) => {
          setSessions(sessData);
          setTemplates(tmplData);
          if (!defaultSessionId && sessData.length > 0) {
            setSessionId(sessData[0].session_id);
          }
          if (tmplData.length > 0) {
            setTemplateId(tmplData[0].template_id);
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load sessions and templates');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, defaultSessionId, defaultEventId, defaultMachineId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionId.trim() || !sessionId.trim() || !reason.trim()) {
      setError('Inspection ID, Session, and Reason are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        inspection_id: inspectionId.trim(),
        session_id: sessionId.trim(),
        template_id: templateId || undefined,
        machine_id: machineId.trim() || undefined,
        zone_id: zoneId.trim() || undefined,
        event_id: defaultEventId || undefined,
        reason: reason.trim(),
        trainer_notes: trainerNotes.trim() || undefined,
        measurement_source: 'MANUAL_OBSERVATION',
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to initiate inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-main)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardCheck size={18} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Start Evidence-Guided Inspection
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger-text)',
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  Inspection ID *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={inspectionId}
                  onChange={(e) => setInspectionId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  Training Session *
                </label>
                <select
                  className="form-select"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  disabled={loading || Boolean(defaultSessionId)}
                  required
                >
                  {sessions.map((s) => (
                    <option key={s.session_id} value={s.session_id}>
                      {s.session_id} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                Inspection Route Template
              </label>
              <select
                className="form-select"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.template_id} value={t.template_id}>
                    {t.title} ({t.category})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                Initializes ordered checklist steps for the selected industrial route.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  Machine Reference (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. LATHE-01, PUMP-02"
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  Zone Reference (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. ZONE-A"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                Reason for Inspection *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Elevated acoustic and vibration peak during spindle run"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                Trainer Notes / Instructions
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Initial guidance for trainee before commencing physical walk-around"
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.6rem',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-muted)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Commence Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
