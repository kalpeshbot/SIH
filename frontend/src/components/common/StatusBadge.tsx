import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const norm = (status || '').toUpperCase();

  let variantClass = 'badge-neutral';

  if (['ONLINE', 'ACTIVE', 'NORMAL', 'CONNECTED', 'PASS'].includes(norm)) {
    variantClass = 'badge-normal';
  } else if (['WARNING', 'PAUSED'].includes(norm)) {
    variantClass = 'badge-warning';
  } else if (['OFFLINE', 'FAULT', 'DANGER', 'CRITICAL', 'CANCELLED', 'FAIL'].includes(norm)) {
    variantClass = 'badge-danger';
  } else if (['COMPLETED', 'INFO'].includes(norm)) {
    variantClass = 'badge-info';
  }

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {norm || 'UNKNOWN'}
    </span>
  );
};
