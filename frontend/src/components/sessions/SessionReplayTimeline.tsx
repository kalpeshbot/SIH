import React, { useEffect, useState, useCallback } from 'react';
import { TimelineRecord } from '../../api/types';
import { getSessionReplay, downloadSessionEvidencePackage } from '../../api/endpoints';
import { StatusBadge } from '../common/StatusBadge';
import {
  Clock,
  Download,
  Filter,
  PlaySquare,
  AlertTriangle,
  ClipboardCheck,
  Wrench,
  Activity,
} from 'lucide-react';

interface SessionReplayTimelineProps {
  sessionId: string;
}

export const SessionReplayTimeline: React.FC<SessionReplayTimelineProps> = ({ sessionId }) => {
  const [records, setRecords] = useState<TimelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordTypeFilter, setRecordTypeFilter] = useState('ALL');

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSessionReplay(sessionId, {
        record_type: recordTypeFilter === 'ALL' ? undefined : recordTypeFilter,
        limit: 150,
      });
      setRecords(res.records);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to load session replay timeline.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, recordTypeFilter]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'SESSION_LIFECYCLE':
        return <PlaySquare size={14} color="var(--primary)" />;
      case 'SAFETY_EVENT':
        return <Activity size={14} color="var(--danger-text)" />;
      case 'ALERT':
        return <AlertTriangle size={14} color="var(--warning-text)" />;
      case 'INSPECTION':
        return <ClipboardCheck size={14} color="var(--primary)" />;
      case 'INTERVENTION':
        return <Wrench size={14} color="var(--success-text)" />;
      default:
        return <Clock size={14} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--border-muted)',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
            Session Chronological Replay Timeline
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ({records.length} records)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Filter selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Filter size={13} color="var(--text-muted)" />
            <select
              className="form-select"
              value={recordTypeFilter}
              onChange={(e) => setRecordTypeFilter(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', height: 'auto' }}
            >
              <option value="ALL">All Event Types</option>
              <option value="SESSION_LIFECYCLE">Session Lifecycle</option>
              <option value="SAFETY_EVENT">Safety Events</option>
              <option value="ALERT">Hazard Alerts</option>
              <option value="INSPECTION">Inspections</option>
              <option value="INTERVENTION">Interventions</option>
            </select>
          </div>

          {/* Export Evidence Package */}
          <button
            className="btn btn-secondary"
            onClick={() => downloadSessionEvidencePackage(sessionId, 'json')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Download size={13} />
            <span>Debrief Package (JSON)</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => downloadSessionEvidencePackage(sessionId, 'csv')}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Download size={13} />
            <span>Debrief Package (CSV)</span>
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Assembling chronological timeline records...
        </div>
      ) : error ? (
        <div style={{ padding: '1rem', color: 'var(--danger-text)', fontSize: '0.8125rem' }}>
          {error}
        </div>
      ) : records.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          No records captured for this session filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {records.map((rec) => {
            const timeStr = rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : '—';
            const dateStr = rec.timestamp ? new Date(rec.timestamp).toLocaleDateString() : '';

            return (
              <div
                key={rec.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.6rem 0.8rem',
                  backgroundColor: 'var(--bg-app)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-muted)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{timeStr}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{dateStr}</span>
                </div>

                <div style={{ marginTop: '0.1rem', flexShrink: 0 }}>
                  {getRecordIcon(rec.record_type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                      {rec.title}
                    </span>
                    {rec.record_type === 'SAFETY_EVENT' && (
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        DERIVED ANOMALY
                      </span>
                    )}
                    {rec.record_type === 'ALERT' && (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        OBSERVED ALERT
                      </span>
                    )}
                    {rec.record_type === 'INSPECTION' && (
                      <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>
                        TRAINER DECISION
                      </span>
                    )}
                    {rec.record_type === 'INTERVENTION' && (
                      <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>
                        TRAINER ACTION
                      </span>
                    )}
                    {rec.record_type === 'SESSION_LIFECYCLE' && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        LIFECYCLE
                      </span>
                    )}
                    <StatusBadge status={rec.status} />
                    {rec.machine_id && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Machine: {rec.machine_id}
                      </span>
                    )}
                  </div>

                  {/* Details summary */}
                  {rec.details && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {rec.details.notes && <div>Notes: {rec.details.notes}</div>}
                      {rec.details.message && <div>Alert: {rec.details.message}</div>}
                      {rec.details.decision && <div>Decision: <strong>{rec.details.decision}</strong></div>}
                      {rec.details.trend_state && (
                        <div>
                          Trend: <strong>{rec.details.trend_state}</strong> (Cycles: {rec.details.persistence_count || 0})
                        </div>
                      )}
                      {rec.details.comparison_outcome && (
                        <div>
                          Outcome: <strong>{rec.details.comparison_outcome}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
