import React from 'react';
import { AlertSeverity } from '../../api/types';

interface SeverityBadgeProps {
  severity: AlertSeverity | string;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  const norm = (severity || '').toUpperCase();

  let variantClass = 'badge-neutral';
  if (norm === 'INFO') variantClass = 'badge-info';
  else if (norm === 'WARNING') variantClass = 'badge-warning';
  else if (norm === 'DANGER' || norm === 'CRITICAL') variantClass = 'badge-danger';

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {norm}
    </span>
  );
};
