import React from 'react';
import { PlaySquare, Radio, AlertTriangle, Users } from 'lucide-react';

interface LiveMetricsBarProps {
  activeSessionsCount: number;
  onlineDevicesCount: number;
  openAlertsCount: number;
  traineesCount: number;
}

export const LiveMetricsBar: React.FC<LiveMetricsBarProps> = ({
  activeSessionsCount,
  onlineDevicesCount,
  openAlertsCount,
  traineesCount,
}) => {
  const metrics = [
    {
      label: 'Active Sessions',
      value: activeSessionsCount,
      icon: <PlaySquare size={18} color="var(--primary)" />,
      badge: activeSessionsCount > 0 ? 'LIVE' : 'IDLE',
      badgeClass: activeSessionsCount > 0 ? 'badge-normal' : 'badge-neutral',
    },
    {
      label: 'Online Devices',
      value: onlineDevicesCount,
      icon: <Radio size={18} color="var(--state-normal-text)" />,
      badge: `${onlineDevicesCount} READY`,
      badgeClass: 'badge-normal',
    },
    {
      label: 'Open Hazards',
      value: openAlertsCount,
      icon: <AlertTriangle size={18} color={openAlertsCount > 0 ? 'var(--state-danger-text)' : 'var(--text-muted)'} />,
      badge: openAlertsCount > 0 ? 'REQUIRES ACTION' : 'CLEAR',
      badgeClass: openAlertsCount > 0 ? 'badge-danger' : 'badge-normal',
    },
    {
      label: 'Registered Trainees',
      value: traineesCount,
      icon: <Users size={18} color="var(--text-secondary)" />,
      badge: 'ROSTER',
      badgeClass: 'badge-neutral',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {metrics.map((m, idx) => (
        <div key={idx} className="card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="label">{m.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge ${m.badgeClass}`} style={{ fontSize: '0.65rem' }}>
                {m.badge}
              </span>
              {m.icon}
            </div>
          </div>
          <div className="value">{m.value}</div>
        </div>
      ))}
    </div>
  );
};
