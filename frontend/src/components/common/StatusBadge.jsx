import React from 'react';

/**
 * StatusBadge component.
 * Displays accurate operational statuses without misleading claims.
 */
export function StatusBadge({ label, variant = 'status', pulse = false, ariaLabel }) {
  const badgeClass = `badge badge-${variant}`;
  return (
    <span
      className={badgeClass}
      role="status"
      aria-label={ariaLabel || label}
    >
      {pulse && <span className="pulse-dot" aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}
