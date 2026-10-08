import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TraineeSelector } from '../components/trainee/TraineeSelector';
import { SafetyStateBanner, TraineeSafetyState } from '../components/trainee/SafetyStateBanner';
import { TraineeSessionCard } from '../components/trainee/TraineeSessionCard';
import { TraineeSensorGrid } from '../components/trainee/TraineeSensorGrid';
import { TraineeAlertsList } from '../components/trainee/TraineeAlertsList';
import {
  getTrainees,
  getSessions,
  getDevices,
  getZones,
  getSessionReadings,
  getAlerts,
} from '../api/endpoints';
import {
  Trainee,
  SessionRecord,
  Device,
  Zone,
  SensorReading,
  Alert,
} from '../api/types';
import { UserCheck, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';

export const TraineePortalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTraineeIdParam = searchParams.get('trainee_id');

  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [traineesLoading, setTraineesLoading] = useState(true);
  const [currentTrainee, setCurrentTrainee] = useState<Trainee | null>(null);

  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [activeZone, setActiveZone] = useState<Zone | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [portalLoading, setPortalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  // 1. Initial fetch of all trainees to resolve query param or selection
  const fetchTraineeList = useCallback(async () => {
    try {
      setTraineesLoading(true);
      const data = await getTrainees();
      setTrainees(data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve trainees list from backend.');
    } finally {
      setTraineesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraineeList();
  }, [fetchTraineeList]);

  // Sync selected trainee from URL query param
  useEffect(() => {
    if (selectedTraineeIdParam && trainees.length > 0) {
      const found = trainees.find((t) => t.trainee_id === selectedTraineeIdParam);
      if (found) {
        setCurrentTrainee(found);
      } else {
        setCurrentTrainee(null);
      }
    } else {
      setCurrentTrainee(null);
    }
  }, [selectedTraineeIdParam, trainees]);

  // 2. Main Trainee Portal Telemetry Polling (Every 3 seconds)
  const pollPortalData = useCallback(async () => {
    if (!currentTrainee) {
      setPortalLoading(false);
      return;
    }

    try {
      const [allSessions, allDevices, allZones] = await Promise.all([
        getSessions(),
        getDevices(),
        getZones(),
      ]);

      // Find active session for current trainee
      const traineeActiveSessions = allSessions.filter(
        (s) => s.trainee_id === currentTrainee.trainee_id && s.status === 'ACTIVE'
      );

      // Sort by start_time descending to get latest active session
      const targetSession = traineeActiveSessions.length > 0
        ? traineeActiveSessions.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
        : null;

      setActiveSession(targetSession);

      if (targetSession) {
        // Resolve associated device
        const dev = allDevices.find((d) => d.device_id === targetSession.device_id) || null;
        setActiveDevice(dev);

        // Resolve zone
        const targetZoneId = targetSession.zone_id || dev?.zone_id;
        const zn = targetZoneId ? allZones.find((z) => z.zone_id === targetZoneId) || null : null;
        setActiveZone(zn);

        // Fetch readings & active unacknowledged alerts for this session
        const [readingsData, alertsData] = await Promise.all([
          getSessionReadings(targetSession.session_id).catch(() => []),
          getAlerts({ session_id: targetSession.session_id, acknowledged: false }).catch(() => []),
        ]);

        setReadings(readingsData);
        setAlerts(alertsData);
      } else {
        setActiveDevice(null);
        setActiveZone(null);
        setReadings([]);
        setAlerts([]);
      }

      setError(null);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to connect to safety monitoring server. Follow established workshop safety procedures.');
      }
    } finally {
      setPortalLoading(false);
    }
  }, [currentTrainee]);

  useEffect(() => {
    if (!currentTrainee) return;
    setPortalLoading(true);
    pollPortalData();

    const interval = setInterval(pollPortalData, 3000);
    const tickInterval = setInterval(() => setTick((t) => t + 1), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(tickInterval);
    };
  }, [currentTrainee, pollPortalData]);

  // 3. Safety State Calculation Engine
  const computeSafetyState = (): { state: TraineeSafetyState; alertMsg?: string } => {
    // If backend error / network failure
    if (error) {
      return { state: 'OFFLINE' };
    }

    // No active session
    if (!activeSession) {
      return { state: 'NO_SESSION' };
    }

    // Check device online status (seen within 30s)
    const isDeviceConnected = (() => {
      if (!activeDevice) return false;
      if (activeDevice.status === 'OFFLINE') return false;
      if (!activeDevice.last_seen) return false;
      const ageMs = Date.now() - new Date(activeDevice.last_seen).getTime();
      return ageMs < 30_000;
    })();

    if (!isDeviceConnected) {
      return { state: 'OFFLINE' };
    }

    // Check alerts severity
    const criticalOrDanger = alerts.find((a) => a.severity === 'CRITICAL' || a.severity === 'DANGER');
    if (criticalOrDanger) {
      return { state: 'DANGER', alertMsg: criticalOrDanger.message };
    }

    const warning = alerts.find((a) => a.severity === 'WARNING');
    if (warning) {
      return { state: 'WARNING', alertMsg: warning.message };
    }

    // Check if 0 readings exist
    if (readings.length === 0) {
      return { state: 'WAITING_FOR_DATA' };
    }

    // All clear
    return { state: 'NORMAL' };
  };

  const handleSelectTrainee = (trainee: Trainee) => {
    setSearchParams({ trainee_id: trainee.trainee_id });
  };

  const handleSwitchTrainee = () => {
    setSearchParams({});
    setCurrentTrainee(null);
  };

  // If no trainee is selected in URL, display Trainee Selector View
  if (!currentTrainee) {
    return (
      <div style={{ flex: 1, backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center' }}>
        <TraineeSelector
          trainees={trainees}
          loading={traineesLoading}
          onSelectTrainee={handleSelectTrainee}
        />
      </div>
    );
  }

  const { state: safetyState, alertMsg } = computeSafetyState();

  const formatSecondsAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    return `${sec}s ago`;
  };

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-app)', padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* Top Profile Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-main)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-subtle)',
                border: '1px solid var(--primary-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentTrainee.name}
                </h2>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.45rem',
                    backgroundColor: 'var(--primary-subtle)',
                    color: 'var(--primary-text)',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--primary-border)',
                  }}
                >
                  {currentTrainee.trainee_id}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Trainee Profile Active
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={pollPortalData}
              className="btn btn-secondary btn-sm"
              disabled={portalLoading}
              style={{ fontSize: '0.8rem', gap: '0.35rem' }}
            >
              <RefreshCw size={13} className={portalLoading ? 'spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleSwitchTrainee}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', gap: '0.35rem' }}
            >
              <ArrowLeft size={13} />
              Switch Trainee
            </button>
          </div>
        </div>

        {/* Error Banner if Backend Unreachable */}
        {error && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--state-danger-bg)',
              border: '1px solid var(--state-danger-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--state-danger-text)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <AlertCircle size={20} />
            <div style={{ flex: 1, fontSize: '0.875rem' }}>
              <strong>Backend Connectivity Issue:</strong> {error}
            </div>
          </div>
        )}

        {/* 1. Primary Safety State Banner */}
        <SafetyStateBanner state={safetyState} activeAlertMessage={alertMsg} />

        {/* 2. Active Session & Device Overview */}
        <TraineeSessionCard
          session={activeSession}
          device={activeDevice}
          zone={activeZone}
        />

        {/* 3. Active Session Alerts */}
        {activeSession && <TraineeAlertsList alerts={alerts} />}

        {/* 4. Real Sensor Telemetry Grid */}
        <TraineeSensorGrid readings={readings} sessionActive={!!activeSession} />

        {/* Telemetry Status Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-main)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.775rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: activeSession ? 'var(--state-normal-dot)' : 'var(--text-muted)',
                boxShadow: activeSession ? '0 0 5px var(--state-normal-dot)' : 'none',
              }}
            />
            <span>
              {activeSession ? 'Live Telemetry Cycle Active (3s)' : 'Idle — Awaiting Active Training Session'}
            </span>
          </div>

          <div>
            Last updated: <strong>{formatSecondsAgo(lastUpdated)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
