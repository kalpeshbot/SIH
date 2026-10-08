import React, { useEffect, useState, useCallback } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { LiveMetricsBar } from '../components/dashboard/LiveMetricsBar';
import { ActiveAlertsList } from '../components/dashboard/ActiveAlertsList';
import { ActiveSessionsGrid } from '../components/dashboard/ActiveSessionsGrid';
import { DeviceStatusOverview } from '../components/dashboard/DeviceStatusOverview';
import { LiveMonitoringPanel } from '../components/dashboard/LiveMonitoringPanel';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { AlertDetailModal } from '../components/alerts/AlertDetailModal';
import {
  getSessions,
  getDevices,
  getAlerts,
  getTrainees,
  acknowledgeAlert,
} from '../api/endpoints';
import { SessionRecord, Device, Alert, Trainee } from '../api/types';
import { useSystem } from '../context/SystemContext';
import { ShieldAlert } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { refreshSystem } = useSystem();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sessionsData, devicesData, alertsData, traineesData] = await Promise.all([
        getSessions(),
        getDevices(),
        getAlerts({ acknowledged: false }),
        getTrainees(),
      ]);
      setSessions(sessionsData);
      setDevices(devicesData);
      setAlerts(alertsData);
      setTrainees(traineesData);
      setError(null);
      setLastPollTime(new Date());
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve operational telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      await fetchData();
      await refreshSystem();
    } catch (err: unknown) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE' || s.status === 'PAUSED');
  const onlineDevices = devices.filter((d) => d.status === 'ONLINE');

  return (
    <>
      <TopBar
        title="Training Safety Operations Dashboard"
        subtitle="Live monitoring of active trainee sessions, connected sensors, and hazard alerts"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {/* Contextual Safety Disclaimer */}
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.65rem 1rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-main)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ShieldAlert size={15} color="var(--primary)" />
          <span>
            <strong>Prototype Environment:</strong> Sensor readings and hazard alerts are intended for vocational training and demonstration. This system is not a certified life-safety device.
          </span>
        </div>

        {error && !loading ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Live Metrics Overview */}
            <LiveMetricsBar
              activeSessionsCount={activeSessions.length}
              onlineDevicesCount={onlineDevices.length}
              openAlertsCount={alerts.length}
              traineesCount={trainees.length}
            />

            {/* ─── LIVE MONITORING PANEL ─── */}
            <LiveMonitoringPanel
              activeSessions={activeSessions}
              allDevices={devices}
              lastPollTime={lastPollTime}
              pollError={error}
            />

            {/* Urgent Hazards Section */}
            <ActiveAlertsList
              alerts={alerts}
              onAcknowledge={handleAcknowledge}
              onSelectAlert={setSelectedAlert}
            />

            {/* Operational Grid: Active Sessions & Connected Devices */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h2 className="section-title">Active Training Sessions ({activeSessions.length})</h2>
                </div>
                <ActiveSessionsGrid sessions={sessions} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h2 className="section-title">Hardware Devices ({devices.length})</h2>
                </div>
                <DeviceStatusOverview devices={devices} />
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDetailModal
        alert={selectedAlert}
        isOpen={selectedAlert !== null}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={handleAcknowledge}
      />
    </>
  );
};
