import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { CreateSessionModal } from '../components/sessions/CreateSessionModal';
import { getSessions, getTrainees, getDevices, getZones, createSession } from '../api/endpoints';
import { SessionRecord, Trainee, Device, Zone, SessionCreate } from '../api/types';
import { PlaySquare, Plus, Search, ArrowRight } from 'lucide-react';

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [traineeFilter, setTraineeFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sessionsData, traineesData, devicesData, zonesData] = await Promise.all([
        getSessions(),
        getTrainees(),
        getDevices(),
        getZones(),
      ]);
      setSessions(sessionsData);
      setTrainees(traineesData);
      setDevices(devicesData);
      setZones(zonesData);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve session records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSession = async (data: SessionCreate) => {
    await createSession(data);
    await fetchData();
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.trainee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.device_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesZone = zoneFilter === 'ALL' || s.zone_id === zoneFilter;
    const matchesTrainee = traineeFilter === 'ALL' || s.trainee_id === traineeFilter;
    return matchesSearch && matchesStatus && matchesZone && matchesTrainee;
  });

  return (
    <>
      <TopBar
        title="Training Sessions Management"
        subtitle="Manage and inspect diagnostic training runs, assessments, and telemetry logs"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {/* Controls Bar: Search, Filter, Create */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search session ID, trainee, device..."
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
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select
              className="form-select"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Zones</option>
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.name} ({z.zone_id})
                </option>
              ))}
            </select>

            <select
              className="form-select"
              value={traineeFilter}
              onChange={(e) => setTraineeFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Trainees</option>
              {trainees.map((t) => (
                <option key={t.trainee_id} value={t.trainee_id}>
                  {t.name} ({t.trainee_id})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            Start Session
          </button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : loading ? (
          <TableSkeleton rows={5} cols={9} />
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            title="No Training Sessions Found"
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'No sessions match your search criteria.'
                : 'No training sessions have been initiated in this environment yet.'
            }
            actionLabel="Start First Session"
            onAction={() => setIsCreateOpen(true)}
            icon={<PlaySquare size={36} color="var(--text-muted)" />}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session Code</th>
                  <th>Trainee ID</th>
                  <th>Device ID</th>
                  <th>Zone ID</th>
                  <th>Module / Type</th>
                  <th>Status</th>
                  <th>Started At</th>
                  <th>Duration / Result</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => {
                  const startTime = new Date(session.start_time);
                  const endTime = session.end_time ? new Date(session.end_time) : null;
                  const durationMins = endTime
                    ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
                    : null;

                  return (
                    <tr key={session.id}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {session.session_id}
                        </span>
                      </td>
                      <td className="mono">{session.trainee_id}</td>
                      <td className="mono">{session.device_id}</td>
                      <td className="mono">{session.zone_id || '—'}</td>
                      <td>{session.session_type}</td>
                      <td>
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>
                        {startTime.toLocaleString()}
                      </td>
                      <td>
                        {session.status === 'COMPLETED' ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {durationMins !== null ? `${durationMins}m` : ''} - {session.result || 'PASS'}
                          </span>
                        ) : session.status === 'ACTIVE' ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary-text)', fontFamily: 'var(--font-mono)' }}>
                            In Progress
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {session.status}
                          </span>
                        )}
                      </td>
                      <td>
                        <Link
                          to={`/sessions/${session.id}`}
                          className="btn btn-secondary btn-sm"
                          title="Inspect session telemetry"
                        >
                          <span>Inspect</span>
                          <ArrowRight size={13} />
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

      <CreateSessionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSession}
        trainees={trainees}
        devices={devices}
        zones={zones}
      />
    </>
  );
};
