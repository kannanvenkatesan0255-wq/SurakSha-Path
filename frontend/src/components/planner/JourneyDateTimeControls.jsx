import React, { useState, useEffect } from 'react';
import { evaluateJourneyContext } from '../../api/context.js';

/**
 * JourneyDateTimeControls component.
 * Provides accessible date and departure-time selection.
 * Integrates Phase 13 real-time time-of-day and environmental telemetry for Chennai (Asia/Kolkata).
 */
export function JourneyDateTimeControls({
  dateValue,
  onDateChange,
  timeValue,
  onTimeChange,
  dateError,
  onContextChange,
}) {
  // Compute minimum date as today in local YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const quickTimes = [
    { label: 'Now', time: new Date().toTimeString().slice(0, 5) },
    { label: 'Daylight (12:00)', time: '12:00' },
    { label: 'Dusk (18:15)', time: '18:15' },
    { label: 'Night (21:30)', time: '21:30' },
    { label: 'Late (23:45)', time: '23:45' },
  ];

  const [contextData, setContextData] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState(null);

  // Fetch or evaluate context whenever date or time changes
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingContext(true);
      setContextError(null);
      try {
        const res = await evaluateJourneyContext({
          journeyDate: dateValue || todayStr,
          departureTime: timeValue || '21:30',
        });
        if (!isCancelled) {
          setContextData(res);
          if (onContextChange) onContextChange(res);
        }
      } catch (err) {
        if (!isCancelled) {
          // Honest unavailable-data state without blocking user
          setContextError(err.message || 'Unable to retrieve live environmental telemetry.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingContext(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [dateValue, timeValue, todayStr, onContextChange]);

  const solar = contextData?.solar_context;
  const weather = contextData?.environmental_context;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* Top Label & Official Timezone Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Journey Schedule
        </span>
        <span
          style={{
            fontSize: '0.68rem',
            color: 'var(--color-brand-cyan)',
            background: 'rgba(56, 189, 248, 0.08)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
          }}
          title="Chennai is in the Indian Standard Time (IST) zone without Daylight Saving Time"
        >
          Asia/Kolkata (IST: UTC+5:30)
        </span>
      </div>

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

      {/* Real-Time Context & Environmental Status Pill (Phase 13) */}
      {contextData && (
        <div
          style={{
            marginTop: '4px',
            padding: '8px 10px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
            {/* Solar Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
              <span>{solar?.is_dark ? '🌙' : (solar?.solar_phase === 'DAYLIGHT' ? '☀️' : '🌅')}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {solar?.solar_phase?.replace('_', ' ')}
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                ({solar?.solar_elevation_degrees}° elev)
              </span>
            </div>

            {/* Weather & Temperature */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
              <span>🌡️</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {weather?.temperature_celsius}°C
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                • {weather?.weather_description}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', fontSize: '0.7rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              Lighting Relevance: <strong style={{ color: solar?.is_dark ? '#f59e0b' : 'var(--color-text-secondary)' }}>
                {Math.round((solar?.lighting_relevance_factor || 0) * 100)}%
              </strong>
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '1px 5px',
                borderRadius: 'var(--radius-pill)',
                background: weather?.is_forecast ? 'rgba(147, 51, 234, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: weather?.is_forecast ? '#c084fc' : '#34d399',
                border: '1px solid currentColor',
              }}
            >
              {weather?.is_forecast ? 'HOURLY MODEL FORECAST' : 'LIVE OPEN-METEO'}
            </span>
          </div>

          {/* Waterlogging / Rain Advisory if active */}
          {weather?.waterlogging_risk_level && weather.waterlogging_risk_level !== 'NONE' && (
            <div
              style={{
                fontSize: '0.69rem',
                color: '#f87171',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '3px 6px',
                borderRadius: '3px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              ⚠️ {weather.active_advisories[0] || 'Waterlogging risk on low-lying roads.'}
            </div>
          )}
        </div>
      )}

      {/* Unavailable data state */}
      {contextError && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          ℹ️ Real-time weather telemetry offline; using seasonal climate norms.
        </div>
      )}

      {isLoadingContext && !contextData && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          Evaluating Chennai astronomical & weather context...
        </div>
      )}

      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
        Captured for time-of-day illumination and weather traction adjustments. Non-predictive heuristic; not a personal safety guarantee.
      </div>
    </div>
  );
}
