import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const norm = (status || '').toUpperCase();

  let variantClass = 'badge-neutral';

  if (['ONLINE', 'ACTIVE', 'NORMAL', 'CONNECTED', 'PASS', 'SUFFICIENT', 'IMPROVED', 'RECOVERING', 'REFUTED_BY_TRAINER'].includes(norm)) {
    variantClass = 'badge-normal';
  } else if (['WARNING', 'PAUSED', 'DEGRADED', 'INCONCLUSIVE', 'PERSISTENT', 'FOLLOW_UP_REQUIRED'].includes(norm)) {
    variantClass = 'badge-warning';
  } else if (['OFFLINE', 'FAULT', 'DANGER', 'CRITICAL', 'CANCELLED', 'FAIL', 'INSUFFICIENT', 'INSUFFICIENT_EVIDENCE', 'ESCALATING', 'WORSENED'].includes(norm)) {
    variantClass = 'badge-danger';
  } else if (['COMPLETED', 'INFO', 'TRANSIENT', 'UNCHANGED', 'CONFIRMED_BY_TRAINER'].includes(norm)) {
    variantClass = 'badge-info';
  }


  return (
    <span className={`badge ${variantClass} ${className}`}>
      {norm || 'UNKNOWN'}
    </span>
  );
};
