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
      isLive: activeSessionsCount > 0,
    },
    {
      label: 'Online Devices',
      value: onlineDevicesCount,
      icon: <Radio size={18} color="var(--state-normal-text)" />,
      badge: `${onlineDevicesCount} READY`,
      badgeClass: 'badge-normal',
      isLive: false,
    },
    {
      label: 'Open Hazards',
      value: openAlertsCount,
      icon: <AlertTriangle size={18} color={openAlertsCount > 0 ? 'var(--state-danger-text)' : 'var(--text-muted)'} />,
      badge: openAlertsCount > 0 ? 'REQUIRES ACTION' : 'CLEAR',
      badgeClass: openAlertsCount > 0 ? 'badge-danger' : 'badge-normal',
      isLive: false,
    },
    {
      label: 'Registered Trainees',
      value: traineesCount,
      icon: <Users size={18} color="var(--text-secondary)" />,
      badge: 'ROSTER',
      badgeClass: 'badge-neutral',
      isLive: false,
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
        <div key={idx} className="card fade-in" style={{ padding: '0.85rem 1rem', animationDelay: `${idx * 60}ms` }} role="status" aria-label={`${m.label}: ${m.value}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="label">{m.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge ${m.badgeClass}`} style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {m.isLive && (
                  <span
                    className="pulse-dot"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--state-normal-dot)',
                      display: 'inline-block',
                    }}
                  />
                )}
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

