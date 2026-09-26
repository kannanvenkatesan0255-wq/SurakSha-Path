import React from 'react';

/**
 * Backward-compatible Badge component mapped to Phase 3 design tokens.
 */
export function Badge({ children, variant = 'status', pulse = false }) {
  const variantClass = `badge badge-${variant}`;
  return (
    <span className={variantClass}>
      {pulse && <span className="pulse-dot" />}
      {children}
    </span>
  );
}
