import React from 'react';
import { RISK_LEVELS } from '../../utils/constants';

/**
 * RiskBadge component.
 * Displays risk level strictly pairing color with explicit textual indicators (LOW, MEDIUM, HIGH).
 * Adheres to accessibility requirements: never communicates risk via color alone.
 */
export function RiskBadge({ level = 'LOW', showDescription = false }) {
  const normalizedLevel = String(level).toUpperCase();
  const config =
    RISK_LEVELS[normalizedLevel] ||
    (normalizedLevel === 'UNASSESSED' ? RISK_LEVELS.UNKNOWN : RISK_LEVELS.LOW);

  const isUnknown = config.key === 'UNKNOWN';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span
        className={`badge badge-${config.variant}`}
        role="status"
        aria-label={`Assessed risk level: ${config.fullLabel}`}
      >
        <span aria-hidden="true">●</span>
        <strong>{isUnknown ? config.label : `${config.label} RISK`}</strong>
      </span>
      {showDescription && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          {config.description}
        </span>
      )}
    </div>
  );
}
