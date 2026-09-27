import React from 'react';
import { ROUTE_TYPES } from '../../utils/constants';

/**
 * RouteAlternativeCard component.
 * Reusable presentation pattern for route alternatives: FASTEST, BALANCED, and SAFEST.
 * Displays travel duration, distance, route summary roads, and safety status disclaimer.
 */
export function RouteAlternativeCard({
  route,
  isSelected = false,
  onSelect,
  className = '',
}) {
  if (!route) return null;

  const routeId = route.route_id || route.id || route.route_type || route.routeType;
  const routeType = route.route_type || route.routeType || 'BALANCED';
  const title = route.title || '';
  const durationMin =
    route.metrics?.duration_minutes !== undefined
      ? route.metrics.duration_minutes
      : route.durationMinutes;
  const distanceKmVal =
    route.metrics?.distance_km !== undefined
      ? route.metrics.distance_km
      : route.distanceKm;
  const deltaTime =
    route.delta_time_minutes !== undefined
      ? route.delta_time_minutes
      : route.deltaTimeMinutes;
  const summaryRoads = route.summary || '';
  const safetyDisclaimer =
    route.safety_disclaimer ||
    'Safety scoring pending Phase 7. Current metrics evaluate road distance and estimated driving duration.';

  const typeConfig = ROUTE_TYPES[routeType] || {
    key: routeType,
    title: title || 'Route Alternative',
    tag: 'ALTERNATIVE',
    description: 'Calculated road corridor from OpenStreetMap routing engine',
  };

  return (
    <div
      onClick={() => onSelect && onSelect(routeId, routeType)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
          e.preventDefault();
          onSelect(routeId, routeType);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${typeConfig.title}: ${durationMin} minutes, ${distanceKmVal} km`}
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
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {title || typeConfig.title}
            </span>
            <span
              className={`badge ${isSelected ? 'badge-info' : 'badge-status'}`}
              style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
            >
              {typeConfig.tag}
            </span>
          </div>
          {summaryRoads ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-brand-cyan)', margin: 0, marginTop: '2px' }}>
              via {summaryRoads}
            </p>
          ) : (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '2px' }}>
              {typeConfig.description}
            </p>
          )}
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

      {/* Metrics Row: Time & Distance */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 'var(--space-2)',
          background: 'var(--color-surface-card)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        {/* Travel Time */}
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            EST. TRAVEL TIME (FREE-FLOW)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="tabular-numbers" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {durationMin !== undefined ? durationMin : '—'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>min</span>
            {deltaTime !== undefined && deltaTime > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-risk-medium-text)', marginLeft: '6px' }}>
                (+{deltaTime}m)
              </span>
            )}
          </div>
        </div>

        {/* Road Distance */}
        <div style={{ borderLeft: '1px solid var(--color-border-subtle)', paddingLeft: 'var(--space-3)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            ROAD DISTANCE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="tabular-numbers" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {distanceKmVal !== undefined ? distanceKmVal : '—'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>km</span>
          </div>
        </div>
      </div>

      {/* Traversed Road Segments (Phase 7 Geospatial Data Foundation) */}
      {route.segments && route.segments.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-xs)',
            padding: 'var(--space-2) var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              TRAVERSED ROAD SEGMENTS ({route.segments.length})
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-brand-cyan)' }}>
              OpenStreetMap Verified
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
            {route.segments.map((seg, sIdx) => (
              <span
                key={seg.segment_code || sIdx}
                style={{
                  fontSize: '0.7rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '2px 6px',
                  color: 'var(--color-text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={`${seg.name} • ${seg.length_meters ? (seg.length_meters / 1000).toFixed(2) + ' km' : ''}`}
              >
                <span style={{ color: 'var(--color-brand-cyan)', fontWeight: 600 }}>{sIdx + 1}.</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{seg.name}</span>
                {seg.length_meters && (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>
                    ({seg.length_meters >= 1000 ? (seg.length_meters / 1000).toFixed(1) + ' km' : Math.round(seg.length_meters) + ' m'})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Safety Status Notice (Explicit distinction from safety assessment) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: 'var(--radius-xs)',
          padding: '4px 8px',
          fontSize: '0.72rem',
          color: 'var(--color-confidence-text)',
        }}
      >
        <span aria-hidden="true">ℹ️</span>
        <span style={{ lineHeight: 1.35 }}>{safetyDisclaimer}</span>
      </div>
    </div>
  );
}
