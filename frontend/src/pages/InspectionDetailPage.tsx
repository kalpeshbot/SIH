import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ErrorState } from '../components/common/ErrorState';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import {
  getInspection,
  updateInspectionStep,
  addInspectionEvidence,
  completeInspection,
  cancelInspection,
  getInspectionEvidenceQuality,
  createIntervention,
  getInterventions,
  downloadInspectionExport,
} from '../api/endpoints';
import {
  Inspection,
  InspectionDecision,
  StepStatus,
  EvidenceQualityAssessment,
  TrainerIntervention,
  InspectionStepItem,
  InspectionEvidence,
} from '../api/types';
import {
  ClipboardCheck,
  CheckCircle2,
  Download,
  Plus,
  ArrowLeft,
} from 'lucide-react';

export const InspectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [qualityAssessment, setQualityAssessment] = useState<EvidenceQualityAssessment | null>(null);
  const [interventions, setInterventions] = useState<TrainerIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active step editing state
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepObservation, setStepObservation] = useState('');
  const [savingStep, setSavingStep] = useState(false);

  // Evidence modal state
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceType, setEvidenceType] = useState('MANUAL_MEASUREMENT');
  const [evidenceValue, setEvidenceValue] = useState<string>('');
  const [evidenceUnit, setEvidenceUnit] = useState('mm/s');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Intervention modal state
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [interventionCategory, setInterventionCategory] = useState('WORKHOLDING_ADJUSTMENT');
  const [interventionNotes, setInterventionNotes] = useState('');
  const [beforeVal, setBeforeVal] = useState<string>('');
  const [afterVal, setAfterVal] = useState<string>('');
  const [windowFeature, setWindowFeature] = useState('RMS');
  const [windowUnit, setWindowUnit] = useState('mm/s');
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [interventionError, setInterventionError] = useState<string | null>(null);

  // Conclusion modal state
  const [isConclusionModalOpen, setIsConclusionModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<InspectionDecision>('CONFIRMED_BY_TRAINER');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [trainerClosureNotes, setTrainerClosureNotes] = useState('');
  const [submittingConclusion, setSubmittingConclusion] = useState(false);
  const [conclusionError, setConclusionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [inspData, qualityData, invData] = await Promise.all([
        getInspection(id),
        getInspectionEvidenceQuality(id),
        getInterventions({ inspection_id: id }),
      ]);
      setInspection(inspData);
      setQualityAssessment(qualityData);
      setInterventions(invData);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to load inspection record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStepStatus = async (stepId: string, status: StepStatus, observation?: string) => {
    if (!id || !inspection) return;
    setSavingStep(true);
    try {
      const updated = await updateInspectionStep(id, stepId, {
        status,
        observation: observation !== undefined ? observation : undefined,
      });
      setInspection(updated);
      setEditingStepId(null);
      const q = await getInspectionEvidenceQuality(id);
      setQualityAssessment(q);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update step status');
    } finally {
      setSavingStep(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingEvidence(true);
    setEvidenceError(null);

    let parsedVal: number | null = null;
    if (evidenceValue.trim()) {
      const n = parseFloat(evidenceValue);
      if (isNaN(n) || !isFinite(n)) {
        setEvidenceError('Measurement value must be a valid finite number.');
        setSavingEvidence(false);
        return;
      }
      parsedVal = n;
    }

    try {
      const evId = `EV-${Date.now().toString().slice(-6)}`;
      await addInspectionEvidence(id, {
        evidence_id: evId,
        evidence_type: evidenceType,
        source: 'MANUAL',
        value: parsedVal,
        unit: evidenceUnit.trim() || undefined,
        notes: evidenceNotes.trim() || undefined,
      });
      setIsEvidenceModalOpen(false);
      setEvidenceValue('');
      setEvidenceNotes('');
      await fetchData();
    } catch (err: unknown) {
      setEvidenceError(err instanceof Error ? err.message : 'Failed to record evidence.');
    } finally {
      setSavingEvidence(false);
    }
  };

  const handleAddIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inspection) return;
    if (!interventionNotes.trim()) {
      setInterventionError('Intervention notes are required.');
      return;
    }

    setSavingIntervention(true);
    setInterventionError(null);

    let beforeWindow: Record<string, any> | undefined = undefined;
    let afterWindow: Record<string, any> | undefined = undefined;

    if (beforeVal.trim() && afterVal.trim()) {
      const bFloat = parseFloat(beforeVal);
      const aFloat = parseFloat(afterVal);
      if (!isFinite(bFloat) || !isFinite(aFloat)) {
        setInterventionError('Window comparison values must be finite numbers.');
        setSavingIntervention(false);
        return;
      }
      beforeWindow = {
        feature: windowFeature,
        unit: windowUnit,
        machine_state: inspection.machine_state || 'ACTIVE',
        value: bFloat,
      };
      afterWindow = {
        feature: windowFeature,
        unit: windowUnit,
        machine_state: inspection.machine_state || 'ACTIVE',
        value: aFloat,
      };
    }

    try {
      const invId = `INV-${Date.now().toString().slice(-6)}`;
      await createIntervention({
        intervention_id: invId,
        session_id: inspection.session_id,
        inspection_id: inspection.inspection_id,
        machine_id: inspection.machine_id || undefined,
        category: interventionCategory,
        notes: interventionNotes.trim(),
        before_window_data: beforeWindow,
        after_window_data: afterWindow,
      });
      setIsInterventionModalOpen(false);
      setInterventionNotes('');
      setBeforeVal('');
      setAfterVal('');
      await fetchData();
    } catch (err: unknown) {
      setInterventionError(err instanceof Error ? err.message : 'Failed to save intervention.');
    } finally {
      setSavingIntervention(false);
    }
  };

  const handleConcludeInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingConclusion(true);
    setConclusionError(null);

    try {
      const updated = await completeInspection(id, {
        decision: selectedDecision,
        outcome_notes: outcomeNotes.trim() || undefined,
        trainer_notes: trainerClosureNotes.trim() || undefined,
      });
      setInspection(updated);
      setIsConclusionModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      setConclusionError(err instanceof Error ? err.message : 'Failed to conclude inspection.');
    } finally {
      setSubmittingConclusion(false);
    }
  };

  const handleCancelInspection = async () => {
    if (!id || !window.confirm('Are you sure you want to cancel this inspection?')) return;
    try {
      const updated = await cancelInspection(id, 'Cancelled by trainer in console');
      setInspection(updated);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel inspection');
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Inspection Detail" subtitle="Loading route data and evidence records..." />
        <div style={{ padding: '1.5rem' }}>
          <TableSkeleton rows={4} cols={5} />
        </div>
      </>
    );
  }

  if (error || !inspection) {
    return (
      <>
        <TopBar title="Inspection Detail" subtitle="Error loading record" />
        <div style={{ padding: '1.5rem' }}>
          <ErrorState message={error || 'Inspection record not found'} onRetry={fetchData} />
        </div>
      </>
    );
  }

  const isInProgress = inspection.status === 'IN_PROGRESS';
  const completedStepsCount = inspection.checklist ? inspection.checklist.filter((s: InspectionStepItem) => s.status === 'COMPLETED').length : 0;
  const skippedStepsCount = inspection.checklist ? inspection.checklist.filter((s: InspectionStepItem) => s.status === 'SKIPPED').length : 0;
  const totalStepsCount = inspection.checklist ? inspection.checklist.length : 0;

  return (
    <>
      <TopBar
        title={`Inspection Route: ${inspection.inspection_id}`}
        subtitle={`Session ${inspection.session_id} | Route Template: ${inspection.template_id || 'Custom Checklist'}`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/trainer/inspections" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              <ArrowLeft size={14} />
              <span>Back to List</span>
            </Link>
            <button
              className="btn btn-secondary"
              onClick={() => downloadInspectionExport(inspection.inspection_id, 'json')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Download size={14} />
              <span>Export JSON</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => downloadInspectionExport(inspection.inspection_id, 'csv')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
        {/* Banner / Header Card */}
        <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {inspection.reason}
                </span>
                <StatusBadge status={inspection.status} />
                {inspection.decision && <StatusBadge status={inspection.decision} />}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <span>Machine: <strong>{inspection.machine_id || '—'}</strong></span>
                <span>Zone: <strong>{inspection.zone_id || '—'}</strong></span>
                <span>Measurement Source: <strong>{inspection.measurement_source || 'MANUAL_OBSERVATION'}</strong></span>
                <span>Machine Operating State: <strong>{inspection.machine_state || 'UNKNOWN'}</strong></span>
                <span>Primary Sensor Health: <strong>{inspection.sensor_health_state || 'UNKNOWN'}</strong></span>
              </div>
            </div>

            {isInProgress && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelInspection}
                  style={{ color: 'var(--danger-text)' }}
                >
                  Cancel Inspection
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsConclusionModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <CheckCircle2 size={15} />
                  <span>Conclude Inspection</span>
                </button>
              </div>
            )}
          </div>

          {inspection.outcome_notes && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-muted)', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Outcome Notes: </span>
              <span style={{ color: 'var(--text-primary)' }}>{inspection.outcome_notes}</span>
            </div>
          )}
        </div>

        {/* Layout Columns: Left (Checklist) & Right (Evidence Quality & Records) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
          
          {/* LEFT: Ordered Checklist Route */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardCheck size={16} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Ordered Inspection Route ({completedStepsCount}/{totalStepsCount} completed, {skippedStepsCount} skipped)
                </span>
              </div>
            </div>

            {/* Checklist Landmark Disclaimer */}
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--border-muted)',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '0.75rem',
              }}
            >
              Note: Checklist reference positions represent visual and mechanical landmarks for the walk-around route. Sensors do not physically measure these exact checklist coordinates.
            </div>

            {/* Steps List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {inspection.checklist && inspection.checklist.map((step: InspectionStepItem, idx: number) => {
                const isEditing = editingStepId === step.step_id;

                return (
                  <div
                    key={step.step_id}
                    style={{
                      border: '1px solid var(--border-muted)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem',
                      backgroundColor: step.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.03)' : 'var(--bg-app)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            #{idx + 1} [{step.step_id}]
                          </span>
                          {step.reference_position && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                              • {step.reference_position}
                            </span>
                          )}
                          <StatusBadge status={step.status} />
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', margin: '0.3rem 0 0.2rem' }}>
                          {step.instruction}
                        </p>
                        {step.observation && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                            Observation: {step.observation}
                          </div>
                        )}
                      </div>

                      {isInProgress && !isEditing && (
                        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingStepId(step.step_id);
                              setStepObservation(step.observation || '');
                            }}
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                          >
                            Update
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Step Update Form */}
                    {isEditing && (
                      <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--border-muted)' }}>
                        <textarea
                          className="form-input"
                          rows={2}
                          placeholder="Record physical inspection observation or notes..."
                          value={stepObservation}
                          onChange={(e) => setStepObservation(e.target.value)}
                          style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setEditingStepId(null)}
                            disabled={savingStep}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleUpdateStepStatus(step.step_id, 'SKIPPED', stepObservation)}
                            disabled={savingStep}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Mark Skipped
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleUpdateStepStatus(step.step_id, 'COMPLETED', stepObservation)}
                            disabled={savingStep}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Mark Completed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Evidence Quality, Recorded Evidence & Interventions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* 1. Evidence Quality Engine Assessment Panel */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Evidence Quality Assessment
                </span>
                {qualityAssessment && <StatusBadge status={qualityAssessment.status} />}
              </div>

              {qualityAssessment ? (
                <div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                    {qualityAssessment.explanation}
                  </p>

                  {qualityAssessment.quality_issues.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger-text)', textTransform: 'uppercase' }}>
                        Quality Issues Found:
                      </span>
                      <ul style={{ paddingLeft: '1.2rem', margin: '0.2rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {qualityAssessment.quality_issues.map((iss: string, i: number) => (
                          <li key={i}>{iss}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {qualityAssessment.missing_evidence_requirements.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--warning-text)', textTransform: 'uppercase' }}>
                        Missing Requirements:
                      </span>
                      <ul style={{ paddingLeft: '1.2rem', margin: '0.2rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {qualityAssessment.missing_evidence_requirements.map((req: string, i: number) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assessment pending.</span>
              )}
            </div>

            {/* 2. Structured Evidence Records */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Evidence Records ({inspection.evidence_items ? inspection.evidence_items.length : 0})
                </span>
                {isInProgress && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsEvidenceModalOpen(true)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus size={12} />
                    <span>Add Evidence</span>
                  </button>
                )}
              </div>

              {inspection.evidence_items && inspection.evidence_items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {inspection.evidence_items.map((ev: InspectionEvidence) => (
                    <div
                      key={ev.evidence_id}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-muted)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ev.evidence_type} [{ev.source}]
                        </span>
                        {ev.value !== null && ev.value !== undefined && (
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {ev.value} {ev.unit || ''}
                          </span>
                        )}
                      </div>
                      {ev.notes && <div style={{ color: 'var(--text-secondary)' }}>{ev.notes}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No evidence records logged yet. Manual observations and readings can be added above.
                </div>
              )}
            </div>

            {/* 3. Corrective Interventions & Before-and-After Comparisons */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Trainer Interventions ({interventions.length})
                </span>
                {isInProgress && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsInterventionModalOpen(true)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus size={12} />
                    <span>Record Intervention</span>
                  </button>
                )}
              </div>

              {interventions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {interventions.map((inv: TrainerIntervention) => (
                    <div
                      key={inv.intervention_id}
                      style={{
                        padding: '0.6rem 0.75rem',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-muted)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inv.category}</span>
                        <StatusBadge status={inv.comparison_outcome} />
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.3rem' }}>{inv.notes}</p>
                      {inv.comparison_notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 600 }}>Observed Window Metric Diff: </span>
                          <span>{inv.comparison_notes}</span>
                          <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                            * Statistical difference between sample windows; does not prove sole causal attribution.
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No corrective interventions recorded for this inspection yet.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* MODAL: Record Evidence */}
      {isEvidenceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Add Inspection Evidence Record
            </h3>
            {evidenceError && <div style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{evidenceError}</div>}
            <form onSubmit={handleAddEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Evidence Type</label>
                <select className="form-select" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
                  <option value="MANUAL_MEASUREMENT">MANUAL_MEASUREMENT</option>
                  <option value="TRAINER_OBSERVATION">TRAINER_OBSERVATION</option>
                  <option value="TELEMETRY_READING">TELEMETRY_READING</option>
                  <option value="SENSOR_HEALTH">SENSOR_HEALTH</option>
                  <option value="BASELINE_REFERENCE">BASELINE_REFERENCE</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Numeric Value (Optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. 2.45" value={evidenceValue} onChange={(e) => setEvidenceValue(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Unit</label>
                  <input type="text" className="form-input" placeholder="e.g. mm/s, bar, °C" value={evidenceUnit} onChange={(e) => setEvidenceUnit(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Observation / Description</label>
                <textarea className="form-input" rows={2} placeholder="Physical observation notes..." value={evidenceNotes} onChange={(e) => setEvidenceNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEvidenceModalOpen(false)} disabled={savingEvidence}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingEvidence}>{savingEvidence ? 'Saving...' : 'Save Evidence'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Corrective Intervention */}
      {isInterventionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Record Corrective Intervention
            </h3>
            {interventionError && <div style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{interventionError}</div>}
            <form onSubmit={handleAddIntervention} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Category</label>
                <select className="form-select" value={interventionCategory} onChange={(e) => setInterventionCategory(e.target.value)}>
                  <option value="WORKHOLDING_ADJUSTMENT">WORKHOLDING_ADJUSTMENT</option>
                  <option value="TOOL_INSPECTION">TOOL_INSPECTION</option>
                  <option value="SPEED_FEED_ADJUSTMENT">SPEED_FEED_ADJUSTMENT</option>
                  <option value="COOLANT_RESTORE">COOLANT_RESTORE</option>
                  <option value="SHUTDOWN_CHECK">SHUTDOWN_CHECK</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Intervention Notes *</label>
                <textarea className="form-input" rows={2} placeholder="Describe actions performed..." value={interventionNotes} onChange={(e) => setInterventionNotes(e.target.value)} required />
              </div>

              <div style={{ borderTop: '1px dashed var(--border-muted)', paddingTop: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Telemetry Window Comparison (Optional)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Feature</label>
                    <input type="text" className="form-input" placeholder="e.g. RMS" value={windowFeature} onChange={(e) => setWindowFeature(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unit</label>
                    <input type="text" className="form-input" placeholder="e.g. mm/s" value={windowUnit} onChange={(e) => setWindowUnit(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pre-Intervention Value</label>
                    <input type="text" className="form-input" placeholder="e.g. 5.2" value={beforeVal} onChange={(e) => setBeforeVal(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Post-Intervention Value</label>
                    <input type="text" className="form-input" placeholder="e.g. 2.1" value={afterVal} onChange={(e) => setAfterVal(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsInterventionModalOpen(false)} disabled={savingIntervention}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingIntervention}>{savingIntervention ? 'Saving...' : 'Record & Compare'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Final Trainer Decision */}
      {isConclusionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Final Inspection Decision
            </h3>
            {conclusionError && <div style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{conclusionError}</div>}
            <form onSubmit={handleConcludeInspection} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  Conclusive Trainer Decision *
                </label>
                <select className="form-select" value={selectedDecision} onChange={(e) => setSelectedDecision(e.target.value as InspectionDecision)}>
                  <option value="CONFIRMED_BY_TRAINER">CONFIRMED_BY_TRAINER</option>
                  <option value="REFUTED_BY_TRAINER">REFUTED_BY_TRAINER</option>
                  <option value="INCONCLUSIVE">INCONCLUSIVE</option>
                  <option value="INSUFFICIENT_EVIDENCE">INSUFFICIENT_EVIDENCE</option>
                </select>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  This records your conclusive finding based on the walk-around checklist and evidence.
                </span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Outcome Notes</label>
                <textarea className="form-input" rows={2} placeholder="Explain the physical root cause or reasons for decision..." value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Trainer Closure Notes</label>
                <textarea className="form-input" rows={2} placeholder="Debrief guidance and trainee instruction..." value={trainerClosureNotes} onChange={(e) => setTrainerClosureNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsConclusionModalOpen(false)} disabled={submittingConclusion}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingConclusion}>{submittingConclusion ? 'Finalizing...' : 'Conclude & Lock'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
