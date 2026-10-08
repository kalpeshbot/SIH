import React from 'react';
import { MapPin, Radio, PlaySquare, AlertTriangle } from 'lucide-react';
import { Zone, Device, SessionRecord, Alert } from '../../api/types';

interface ZoneCardProps {
  zone: Zone;
  devices: Device[];
  sessions: SessionRecord[];
  alerts: Alert[];
}

export const ZoneCard: React.FC<ZoneCardProps> = ({
  zone,
  devices,
  sessions,
  alerts,
}) => {
  const zoneDevices = devices.filter((d) => d.zone_id === zone.zone_id);
  const activeZoneSessions = sessions.filter(
    (s) => (s.status === 'ACTIVE' || s.status === 'PAUSED') && zoneDevices.some((d) => d.device_id === s.device_id)
  );
  const zoneAlerts = alerts.filter(
    (a) => !a.acknowledged && zoneDevices.some((d) => d.device_id === a.device_id)
  );

  const hasDanger = zoneAlerts.some((a) => a.severity === 'DANGER' || a.severity === 'CRITICAL');
  const hasWarning = zoneAlerts.some((a) => a.severity === 'WARNING');

  let stateBorder = 'var(--border-main)';
  let stateBg = 'var(--bg-surface)';
  if (hasDanger) {
    stateBorder = 'var(--state-danger-border)';
    stateBg = 'var(--state-danger-bg)';
  } else if (hasWarning) {
    stateBorder = 'var(--state-warning-border)';
    stateBg = 'var(--state-warning-bg)';
  }

  return (
    <div
      className="card"
      style={{
        borderColor: stateBorder,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="card-header"
        style={{
          backgroundColor: stateBg,
          borderBottom: `1px solid ${stateBorder}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={16} color="var(--primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{zone.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ({zone.zone_id})
          </span>
        </div>

        {zoneAlerts.length > 0 && (
          <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
            <AlertTriangle size={12} /> {zoneAlerts.length} HAZARDS
          </span>
        )}
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {zone.description && (
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {zone.description}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto' }}>
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-main)' }}>
            <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Radio size={12} /> Devices
            </div>
            <div className="value" style={{ fontSize: '1rem', marginTop: '0.2rem' }}>
              {zoneDevices.length}
            </div>
          </div>

          <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-main)' }}>
            <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <PlaySquare size={12} /> Active Sessions
            </div>
            <div className="value" style={{ fontSize: '1rem', marginTop: '0.2rem' }}>
              {activeZoneSessions.length}
            </div>
          </div>
        </div>

        {zoneDevices.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Assigned: {zoneDevices.map((d) => d.device_id).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};
