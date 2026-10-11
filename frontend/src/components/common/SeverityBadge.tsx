import React from 'react';
import { AlertSeverity } from '../../api/types';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface SeverityBadgeProps {
  severity: AlertSeverity | string;
  className?: string;
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className = '',
  showIcon = true,
}) => {
  const norm = (severity || '').toUpperCase();

  let variantClass = 'badge-neutral';
  let icon: React.ReactNode = null;

  if (norm === 'INFO') {
    variantClass = 'badge-info';
    icon = <Info size={11} strokeWidth={2.5} aria-hidden="true" />;
  } else if (norm === 'WARNING') {
    variantClass = 'badge-warning';
    icon = <AlertTriangle size={11} strokeWidth={2.5} aria-hidden="true" />;
  } else if (norm === 'DANGER' || norm === 'CRITICAL' || norm === 'FAULT') {
    variantClass = 'badge-danger';
    icon = <AlertCircle size={11} strokeWidth={2.5} aria-hidden="true" />;
  }

  return (
    <span
      className={`badge ${variantClass} ${className}`}
      role="status"
      aria-label={`Severity: ${norm}`}
    >
      {showIcon && icon}
      <span>{norm}</span>
    </span>
  );
};
