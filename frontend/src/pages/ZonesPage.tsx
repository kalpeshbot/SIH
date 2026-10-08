import React, { useEffect, useState, useCallback } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { ZoneCard } from '../components/zones/ZoneCard';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { getZones, getDevices, getSessions, getAlerts, createZone } from '../api/endpoints';
import { Zone, Device, SessionRecord, Alert, ZoneCreate } from '../api/types';
import { MapPin, Plus } from 'lucide-react';

export const ZonesPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [zoneId, setZoneId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [zonesData, devicesData, sessionsData, alertsData] = await Promise.all([
        getZones(),
        getDevices(),
        getSessions(),
        getAlerts(),
      ]);
      setZones(zonesData);
      setDevices(devicesData);
      setSessions(sessionsData);
      setAlerts(alertsData);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to retrieve workshop zone layout.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneId.trim() || !name.trim()) {
      setCreateError('Zone ID and Name are required.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);
    try {
      const payload: ZoneCreate = {
        zone_id: zoneId.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
      };
      await createZone(payload);
      setZoneId('');
      setName('');
      setDescription('');
      setIsCreateOpen(false);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setCreateError(err.message);
      else setCreateError('Failed to create zone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TopBar
        title="Workshop Training Zones"
        subtitle="Operational layout and environmental monitoring across workshop testing bays"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 className="section-title">Workshop Bays ({zones.length})</h2>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            Define Workshop Zone
          </button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : loading ? (
          <CardSkeleton count={3} />
        ) : zones.length === 0 ? (
          <EmptyState
            title="No Workshop Zones Defined"
            description="Create workshop bays or testing zones to organize hardware devices and sessions."
            actionLabel="Define First Zone"
            onAction={() => setIsCreateOpen(true)}
            icon={<MapPin size={36} color="var(--text-muted)" />}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {zones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                devices={devices}
                sessions={sessions}
                alerts={alerts}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Define Workshop Zone"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" form="create-zone-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Zone'}
            </button>
          </>
        }
      >
        <form id="create-zone-form" onSubmit={handleCreateZone}>
          {createError && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem', backgroundColor: 'var(--state-danger-bg)', color: 'var(--state-danger-text)', border: '1px solid var(--state-danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
              {createError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="zn-id">
              Zone Identifier / Code
            </label>
            <input
              id="zn-id"
              type="text"
              className="form-input mono"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              placeholder="e.g. BAY-D"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="zn-name">
              Zone Name
            </label>
            <input
              id="zn-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pipe Leak Testing Bay"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="zn-desc">
              Description (Optional)
            </label>
            <input
              id="zn-desc"
              type="text"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dedicated high-pressure nitrogen & CH4 simulation area"
            />
          </div>
        </form>
      </Modal>
    </>
  );
};
