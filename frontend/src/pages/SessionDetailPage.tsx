import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SensorChart } from '../components/sessions/SensorChart';
import { SessionTimeline } from '../components/sessions/SessionTimeline';
import { SessionAnalyticsCard } from '../components/sessions/SessionAnalyticsCard';
import { SessionReportModal } from '../components/sessions/SessionReportModal';
import { ActiveAlertsList } from '../components/dashboard/ActiveAlertsList';
import {
  getSession,
  getSessionReadings,
  getAlerts,
  getDevices,
  getSessionAnalytics,
  updateSession,
  acknowledgeAlert,
  downloadSessionExport,
} from '../api/endpoints';
import { SessionRecord, SensorReading, Alert, Device, SessionAnalytics } from '../api/types';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Download,
  User,
  Radio,
  Clock,
  PlaySquare,
  MapPin,
  FileText,
} from 'lucide-react';

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchSessionData = useCallback(async () => {
    if (!id) return;
    try {
      const sessionData = await getSession(parseInt(id, 10));
      setSession(sessionData);

      const [readingsData, alertsData, devicesData, analyticsData] = await Promise.all([
        getSessionReadings(sessionData.session_id),
        getAlerts({ session_id: sessionData.session_id }),
        getDevices(),
        getSessionAnalytics(sessionData.id),
      ]);
      setReadings(readingsData);
      setAlerts(alertsData);
      setAnalytics(analyticsData);
      const sessionDevice = devicesData.find((d: Device) => d.device_id === sessionData.device_id) || null;
      setDevice(sessionDevice);
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
  const durationText = analytics?.session.duration_formatted || (session.end_time
    ? `${Math.round((new Date(session.end_time).getTime() - startTime.getTime()) / 60000)} minutes`
    : 'In progress');

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
            {/* Session Report View */}
            {analytics && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsReportOpen(true)}
                title="View printable trainer report"
              >
                <FileText size={14} /> View Session Report
              </button>
            )}

            {/* Export buttons */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => downloadSessionExport(session.session_id, 'csv')}
              title="Download session summary and telemetry as CSV"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => downloadSessionExport(session.session_id, 'json')}
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

        {/* Session Summary Metadata Card */}
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
                  {session.device_id} ({device?.device_type || 'HANDHELD'})
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
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', fontWeight: 600, color: 'var(--primary-text)' }}>
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
                <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={12} /> Zone
                </span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                  {session.zone_id || 'No zone assigned'}
                </div>
              </div>

              {device && (
                <div>
                  <span className="label">Device Status / Firmware</span>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    <StatusBadge status={device.status} />
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      v{device.firmware_version || '1.0.0'}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <span className="label">Result Assessment</span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', fontWeight: 600 }}>
                  {session.result || 'Pending Completion'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Summary Card: Readings & Alerts Breakdown */}
        {analytics && (
          <SessionAnalyticsCard
            readingStats={analytics.reading_stats}
            alertStats={analytics.alert_stats}
          />
        )}

        {/* Active Hazard Alerts List */}
        {unacknowledgedAlerts.length > 0 ? (
          <ActiveAlertsList
            alerts={unacknowledgedAlerts}
            onAcknowledge={handleAcknowledgeAlert}
          />
        ) : (
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No unacknowledged alerts.
            </p>
          </div>
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

      {/* Trainer Printable Session Report Modal */}
      {analytics && (
        <SessionReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          analytics={analytics}
        />
      )}

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

