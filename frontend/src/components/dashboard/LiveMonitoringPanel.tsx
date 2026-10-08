import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Activity,
  Radio,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { getSessionReadings, getAlerts } from '../../api/endpoints';
import {
  SessionRecord,
  SensorReading,
  Alert,
  Device,
} from '../../api/types';

// ---------------------------------------------------------------
// Connectivity thresholds — same as DevicesPage
// ---------------------------------------------------------------
type ConnStatus = 'CONNECTED' | 'RECENT' | 'OFFLINE' | 'NEVER';

function getConnStatus(lastSeen: string | null | undefined): ConnStatus {
  if (!lastSeen) return 'NEVER';
  const ageMs = Date.now() - new Date(lastSeen).getTime();
  if (ageMs < 30_000) return 'CONNECTED';
  if (ageMs < 300_000) return 'RECENT';
  return 'OFFLINE';
}

function formatAgo(ts: string | null | undefined): string {
  if (!ts) return 'Never';
  const sec = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

function elapsedTimer(startTime: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const SENSOR_COLORS: Record<string, string> = {
  gas_ch4: '#dc2626',
  gas_co: '#d97706',
  vibration: '#0284c7',
  temperature: '#ea580c',
  pressure: '#16a34a',
  default: '#475569',
};

const RECENT_WINDOW = 60; // max readings to show in chart

interface LiveMonitoringPanelProps {
  activeSessions: SessionRecord[];
  allDevices: Device[];
  lastPollTime: Date | null;
  pollError: string | null;
}

export const LiveMonitoringPanel: React.FC<LiveMonitoringPanelProps> = ({
  activeSessions,
  allDevices,
  lastPollTime,
  pollError,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [sessionAlerts, setSessionAlerts] = useState<Alert[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(false);
  const [, setTick] = useState(0);

  // Tick every second for live elapsed timer + "last updated" counter
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-select first active session on load or when list changes
  useEffect(() => {
    if (activeSessions.length === 0) {
      setSelectedSessionId(null);
      setReadings([]);
      setSessionAlerts([]);
      setSelectedSensor('');
      return;
    }
    // Keep selection if still valid
    const stillValid = activeSessions.some((s) => s.id === selectedSessionId);
    if (!stillValid) {
      setSelectedSessionId(activeSessions[0].id);
    }
  }, [activeSessions, selectedSessionId]);

  // Fetch readings + alerts for selected session
  const fetchSessionData = useCallback(async (sessionId: number) => {
    const session = activeSessions.find((s) => s.id === sessionId);
    if (!session) return;
    setDataLoading(true);
    try {
      const [r, a] = await Promise.all([
        getSessionReadings(session.session_id).catch(() => []),
        getAlerts({ session_id: session.session_id, acknowledged: false }).catch(() => []),
      ]);
      setReadings(r.slice(-RECENT_WINDOW));
      setSessionAlerts(a);
      // Auto-select first sensor type if none selected
      const types = Array.from(new Set(r.map((x) => x.sensor_type)));
      setSelectedSensor((prev) => (prev && types.includes(prev) ? prev : types[0] || ''));
    } finally {
      setDataLoading(false);
    }
  }, [activeSessions]);

  // Re-fetch every 3 s when session is selected (aligned to parent poll but separate for session data)
  useEffect(() => {
    if (selectedSessionId === null) return;
    fetchSessionData(selectedSessionId);
    const id = setInterval(() => fetchSessionData(selectedSessionId), 3000);
    return () => clearInterval(id);
  }, [selectedSessionId, fetchSessionData]);

  const selectedSession = activeSessions.find((s) => s.id === selectedSessionId) ?? null;

  // Device for selected session
  const sessionDevice: Device | null = selectedSession
    ? (allDevices.find((d) => d.device_id === selectedSession.device_id) ?? null)
    : null;

  const connStatus: ConnStatus = sessionDevice ? getConnStatus(sessionDevice.last_seen) : 'NEVER';

  // Sensor types present in current data
  const sensorTypes = Array.from(new Set(readings.map((r) => r.sensor_type)));

  // Filter + shape chart data for selected sensor
  const chartData = selectedSensor
    ? readings
        .filter((r) => r.sensor_type === selectedSensor)
        .map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString(),
          value: r.value,
          unit: r.unit,
          status: r.status,
        }))
    : [];

  const latestReading =
    selectedSensor
      ? readings
          .filter((r) => r.sensor_type === selectedSensor)
          .slice(-1)[0] ?? null
      : null;

  const highestAlertSeverity = (() => {
    if (sessionAlerts.some((a) => a.severity === 'CRITICAL')) return 'CRITICAL';
    if (sessionAlerts.some((a) => a.severity === 'DANGER')) return 'DANGER';
    if (sessionAlerts.some((a) => a.severity === 'WARNING')) return 'WARNING';
    return null;
  })();

  // Live indicator state
  type LiveState = 'LIVE' | 'WAITING' | 'OFFLINE' | 'NO_SESSION' | 'ERROR';
  const liveState: LiveState = (() => {
    if (pollError) return 'ERROR';
    if (activeSessions.length === 0) return 'NO_SESSION';
    if (connStatus === 'OFFLINE' || connStatus === 'NEVER') return 'OFFLINE';
    if (readings.length === 0) return 'WAITING';
    return 'LIVE';
  })();

  const liveConfig: Record<LiveState, { dot: string; label: string; color: string }> = {
    LIVE:       { dot: 'var(--state-normal-dot)',   label: 'LIVE',       color: 'var(--state-normal-text)' },
    WAITING:    { dot: 'var(--primary)',              label: 'WAITING',    color: 'var(--primary-text)' },
    OFFLINE:    { dot: 'var(--state-danger-dot)',    label: 'OFFLINE',    color: 'var(--state-danger-text)' },
    NO_SESSION: { dot: 'var(--text-muted)',           label: 'NO SESSION', color: 'var(--text-muted)' },
    ERROR:      { dot: 'var(--state-danger-dot)',    label: 'ERROR',      color: 'var(--state-danger-text)' },
  };
  const lc = liveConfig[liveState];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ─── Panel Header ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} color="var(--primary)" />
          <h2 className="section-title" style={{ margin: 0 }}>Live Monitoring</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Live indicator */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: lc.color,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: lc.dot,
                boxShadow: liveState === 'LIVE' ? `0 0 6px ${lc.dot}` : 'none',
                display: 'inline-block',
              }}
            />
            {lc.label}
          </span>

          {/* Last updated */}
          {lastPollTime && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Updated {formatAgo(lastPollTime.toISOString())}
            </span>
          )}
        </div>
      </div>

      {/* ─── Poll Error Banner ─── */}
      {pollError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--state-danger-bg)',
            border: '1px solid var(--state-danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--state-danger-text)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <WifiOff size={16} />
          <div>
            <strong>Connection Error:</strong> {pollError} — Live monitoring data may be stale.
          </div>
        </div>
      )}

      {/* ─── No Active Sessions State ─── */}
      {activeSessions.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <Activity size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h4 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
            NO ACTIVE SESSIONS
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            No trainees are currently being monitored. Activate a training session to begin live telemetry.
          </p>
        </div>
      ) : (
        <>
          {/* ─── Session Selector (only if more than one active) ─── */}
          {activeSessions.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-main)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                LIVE SESSION:
              </span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                <select
                  className="form-select"
                  value={selectedSessionId ?? ''}
                  onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                  style={{ paddingRight: '2rem', flex: 1, fontSize: '0.85rem' }}
                >
                  {activeSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.trainee_id} — {s.device_id}
                      {s.zone_id ? ` — ${s.zone_id}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', right: '0.6rem', pointerEvents: 'none' }}
                />
              </div>
            </div>
          )}

          {selectedSession && (
            <>
              {/* ─── Danger / Critical Hazard Banner ─── */}
              {(highestAlertSeverity === 'DANGER' || highestAlertSeverity === 'CRITICAL') && (
                <div
                  style={{
                    padding: '0.85rem 1.1rem',
                    backgroundColor: 'var(--state-danger-bg)',
                    border: '2px solid var(--state-danger-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <AlertTriangle size={20} color="var(--state-danger-text)" />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: 'var(--state-danger-text)',
                        letterSpacing: '0.04em',
                        marginBottom: '0.15rem',
                      }}
                    >
                      ACTIVE HAZARD — {highestAlertSeverity}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--state-danger-text)', opacity: 0.85 }}>
                      {sessionAlerts
                        .filter((a) => a.severity === highestAlertSeverity)
                        .slice(0, 1)
                        .map((a) => a.message)
                        .join('')}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Session & Device Overview Row ─── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                {/* Session card */}
                <div
                  className="card"
                  style={{ padding: '0.9rem 1.1rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <Clock size={15} color="var(--primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                      SESSION
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    {selectedSession.session_id}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {elapsedTimer(selectedSession.start_time)}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Started {new Date(selectedSession.start_time).toLocaleTimeString()}
                  </div>
                </div>

                {/* Trainee card */}
                <div className="card" style={{ padding: '0.9rem 1.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <User size={15} color="var(--primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                      TRAINEE
                    </span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.45rem',
                        backgroundColor: 'var(--primary-subtle)',
                        color: 'var(--primary-text)',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--primary-border)',
                      }}
                    >
                      {selectedSession.trainee_id}
                    </span>
                  </div>
                  {selectedSession.zone_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      <MapPin size={13} />
                      Zone: <strong style={{ color: 'var(--text-primary)' }}>{selectedSession.zone_id}</strong>
                    </div>
                  )}
                </div>

                {/* Device card */}
                <div className="card" style={{ padding: '0.9rem 1.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <Radio
                      size={15}
                      color={connStatus === 'CONNECTED' ? 'var(--state-normal-text)' : 'var(--state-danger-text)'}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                      DEVICE
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                    {selectedSession.device_id}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color:
                        connStatus === 'CONNECTED'
                          ? 'var(--state-normal-text)'
                          : connStatus === 'RECENT'
                          ? 'var(--state-warning-text)'
                          : 'var(--state-danger-text)',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor:
                          connStatus === 'CONNECTED'
                            ? 'var(--state-normal-dot)'
                            : connStatus === 'RECENT'
                            ? 'var(--state-warning-dot)'
                            : 'var(--state-danger-dot)',
                      }}
                    />
                    {connStatus === 'CONNECTED'
                      ? 'CONNECTED'
                      : connStatus === 'RECENT'
                      ? 'RECENT'
                      : connStatus === 'NEVER'
                      ? 'NEVER CONNECTED'
                      : 'CONNECTION LOST'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Last heartbeat:{' '}
                    {sessionDevice?.last_seen
                      ? formatAgo(sessionDevice.last_seen)
                      : 'Never'}
                  </div>
                </div>

                {/* Last reading card */}
                <div className="card" style={{ padding: '0.9rem 1.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <Activity size={15} color="var(--primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                      LAST READING
                    </span>
                  </div>
                  {latestReading ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {latestReading.value}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {latestReading.unit}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {formatAgo(latestReading.timestamp)} · {latestReading.sensor_type.toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingTop: '0.25rem' }}>
                      {readings.length === 0 ? 'Waiting for sensor data...' : 'Select a sensor type above'}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Telemetry Graph ─── */}
              <div className="card">
                <div
                  className="card-header"
                  style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={15} color="var(--primary)" />
                    <span className="card-title">LIVE TELEMETRY</span>
                    {dataLoading && (
                      <RefreshCw size={13} color="var(--text-muted)" className="spin" />
                    )}
                  </div>

                  {sensorTypes.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="label">Sensor:</span>
                      <select
                        className="form-select"
                        value={selectedSensor}
                        onChange={(e) => setSelectedSensor(e.target.value)}
                        style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        {sensorTypes.map((st) => (
                          <option key={st} value={st}>
                            {st.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="card-body" style={{ padding: '0.75rem 0.5rem 0.5rem 0' }}>
                  {chartData.length === 0 ? (
                    <div
                      style={{
                        height: '260px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        gap: '0.5rem',
                      }}
                    >
                      <Activity size={24} color="var(--text-muted)" />
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        WAITING FOR SENSOR DATA
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {connStatus === 'OFFLINE' || connStatus === 'NEVER'
                          ? 'Device offline — no telemetry available.'
                          : 'Session active. Waiting for hardware readings to arrive.'}
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 16, left: 8, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" />
                        <XAxis
                          dataKey="time"
                          stroke="var(--text-muted)"
                          fontSize={11}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="var(--text-muted)"
                          fontSize={11}
                          tickLine={false}
                          domain={['auto', 'auto']}
                          width={48}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-main)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)',
                          }}
                          formatter={(
                            value: unknown,
                            _name: string | undefined,
                            item: { payload?: { unit?: string; status?: string } },
                          ) => {
                            const v =
                              typeof value === 'number' ? value.toFixed(3) : String(value ?? '');
                            const unit = item.payload?.unit ?? '';
                            const status = item.payload?.status
                              ? ` [${item.payload.status}]`
                              : '';
                            return [`${v} ${unit}${status}`, selectedSensor.toUpperCase()];
                          }}
                          labelFormatter={(label: string) => `Time: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={selectedSensor.toUpperCase()}
                          stroke={SENSOR_COLORS[selectedSensor] ?? SENSOR_COLORS.default}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 5 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {chartData.length > 0 && (
                  <div
                    style={{
                      padding: '0.5rem 1rem',
                      borderTop: '1px solid var(--border-muted)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Showing last {chartData.length} readings · {selectedSensor.toUpperCase()}</span>
                    {latestReading && (
                      <span>Last: {new Date(latestReading.timestamp).toLocaleTimeString()}</span>
                    )}
                  </div>
                )}
              </div>

              {/* ─── Live Alert Feed ─── */}
              <div className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle
                      size={15}
                      color={sessionAlerts.length > 0 ? 'var(--state-danger-text)' : 'var(--text-muted)'}
                    />
                    <span className="card-title">LIVE EVENTS</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Unacknowledged alerts for selected session
                  </span>
                </div>

                <div className="card-body" style={{ padding: 0 }}>
                  {sessionAlerts.length === 0 ? (
                    <div
                      style={{
                        padding: '1.1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        color: 'var(--state-normal-text)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle size={16} />
                      NO ACTIVE HAZARDS — All session telemetry within normal parameters
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {sessionAlerts
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                        )
                        .map((alert) => {
                          const isDanger =
                            alert.severity === 'DANGER' || alert.severity === 'CRITICAL';
                          const isWarning = alert.severity === 'WARNING';
                          const rowBg = isDanger
                            ? 'var(--state-danger-bg)'
                            : isWarning
                            ? 'var(--state-warning-bg)'
                            : 'var(--bg-surface)';
                          const textColor = isDanger
                            ? 'var(--state-danger-text)'
                            : isWarning
                            ? 'var(--state-warning-text)'
                            : 'var(--text-secondary)';

                          return (
                            <div
                              key={alert.id}
                              style={{
                                padding: '0.75rem 1.25rem',
                                borderBottom: '1px solid var(--border-main)',
                                backgroundColor: rowBg,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.85rem',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.725rem',
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--text-muted)',
                                  whiteSpace: 'nowrap',
                                  paddingTop: '0.1rem',
                                }}
                              >
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                              <div>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: textColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    marginRight: '0.5rem',
                                  }}
                                >
                                  {alert.severity}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {alert.message}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
