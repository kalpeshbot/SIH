import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { SessionCreate, Trainee, Device, Zone } from '../../api/types';
import { User, Radio, MapPin, CheckCircle, ArrowRight, ArrowLeft, Search } from 'lucide-react';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SessionCreate) => Promise<void>;
  trainees: Trainee[];
  devices: Device[];
  zones: Zone[];
}

type WizardStep = 'trainee' | 'device' | 'zone' | 'review';

const STEPS: WizardStep[] = ['trainee', 'device', 'zone', 'review'];

function getConnectivityLabel(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'Never seen';
  const ageMs = Date.now() - new Date(lastSeen).getTime();
  if (ageMs < 30_000) return 'Online';
  if (ageMs < 300_000) return 'Recent';
  return 'Offline';
}

function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'Never';
  const ageMs = Date.now() - new Date(lastSeen).getTime();
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  trainees,
  devices,
  zones,
}) => {
  const [step, setStep] = useState<WizardStep>('trainee');
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [sessionType, setSessionType] = useState('TRAINING');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  // Reset on close
  const handleClose = () => {
    setStep('trainee');
    setSelectedTrainee(null);
    setSelectedDevice(null);
    setSelectedZone(null);
    setSessionType('TRAINING');
    setSearchQuery('');
    setError(null);
    onClose();
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1]);
      setSearchQuery('');
    }
  };
  const goBack = () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]);
      setSearchQuery('');
      setError(null);
    }
  };

  // Filtered lists based on search
  const filteredTrainees = useMemo(() =>
    trainees.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.trainee_id.toLowerCase().includes(searchQuery.toLowerCase())
    ), [trainees, searchQuery]);

  const filteredDevices = useMemo(() =>
    devices.filter(d =>
      d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.device_type.toLowerCase().includes(searchQuery.toLowerCase())
    ), [devices, searchQuery]);

  const filteredZones = useMemo(() =>
    zones.filter(z =>
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.zone_id.toLowerCase().includes(searchQuery.toLowerCase())
    ), [zones, searchQuery]);

  const handleSubmit = async () => {
    if (!selectedTrainee || !selectedDevice) {
      setError('A trainee and device are required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const sessionId = `SESS-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
      await onSubmit({
        session_id: sessionId,
        trainee_id: selectedTrainee.trainee_id,
        device_id: selectedDevice.device_id,
        zone_id: selectedZone?.zone_id,
        session_type: sessionType,
      });
      handleClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to start session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabel = (s: WizardStep): string => {
    switch (s) {
      case 'trainee': return '1. Trainee';
      case 'device': return '2. Device';
      case 'zone': return '3. Zone';
      case 'review': return '4. Review';
    }
  };

  const canAdvance = (): boolean => {
    if (step === 'trainee') return selectedTrainee !== null;
    if (step === 'device') return selectedDevice !== null;
    if (step === 'zone') return true; // zone is optional
    return true;
  };

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
      {STEPS.map((s) => (
        <div
          key={s}
          style={{
            flex: 1,
            padding: '0.35rem 0.5rem',
            textAlign: 'center',
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            borderRadius: '3px',
            background: s === step ? 'var(--primary)' : 'var(--surface-2)',
            color: s === step ? '#fff' : 'var(--text-muted)',
          }}
        >
          {stepLabel(s)}
        </div>
      ))}
    </div>
  );

  const renderSearch = (placeholder: string) => (
    <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ paddingLeft: '2rem', fontSize: '0.82rem' }}
      />
      <Search
        size={13}
        color="var(--text-muted)"
        style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );

  const selectionItemStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '0.6rem 0.75rem',
    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-main)'}`,
    borderRadius: '4px',
    background: isSelected ? 'var(--primary-bg)' : 'var(--bg-surface)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    transition: 'border-color 0.15s',
  });

  const renderTraineeStep = () => (
    <>
      {renderSearch('Search trainees...')}
      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {filteredTrainees.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {trainees.length === 0 ? 'No trainees available. Register trainees first.' : 'No trainees match your search.'}
          </div>
        ) : (
          filteredTrainees.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTrainee(t)}
              style={selectionItemStyle(selectedTrainee?.id === t.id)}
            >
              <User size={16} color="var(--primary)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.trainee_id}</div>
              </div>
              {selectedTrainee?.id === t.id && <CheckCircle size={16} color="var(--primary)" />}
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderDeviceStep = () => (
    <>
      {renderSearch('Search devices...')}
      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {filteredDevices.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {devices.length === 0 ? 'No devices available. Register devices first.' : 'No devices match your search.'}
          </div>
        ) : (
          filteredDevices.map((d) => {
            const connLabel = getConnectivityLabel(d.last_seen);
            return (
              <div
                key={d.id}
                onClick={() => setSelectedDevice(d)}
                style={selectionItemStyle(selectedDevice?.id === d.id)}
              >
                <Radio size={16} color="var(--primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{d.device_id}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{d.device_type}</span>
                    {d.firmware_version && <span>v{d.firmware_version}</span>}
                    <span>{d.status}</span>
                    <span>{connLabel} ({formatLastSeen(d.last_seen)})</span>
                  </div>
                </div>
                {selectedDevice?.id === d.id && <CheckCircle size={16} color="var(--primary)" />}
              </div>
            );
          })
        )}
      </div>
    </>
  );

  const renderZoneStep = () => (
    <>
      {renderSearch('Search zones...')}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        Zone selection is optional. Skip to proceed without a zone.
      </p>
      <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {/* No zone option */}
        <div
          onClick={() => setSelectedZone(null)}
          style={selectionItemStyle(selectedZone === null)}
        >
          <MapPin size={16} color="var(--text-muted)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No Zone (Unassigned)</div>
          </div>
          {selectedZone === null && <CheckCircle size={16} color="var(--primary)" />}
        </div>
        {filteredZones.map((z) => (
          <div
            key={z.id}
            onClick={() => setSelectedZone(z)}
            style={selectionItemStyle(selectedZone?.id === z.id)}
          >
            <MapPin size={16} color="var(--primary)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{z.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {z.zone_id}
                {z.description && ` - ${z.description}`}
              </div>
            </div>
            {selectedZone?.id === z.id && <CheckCircle size={16} color="var(--primary)" />}
          </div>
        ))}
      </div>
    </>
  );

  const renderReviewStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Trainee */}
      <div className="card" style={{ margin: 0 }}>
        <div className="card-body" style={{ padding: '0.75rem' }}>
          <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
            <User size={12} /> Trainee
          </span>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedTrainee?.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{selectedTrainee?.trainee_id}</div>
        </div>
      </div>
      {/* Device */}
      <div className="card" style={{ margin: 0 }}>
        <div className="card-body" style={{ padding: '0.75rem' }}>
          <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
            <Radio size={12} /> Device
          </span>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>{selectedDevice?.device_id}</div>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>{selectedDevice?.device_type}</span>
            {selectedDevice?.firmware_version && <span>v{selectedDevice.firmware_version}</span>}
            <span>{selectedDevice?.status}</span>
          </div>
        </div>
      </div>
      {/* Zone */}
      <div className="card" style={{ margin: 0 }}>
        <div className="card-body" style={{ padding: '0.75rem' }}>
          <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
            <MapPin size={12} /> Zone
          </span>
          {selectedZone ? (
            <>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedZone.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{selectedZone.zone_id}</div>
            </>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No zone assigned</div>
          )}
        </div>
      </div>
      {/* Session Type */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="sess-type-review">Session Type</label>
        <select
          id="sess-type-review"
          className="form-select"
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value)}
        >
          <option value="TRAINING">Standard Training Module</option>
          <option value="EXAM">Practical Assessment / Exam</option>
          <option value="PRACTICE">Diagnostic Practice</option>
          <option value="DEMO">Demonstration</option>
          <option value="HARDWARE_TEST">Hardware Test</option>
        </select>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start New Training Session"
      footer={
        <>
          {stepIndex > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={goBack} disabled={isSubmitting}>
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
          )}
          {step === 'review' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedTrainee || !selectedDevice}
            >
              {isSubmitting ? 'Starting Session...' : 'Start Session'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={goNext}
              disabled={!canAdvance()}
            >
              Next <ArrowRight size={14} />
            </button>
          )}
        </>
      }
    >
      {renderStepIndicator()}

      {error && (
        <div style={{
          marginBottom: '0.75rem', padding: '0.6rem',
          backgroundColor: 'var(--state-danger-bg)',
          color: 'var(--state-danger-text)',
          border: '1px solid var(--state-danger-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
        }}>
          {error}
        </div>
      )}

      {step === 'trainee' && renderTraineeStep()}
      {step === 'device' && renderDeviceStep()}
      {step === 'zone' && renderZoneStep()}
      {step === 'review' && renderReviewStep()}
    </Modal>
  );
};
