import React from 'react';

/**
 * JourneyDateTimeControls component.
 * Provides accessible date and departure-time selection.
 * Prevents past dates and includes quick contextual time shortcuts.
 */
export function JourneyDateTimeControls({
  dateValue,
  onDateChange,
  timeValue,
  onTimeChange,
  dateError,
}) {
  // Compute minimum date as today in local YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const quickTimes = [
    { label: 'Now', time: new Date().toTimeString().slice(0, 5) },
    { label: 'Dusk (18:30)', time: '18:30' },
    { label: 'Night (21:30)', time: '21:30' },
    { label: 'Late (23:45)', time: '23:45' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        {/* Date Input */}
        <div>
          <label htmlFor="journey-date-input" className="form-label">
            Journey Date
          </label>
          <input
            id="journey-date-input"
            type="date"
            value={dateValue || todayStr}
            min={todayStr}
            onChange={(e) => onDateChange(e.target.value)}
            className="form-input"
            style={{ borderColor: dateError ? 'var(--color-risk-high)' : undefined }}
            aria-invalid={!!dateError}
          />
          {dateError && (
            <div style={{ fontSize: '0.74rem', color: 'var(--color-risk-high-text)', marginTop: '2px' }}>
              {dateError}
            </div>
          )}
        </div>

        {/* Time Input */}
        <div>
          <label htmlFor="journey-time-input" className="form-label">
            Departure Time
          </label>
          <input
            id="journey-time-input"
            type="time"
            value={timeValue || '21:30'}
            onChange={(e) => onTimeChange(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* Quick Contextual Time Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginRight: '4px' }}>
          Presets:
        </span>
        {quickTimes.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onTimeChange(preset.time)}
            className="btn btn-subtle btn-sm"
            style={{
              padding: '2px 7px',
              fontSize: '0.72rem',
              background: timeValue === preset.time ? 'var(--color-surface-elevated)' : 'transparent',
              borderColor: timeValue === preset.time ? 'var(--color-border-active)' : 'transparent',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
        Captured for time-of-day illumination and footfall context. Real-time temporal multipliers will activate in Phase 5.
      </div>
    </div>
  );
}
