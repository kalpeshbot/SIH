import React, { useEffect, useState, useCallback } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { AlertDetailModal } from '../components/alerts/AlertDetailModal';
import { getAlerts, acknowledgeAlert } from '../api/endpoints';
import { Alert } from '../api/types';
import { useSystem } from '../context/SystemContext';
import { AlertTriangle, CheckCircle, Search } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { refreshSystem } = useSystem();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [ackFilter, setAckFilter] = useState('ALL');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getAlerts();
      setAlerts(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve hazard alert records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      await fetchData();
      await refreshSystem();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.alert_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchesAck =
      ackFilter === 'ALL' ||
      (ackFilter === 'UNACK' && !a.acknowledged) ||
      (ackFilter === 'ACK' && a.acknowledged);
    return matchesSearch && matchesSeverity && matchesAck;
  });

  return (
    <>
      <TopBar
        title="Safety Hazards & Alerts Log"
        subtitle="Full audit trail of hazard threshold breaches, sensor anomalies, and operator acknowledgments"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {/* Filters */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search alerts by message, session, or device ID..."
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
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="DANGER">DANGER</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
            </select>

            <select
              className="form-select"
              value={ackFilter}
              onChange={(e) => setAckFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All States</option>
              <option value="UNACK">Unacknowledged</option>
              <option value="ACK">Acknowledged</option>
            </select>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title="No Hazard Alerts Recorded"
            description={
              searchQuery || severityFilter !== 'ALL' || ackFilter !== 'ALL'
                ? 'No alerts match your current filter parameters.'
                : 'No hazard events have been triggered by the Alert Engine.'
            }
            icon={<AlertTriangle size={36} color="var(--text-muted)" />}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Severity</th>
                  <th>Hazard Type</th>
                  <th>Message</th>
                  <th>Session ID</th>
                  <th>Device ID</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    style={{
                      backgroundColor:
                        !alert.acknowledged && (alert.severity === 'DANGER' || alert.severity === 'CRITICAL')
                          ? 'var(--state-danger-bg)'
                          : 'transparent',
                    }}
                  >
                    <td className="mono" style={{ fontWeight: 600 }}>
                      #{alert.id}
                    </td>
                    <td>
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{alert.alert_type}</td>
                    <td style={{ fontWeight: 500 }}>{alert.message}</td>
                    <td className="mono">{alert.session_id}</td>
                    <td className="mono">{alert.device_id}</td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>
                    <td>
                      {alert.acknowledged ? (
                        <span className="badge badge-normal" style={{ fontSize: '0.7rem' }}>
                          ACKNOWLEDGED
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          Inspect
                        </button>
                        {!alert.acknowledged && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            title="Acknowledge alert"
                          >
                            <CheckCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
