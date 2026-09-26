import React from 'react';

/**
 * MetricDisplay component.
 * Reusable visual metric component designed for Safety Score, Confidence, Travel Time, Distance, etc.
 * Uses tabular numbers for cartographic precision.
 */
export function MetricDisplay({
  label,
  value,
  unit,
  subtext,
  variant = 'default', // 'default', 'safety', 'confidence', 'warning', 'info'
  size = 'md',        // 'sm', 'md', 'lg'
  icon,
}) {
  let valueColor = 'var(--color-text-primary)';
  let accentBorder = 'transparent';

  if (variant === 'safety') {
    valueColor = 'var(--color-risk-low-text)';
    accentBorder = 'var(--color-risk-low)';
  } else if (variant === 'confidence') {
    valueColor = 'var(--color-confidence-text)';
    accentBorder = 'var(--color-confidence)';
  } else if (variant === 'warning') {
    valueColor = 'var(--color-risk-medium-text)';
    accentBorder = 'var(--color-risk-medium)';
  } else if (variant === 'info') {
    valueColor = '#60a5fa';
    accentBorder = 'var(--color-brand-blue)';
  }

  const fontSizeMap = {
    sm: { value: '1.25rem', label: '0.72rem' },
    md: { value: '1.65rem', label: '0.78rem' },
    lg: { value: '2.1rem', label: '0.85rem' },
  };

  const currentSize = fontSizeMap[size] || fontSizeMap.md;

  return (
    <div
      style={{
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border-subtle)',
        borderLeft: accentBorder !== 'transparent' ? `3px solid ${accentBorder}` : '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
        <span style={{ fontSize: currentSize.label, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {icon && <span aria-hidden="true" style={{ fontSize: '0.9rem' }}>{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span
          className="tabular-numbers"
          style={{
            fontSize: currentSize.value,
            fontWeight: 700,
            color: valueColor,
            lineHeight: 1.1,
          }}
        >
          {value !== undefined && value !== null ? value : '—'}
        </span>
        {unit && (
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}
