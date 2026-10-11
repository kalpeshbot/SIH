import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { CreateInspectionModal } from '../components/inspections/CreateInspectionModal';
import { getInspections, createInspection } from '../api/endpoints';
import { Inspection, InspectionCreate } from '../api/types';
import { ClipboardCheck, Plus, Search, ArrowRight } from 'lucide-react';

export const InspectionsPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchInspections = useCallback(async () => {
    try {
      const data = await getInspections();
      setInspections(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve inspection records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const handleCreateInspection = async (data: InspectionCreate) => {
    await createInspection(data);
    await fetchInspections();
  };

  const filtered = inspections.filter((i) => {
    const matchesSearch =
      i.inspection_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.machine_id && i.machine_id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;
    const matchesDecision = decisionFilter === 'ALL' || i.decision === decisionFilter;

    return matchesSearch && matchesStatus && matchesDecision;
  });

  // Analytics summary counts
  const totalCount = inspections.length;
  const inProgressCount = inspections.filter((i) => i.status === 'IN_PROGRESS').length;
  const completedCount = inspections.filter((i) => i.status === 'COMPLETED').length;
  const confirmedCount = inspections.filter((i) => i.decision === 'CONFIRMED_BY_TRAINER').length;
  const refutedCount = inspections.filter((i) => i.decision === 'REFUTED_BY_TRAINER').length;
  const inconclusiveCount = inspections.filter((i) => i.decision === 'INCONCLUSIVE' || i.decision === 'INSUFFICIENT_EVIDENCE').length;

  return (
    <>
      <TopBar
        title="Evidence-Guided Inspection Management"
        subtitle="Trainer-led mechanical route checklists, evidence corroboration, and hazard decisions"
      />

      <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
        {/* Metric Summary Ribbon */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Inspections
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {totalCount}
            </div>
          </div>

          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              In Progress
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.2rem' }}>
              {inProgressCount}
            </div>
          </div>

          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Concluded
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success-text)', marginTop: '0.2rem' }}>
              {completedCount}
            </div>
          </div>

          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Confirmed Hazards
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--danger-text)', marginTop: '0.2rem' }}>
              {confirmedCount}
            </div>
          </div>

          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Refuted / Nominal
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {refutedCount}
            </div>
          </div>

          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Inconclusive / Insufficient
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--warning-text)', marginTop: '0.2rem' }}>
              {inconclusiveCount}
            </div>
          </div>
        </div>

        {/* Filter & Action Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search inspection, session, machine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2rem' }}
              />
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select
              className="form-select"
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Decisions</option>
              <option value="CONFIRMED_BY_TRAINER">CONFIRMED_BY_TRAINER</option>
              <option value="REFUTED_BY_TRAINER">REFUTED_BY_TRAINER</option>
              <option value="INCONCLUSIVE">INCONCLUSIVE</option>
              <option value="INSUFFICIENT_EVIDENCE">INSUFFICIENT_EVIDENCE</option>
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={15} />
            <span>Start Inspection</span>
          </button>
        </div>

        {/* Content Table */}
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchInspections} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={36} color="var(--text-muted)" />}
            title="No inspection records found"
            description="Initiate an evidence-guided inspection route to verify machinery conditions and checklist steps."
            actionLabel="Start Inspection"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Inspection ID</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Session</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Machine</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Reason</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Checklist Progress</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Decision</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const completedSteps = i.checklist ? i.checklist.filter((s) => s.status === 'COMPLETED').length : 0;
                  const totalSteps = i.checklist ? i.checklist.length : 0;

                  return (
                    <tr key={i.inspection_id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        <Link
                          to={`/trainer/inspections/${i.inspection_id}`}
                          style={{ color: 'var(--primary)', textDecoration: 'none' }}
                        >
                          {i.inspection_id}
                        </Link>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
                        <Link
                          to={`/trainer/sessions/${i.session_id}`}
                          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                        >
                          {i.session_id}
                        </Link>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {i.machine_id || '—'}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.8125rem',
                          color: 'var(--text-primary)',
                          maxWidth: '240px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {i.reason}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 600, color: completedSteps === totalSteps && totalSteps > 0 ? 'var(--success-text)' : 'var(--text-secondary)' }}>
                          {completedSteps} / {totalSteps} steps
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {i.decision ? (
                          <StatusBadge status={i.decision} />
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <StatusBadge status={i.status} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <Link
                          to={`/trainer/inspections/${i.inspection_id}`}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Review</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateInspectionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateInspection}
      />
    </>
  );
};
