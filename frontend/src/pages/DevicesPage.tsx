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
          <TableSkeleton rows={4} cols={6} />
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
                  <th>Form Factor / Type</th>
                  <th>Status</th>
                  <th>Battery</th>
                  <th>Assigned Workshop Zone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        <Radio size={14} color="var(--primary)" />
                        {device.device_id}
                      </div>
                    </td>
                    <td>{device.device_type}</td>
                    <td>
                      <StatusBadge status={device.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {device.battery > 90 ? (
                          <BatteryCharging size={14} color="var(--state-normal-text)" />
                        ) : (
                          <Battery size={14} color={device.battery < 20 ? 'var(--state-danger-text)' : 'var(--text-secondary)'} />
                        )}
                        <span>{device.battery}%</span>
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
                ))}
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
