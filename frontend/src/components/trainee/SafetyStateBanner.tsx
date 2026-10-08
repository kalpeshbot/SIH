import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  WifiOff,
  UserX,
  Activity,
  Wrench,
} from 'lucide-react';

export type TraineeSafetyState =
  | 'NO_SESSION'
  | 'OFFLINE'
  | 'FAULT'
  | 'DANGER'
  | 'WARNING'
  | 'WAITING_FOR_DATA'
  | 'NORMAL';

interface SafetyStateBannerProps {
  state: TraineeSafetyState;
  activeAlertMessage?: string;
}

export const SafetyStateBanner: React.FC<SafetyStateBannerProps> = ({
  state,
  activeAlertMessage,
}) => {
  const getConfig = () => {
    switch (state) {
      case 'DANGER':
        return {
          title: 'DANGER — HAZARD DETECTED',
          subtitle: activeAlertMessage || 'STOP WORK IMMEDIATELY. Follow trainer instructions and move away from hazard area.',
          icon: <AlertTriangle size={36} color="var(--state-danger-text)" />,
          bg: 'var(--state-danger-bg)',
          border: 'var(--state-danger-border)',
          textColor: 'var(--state-danger-text)',
          pulseColor: 'var(--state-danger-dot)',
        };
      case 'WARNING':
        return {
          title: 'WARNING — ELEVATED HAZARD',
          subtitle: activeAlertMessage || 'Elevated hazard detected. Follow trainer instructions.',
          icon: <AlertCircle size={36} color="var(--state-warning-text)" />,
          bg: 'var(--state-warning-bg)',
          border: 'var(--state-warning-border)',
          textColor: 'var(--state-warning-text)',
          pulseColor: 'var(--state-warning-dot)',
        };
      case 'OFFLINE':
        return {
          title: 'CONNECTION LOST',
          subtitle: 'Monitoring device is offline or disconnected. Follow established workshop safety procedures and contact your trainer.',
          icon: <WifiOff size={36} color="var(--state-danger-text)" />,
          bg: 'var(--state-danger-bg)',
          border: 'var(--state-danger-border)',
          textColor: 'var(--state-danger-text)',
          pulseColor: 'var(--state-danger-dot)',
        };
      case 'FAULT':
        return {
          title: 'SYSTEM CHECK REQUIRED',
          subtitle: 'Monitoring system or sensor fault reported. Contact your trainer before continuing work.',
          icon: <Wrench size={36} color="var(--state-warning-text)" />,
          bg: 'var(--state-warning-bg)',
          border: 'var(--state-warning-border)',
          textColor: 'var(--state-warning-text)',
          pulseColor: 'var(--state-warning-dot)',
        };
      case 'NO_SESSION':
        return {
          title: 'NO ACTIVE SESSION',
          subtitle: 'You are not currently in an active training session. Monitoring is not active.',
          icon: <UserX size={36} color="var(--text-muted)" />,
          bg: 'var(--state-neutral-bg)',
          border: 'var(--border-main)',
          textColor: 'var(--text-primary)',
          pulseColor: 'var(--text-muted)',
        };
      case 'WAITING_FOR_DATA':
        return {
          title: 'WAITING FOR SENSOR DATA',
          subtitle: 'Session is active and device is connected. Awaiting telemetry readings from sensors...',
          icon: <Activity size={36} color="var(--primary)" />,
          bg: 'var(--primary-subtle)',
          border: 'var(--primary-border)',
          textColor: 'var(--primary-text)',
          pulseColor: 'var(--primary)',
        };
      case 'NORMAL':
      default:
        return {
          title: 'ALL SYSTEMS NORMAL',
          subtitle: 'Safety monitoring active. All sensor telemetry is within safe operating thresholds.',
          icon: <ShieldCheck size={36} color="var(--state-normal-text)" />,
          bg: 'var(--state-normal-bg)',
          border: 'var(--state-normal-border)',
          textColor: 'var(--state-normal-text)',
          pulseColor: 'var(--state-normal-dot)',
        };
    }
  };

  const config = getConfig();

  return (
    <div
      style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: config.bg,
        border: `2px solid ${config.border}`,
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '0.15rem' }}>{config.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: config.textColor,
            }}
          >
            {config.title}
          </h2>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: config.pulseColor,
              display: 'inline-block',
              boxShadow: `0 0 6px ${config.pulseColor}`,
            }}
          />
        </div>
        <p style={{ margin: 0, fontSize: '0.925rem', color: config.textColor, opacity: 0.9, lineHeight: 1.5 }}>
          {config.subtitle}
        </p>
      </div>
    </div>
  );
};
