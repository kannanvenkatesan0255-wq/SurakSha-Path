import React from 'react';

/**
 * RoutePreferenceSelector component.
 * Implements accessible selectable cards for FASTEST, BALANCED, and SAFEST preferences.
 * Adheres strictly to Task 6 requirements without false guarantees.
 */
export function RoutePreferenceSelector({ value = 'BALANCED', onChange }) {
  const options = [
    {
      key: 'FASTEST',
      name: 'Fastest',
      icon: '⚡',
      badge: 'MIN TIME',
      description: 'Prioritize lower estimated travel duration using primary arterial roads.',
      tradeOffHint: 'May include dimly lit underpasses or isolated flyover stretches.',
    },
    {
      key: 'BALANCED',
      name: 'Balanced',
      icon: '⚖️',
      badge: 'RECOMMENDED',
      description: 'Balance travel time with assessed safety evidence and illumination.',
      tradeOffHint: 'Adds minor travel time (~1–3 min) to divert around unmonitored alleys.',
    },
    {
      key: 'SAFEST',
      name: 'Safest',
      icon: '🛡️',
      badge: 'MAX EVIDENCE',
      description: 'Prioritize lower assessed route risk based on available evidence.',
      tradeOffHint: 'Selects active commercial corridors with continuous lighting and CCTV.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
        <span className="form-label" style={{ margin: 0, minWidth: 0 }}>
          Route Selection Preference
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', minWidth: 0 }}>
          Guides path prioritization; not a safety guarantee
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Route selection preference"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--space-2)',
        }}
      >
        {options.map((opt) => {
          const isSelected = value === opt.key;
          return (
            <div
              key={opt.key}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onChange(opt.key)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onChange(opt.key);
                }
              }}
              style={{
                background: isSelected ? 'var(--color-surface-elevated)' : 'var(--color-surface-card)',
                border: isSelected ? '2px solid var(--color-brand-blue)' : '1px solid var(--color-border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem' }} aria-hidden="true">{opt.icon}</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: isSelected ? '#93c5fd' : 'var(--color-text-muted)',
                    background: 'var(--color-surface-panel)',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  {opt.badge}
                </span>
              </div>

              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {opt.name}
              </div>

              <p style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.35 }}>
                {opt.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
