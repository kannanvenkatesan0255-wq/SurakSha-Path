import React from 'react';
import { RiskBadge } from '../common/RiskBadge';
import { ROUTE_TYPES } from '../../utils/constants';

/**
 * RouteAlternativeCard component.
 * Reusable presentation pattern for route alternatives: FASTEST, BALANCED, and SAFEST.
 * Displays travel duration, distance, safety score, confidence, risk level, and main factor.
 */
export function RouteAlternativeCard({
  route,
  isSelected = false,
  onSelect,
  className = '',
}) {
  if (!route) return null;

  const {
    routeType = 'BALANCED',
    title,
    durationMinutes,
    distanceKm,
    safetyScore,
    confidenceScore,
    riskLevel = 'LOW',
    mainFactor,
    deltaSafety,
    deltaTimeMinutes,
  } = route;

  const typeConfig = ROUTE_TYPES[routeType] || ROUTE_TYPES.BALANCED;

  return (
    <div
      onClick={() => onSelect && onSelect(routeType)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
          e.preventDefault();
          onSelect(routeType);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${typeConfig.title}: ${durationMinutes} minutes, Safety Score ${safetyScore}, ${riskLevel} Risk`}
      className={`route-alternative-card ${className}`}
      style={{
        background: isSelected ? 'var(--color-surface-elevated)' : 'var(--color-surface-panel)',
        border: isSelected ? '2px solid var(--color-border-active)' : '1px solid var(--color-border-medium)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-4)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        position: 'relative',
      }}
    >
      {/* Header: Title and Type Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {title || typeConfig.title}
            </span>
            <span
              className={`badge ${isSelected ? 'badge-info' : 'badge-status'}`}
              style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
            >
              {typeConfig.tag}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '2px' }}>
            {typeConfig.description}
          </p>
        </div>

        {/* Selected Radio Indicator */}
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: isSelected ? '5px solid var(--color-brand-blue)' : '2px solid var(--color-border-medium)',
            background: isSelected ? '#ffffff' : 'transparent',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Metrics Row: Time & Distance vs Safety Score & Confidence */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-2)',
          background: 'var(--color-surface-card)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        {/* Travel Time & Distance */}
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            EST. TRAVEL TIME
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="tabular-numbers" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {durationMinutes !== undefined ? durationMinutes : '—'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>min</span>
            {distanceKm && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>
                ({distanceKm} km)
              </span>
            )}
          </div>
          {deltaTimeMinutes !== undefined && deltaTimeMinutes !== 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-risk-medium-text)' }}>
              +{deltaTimeMinutes} min vs fastest
            </div>
          )}
        </div>

        {/* Safety Score & Confidence */}
        <div style={{ borderLeft: '1px solid var(--color-border-subtle)', paddingLeft: 'var(--space-2)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            SAFETY SCORE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="tabular-numbers" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-risk-low-text)' }}>
              {safetyScore !== undefined ? safetyScore : '—'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>/ 100</span>
          </div>
          {confidenceScore !== undefined && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-confidence-text)' }}>
              Confidence: {confidenceScore}%
            </div>
          )}
        </div>
      </div>

      {/* Footer: Risk Badge & Main Contributing Factor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <RiskBadge level={riskLevel} />

        {mainFactor && (
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
            Key: <strong style={{ color: 'var(--color-text-primary)' }}>{mainFactor}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
