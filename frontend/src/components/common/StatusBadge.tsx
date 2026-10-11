import React from 'react';
import {
  Check,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Clock,
  Info,
  Pause,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const norm = (status || '').toUpperCase();

  let variantClass = 'badge-neutral';
  let icon: React.ReactNode = <HelpCircle size={11} strokeWidth={2.5} aria-hidden="true" />;

  // 1. Nominal / Healthy / Normal
  if (['ONLINE', 'ACTIVE', 'NORMAL', 'CONNECTED', 'PASS', 'SUFFICIENT', 'IMPROVED', 'RECOVERING'].includes(norm)) {
    variantClass = 'badge-normal';
    icon = <Check size={11} strokeWidth={2.5} aria-hidden="true" />;
  }
  // 2. Refuted by Trainer (Verified Normal)
  else if (norm === 'REFUTED_BY_TRAINER') {
    variantClass = 'badge-normal';
    icon = <Check size={11} strokeWidth={2.5} aria-hidden="true" />;
  }
  // 3. Warning / Degraded / Caution
  else if (['WARNING', 'DEGRADED', 'PERSISTENT', 'FOLLOW_UP_REQUIRED'].includes(norm)) {
    variantClass = 'badge-warning';
    icon = <AlertTriangle size={11} strokeWidth={2.5} aria-hidden="true" />;
  }
  // 4. Paused
  else if (norm === 'PAUSED') {
    variantClass = 'badge-warning';
    icon = <Pause size={11} strokeWidth={2.5} aria-hidden="true" />;
  }
  // 5. Inconclusive / Insufficient Evidence (Distinct from healthy, clearly labeled)
  else if (['INCONCLUSIVE', 'INSUFFICIENT_EVIDENCE', 'INSUFFICIENT'].includes(norm)) {
    variantClass = 'badge-warning';
    icon = <HelpCircle size={11} strokeWidth={2.5} aria-hidden="true" />;
  }
  // 6. Danger / Fault / Critical
  else if (['OFFLINE', 'FAULT', 'DANGER', 'CRITICAL', 'CANCELLED', 'FAIL', 'ESCALATING', 'WORSENED'].includes(norm)) {
    variantClass = 'badge-danger';
    icon = <AlertCircle size={11} strokeWidth={2.5} aria-hidden="true" />;
  }
  // 7. Confirmed Hazard by Trainer
  else if (norm === 'CONFIRMED_BY_TRAINER') {
    variantClass = 'badge-danger';
    icon = <AlertCircle size={11} strokeWidth={2.5} aria-hidden="true" />;
  }
  // 8. Lifecycle / Record / Info
  else if (['COMPLETED', 'INFO', 'TRANSIENT', 'UNCHANGED'].includes(norm)) {
    variantClass = 'badge-info';
    icon = norm === 'COMPLETED'
      ? <Clock size={11} strokeWidth={2.5} aria-hidden="true" />
      : <Info size={11} strokeWidth={2.5} aria-hidden="true" />;
  }
  // 9. Unknown / Unregistered
  else {
    variantClass = 'badge-neutral';
    icon = <HelpCircle size={11} strokeWidth={2.5} aria-hidden="true" />;
  }

  return (
    <span
      className={`badge ${variantClass} ${className}`}
      role="status"
      aria-label={`Status: ${norm || 'UNKNOWN'}`}
    >
      {showIcon && icon}
      <span>{norm || 'UNKNOWN'}</span>
    </span>
  );
};
