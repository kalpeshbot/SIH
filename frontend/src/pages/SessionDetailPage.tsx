import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SensorChart } from '../components/sessions/SensorChart';
import { SessionTimeline } from '../components/sessions/SessionTimeline';
import { ActiveAlertsList } from '../components/dashboard/ActiveAlertsList';
import {
  getSession,
  getSessionReadings,
  getAlerts,
  updateSession,
  acknowledgeAlert,
} from '../api/endpoints';
import { SessionRecord, SensorReading, Alert } from '../api/types';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Download,
  User,
  Radio,
  Clock,
  PlaySquare,
} from 'lucide-react';

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lifecycle modals
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchSessionData = useCallback(async () => {
    if (!id) return;
    try {
      const sessionData = await getSession(parseInt(id, 10));
      setSession(sessionData);

      const [readingsData, alertsData] = await Promise.all([
        getSessionReadings(sessionData.session_id),
        getAlerts({ session_id: sessionData.session_id }),
      ]);
      setReadings(readingsData);
      setAlerts(alertsData);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve session details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSessionData();
    // Auto-poll if session is active
    const timer = setInterval(() => {
      if (session?.status === 'ACTIVE') {
        fetchSessionData();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchSessionData, session?.status]);

  const handleCompleteSession = async () => {
    if (!session) return;
    setIsActionLoading(true);
    try {
      await updateSession(session.id, {
        status: 'COMPLETED',
        result: 'PASS',
        end_time: new Date().toISOString(),
      });
      setIsCompleteConfirmOpen(false);
      await fetchSessionData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!session) return;
    setIsActionLoading(true);
    try {
      await updateSession(session.id, {
        status: 'CANCELLED',
        result: 'CANCELLED_BY_OPERATOR',
        end_time: new Date().toISOString(),
      });
      setIsCancelConfirmOpen(false);
      await fetchSessionData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await acknowledgeAlert(alertId);
      await fetchSessionData();
    } catch (err) {
      console.error(err);
    }
  };

  // Export session data
  const exportData = (format: 'json' | 'csv') => {
    if (!session) return;
    let dataStr = '';
    let filename = `session_${session.session_id}_export.${format}`;

    if (format === 'json') {
      const payload = {
        session,
        telemetry: readings,
        alerts,
        exported_at: new Date().toISOString(),
      };
      dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    } else {
      const headers = 'id,session_id,device_id,timestamp,sensor_type,value,unit,status\n';
      const rows = readings.map((r) =>
        `${r.id},"${r.session_id}","${r.device_id}","${r.timestamp}","${r.sensor_type}",${r.value},"${r.unit}","${r.status}"`
      ).join('\n');
      dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    }

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) {
    return (
      <>
        <TopBar title="Loading Session Details..." />
        <div style={{ padding: '1.5rem' }}>
          <CardSkeleton count={3} />
        </div>
      </>
    );
  }

  if (error || !session) {
    return (
      <>
        <TopBar title="Session Error" />
        <div style={{ padding: '1.5rem' }}>
          <ErrorState message={error || 'Session not found'} onRetry={fetchSessionData} />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/sessions')}
            style={{ marginTop: '1rem' }}
          >
            <ArrowLeft size={14} /> Back to Sessions Catalog
          </button>
        </div>
      </>
    );
  }

  const startTime = new Date(session.start_time);
  const endTime = session.end_time ? new Date(session.end_time) : null;
  const durationText = endTime
    ? `${Math.round((endTime.getTime() - startTime.getTime()) / 60000)} minutes`
    : 'Session in progress';

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <>
      <TopBar
        title={`Session Telemetry - ${session.session_id}`}
        subtitle={`Live diagnostic session inspection for trainee ${session.trainee_id}`}
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Navigation & Lifecycle Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <Link to="/sessions" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back to Sessions
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Export buttons */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => exportData('csv')}
              title="Download raw sensor telemetry as CSV"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => exportData('json')}
              title="Download session object and telemetry as JSON"
            >
              <Download size={14} /> Export JSON
            </button>

            {/* Lifecycle Controls */}
            {session.status === 'ACTIVE' && (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsCompleteConfirmOpen(true)}
                >
                  <CheckCircle size={14} /> Complete Session
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setIsCancelConfirmOpen(true)}
                >
                  <XCircle size={14} /> Cancel Session
                </button>
              </>
            )}
          </div>
        </div>

        {/* Session Metadata Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <PlaySquare size={18} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
                {session.session_id}
              </span>
            </div>
            <StatusBadge status={session.status} />
          </div>

          <div className="card-body">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
              }}
            >
              <div>
                <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <User size={12} /> Trainee
                </span>
                <div style={{ fontWeight: 600, marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                  {session.trainee_id}
                </div>
              </div>

              <div>
                <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Radio size={12} /> Device Assigned
                </span>
                <div style={{ fontWeight: 600, marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                  {session.device_id}
                </div>
              </div>

              <div>
                <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={12} /> Started Time
                </span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                  {startTime.toLocaleString()}
                </div>
              </div>

              <div>
                <span className="label">Duration</span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  {durationText}
                </div>
              </div>

              <div>
                <span className="label">Module Type</span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  {session.session_type}
                </div>
              </div>

              <div>
                <span className="label">Result Assessment</span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', fontWeight: 600 }}>
                  {session.result || 'Pending Completion'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hazard Alerts Specific to this Session */}
        {unacknowledgedAlerts.length > 0 && (
          <ActiveAlertsList
            alerts={unacknowledgedAlerts}
            onAcknowledge={handleAcknowledgeAlert}
          />
        )}

        {/* Sensor Visualizations */}
        <SensorChart readings={readings} />

        {/* Chronological Event Timeline */}
        <SessionTimeline
          session={session}
          readings={readings}
          alerts={alerts}
        />
      </div>

      {/* Confirmation Dialogs for Lifecycle */}
      <ConfirmDialog
        isOpen={isCompleteConfirmOpen}
        onClose={() => setIsCompleteConfirmOpen(false)}
        onConfirm={handleCompleteSession}
        title="Complete Training Session?"
        message={`Mark session ${session.session_id} as completed and record final evaluation assessment.`}
        confirmLabel="Complete Session"
        isDestructive={false}
        isLoading={isActionLoading}
      />

      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelSession}
        title="Cancel Training Session?"
        message={`Stop active telemetry recording and cancel session ${session.session_id}. This action cannot be reversed.`}
        confirmLabel="Cancel Session"
        isDestructive={true}
        isLoading={isActionLoading}
      />
    </>
  );
};
