import React, { useEffect, useState, useCallback } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { CreateDeviceModal } from '../components/devices/CreateDeviceModal';
import { getDevices, getZones, createDevice, deleteDevice } from '../api/endpoints';
import { Device, Zone, DeviceCreate } from '../api/types';
import { Radio, Plus, Battery, BatteryCharging, Trash2, Search } from 'lucide-react';

// ---------------------------------------------------------------
// Connectivity Status Logic
// Source of truth: backend `last_seen` field.
// ONLINE  = seen within 30 seconds
// RECENT  = seen within 5 minutes
// OFFLINE = never seen, or silent for 5+ minutes
// ---------------------------------------------------------------
type ConnectivityStatus = 'ONLINE' | 'RECENT' | 'OFFLINE' | 'NEVER';

function getConnectivityStatus(lastSeen: string | null | undefined): ConnectivityStatus {
  if (!lastSeen) return 'NEVER';
  const ageMs = Date.now() - new Date(lastSeen).getTime();
  if (ageMs < 30_000) return 'ONLINE';
  if (ageMs < 300_000) return 'RECENT';
  return 'OFFLINE';
}

function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'Never';
  const ageMs = Date.now() - new Date(lastSeen).getTime();
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const connectivityStyles: Record<ConnectivityStatus, { bg: string; color: string; label: string }> = {
  ONLINE:  { bg: 'var(--state-normal-bg)',  color: 'var(--state-normal-text)',  label: 'Online' },
  RECENT:  { bg: 'var(--state-warning-bg)', color: 'var(--state-warning-text)', label: 'Recent' },
  OFFLINE: { bg: 'var(--state-danger-bg)',  color: 'var(--state-danger-text)',  label: 'Offline' },
  NEVER:   { bg: 'var(--surface-2)',        color: 'var(--text-muted)',          label: 'Never seen' },
};

export const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, setTick] = useState(0); // force re-render so relative timestamps update

  const fetchData = useCallback(async () => {
    try {
      const [devicesData, zonesData] = await Promise.all([
        getDevices(),
        getZones(),
      ]);
      setDevices(devicesData);
      setZones(zonesData);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve device catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh device list every 10 seconds to pick up new last_seen values from backend.
  // Also tick every 5 seconds so relative timestamps ("3s ago") stay live in the UI.
  useEffect(() => {
    const dataInterval = setInterval(fetchData, 10_000);
    const tickInterval = setInterval(() => setTick((t) => t + 1), 5_000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(tickInterval);
    };
  }, [fetchData]);

  const handleCreate = async (data: DeviceCreate) => {
    await createDevice(data);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deletingDevice) return;
    setIsDeleting(true);
    try {
      await deleteDevice(deletingDevice.id);
      setDeletingDevice(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete device.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.zone_id && d.zone_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || d.device_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <>
      <TopBar
        title="Hardware Diagnostic Devices"
        subtitle="Telemetry status and zone assignments for Handheld Probes, Wearables, and Beacons"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
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
                placeholder="Search by device ID or zone..."
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Device Types</option>
              <option value="HANDHELD">Handheld Probe</option>
              <option value="WEARABLE">Wearable</option>
              <option value="BEACON">Fixed Beacon</option>
            </select>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ONLINE">ONLINE</option>
              <option value="OFFLINE">OFFLINE</option>
              <option value="FAULT">FAULT</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            Register Device
          </button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : loading ? (
          <TableSkeleton rows={4} cols={7} />
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            title="No Devices Found"
            description={
              searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No hardware devices match your filter criteria.'
                : 'No hardware diagnostic devices are registered.'
            }
            actionLabel="Register Device"
            onAction={() => setIsCreateOpen(true)}
            icon={<Radio size={36} color="var(--text-muted)" />}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device Identifier</th>
                  <th>Type</th>
                  <th>Reg. Status</th>
                  <th>Connectivity</th>
                  <th>Last Seen</th>
                  <th>Battery</th>
                  <th>Zone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const connectivity = getConnectivityStatus(device.last_seen);
                  const connStyle = connectivityStyles[connectivity];
                  return (
                    <tr key={device.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          <Radio size={14} color="var(--primary)" />
                          {device.device_id}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{device.device_type}</td>
                      <td>
                        <StatusBadge status={device.status} />
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '3px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            background: connStyle.bg,
                            color: connStyle.color,
                          }}
                        >
                          {connStyle.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {formatLastSeen(device.last_seen)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {device.battery != null && device.battery > 90 ? (
                            <BatteryCharging size={14} color="var(--state-normal-text)" />
                          ) : (
                            <Battery size={14} color={device.battery != null && device.battery < 20 ? 'var(--state-danger-text)' : 'var(--text-secondary)'} />
                          )}
                          <span>{device.battery != null ? `${device.battery}%` : '--'}</span>
                        </div>
                      </td>
                      <td>
                        {device.zone_id ? (
                          <span className="mono" style={{ fontSize: '0.85rem' }}>{device.zone_id}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => setDeletingDevice(device)}
                          title="Delete device registration"
                          aria-label={`Delete ${device.device_id}`}
                        >
                          <Trash2 size={13} color="var(--state-danger-text)" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateDeviceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        zones={zones}
      />

      <ConfirmDialog
        isOpen={deletingDevice !== null}
        onClose={() => setDeletingDevice(null)}
        onConfirm={handleDelete}
        title="Delete Hardware Device?"
        message={`Are you sure you want to delete ${deletingDevice?.device_id}? If this device has recorded telemetry readings, the backend will prevent deletion.`}
        confirmLabel="Delete Device"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
};
