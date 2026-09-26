import React from 'react';

export function Badge({ children, variant = 'healthy', pulse = false }) {
  const variantClass = `status-pill-${variant}`;
  return (
    <span className={`status-pill ${variantClass}`}>
      {pulse && <span className="status-indicator-dot" />}
      {children}
    </span>
  );
}
