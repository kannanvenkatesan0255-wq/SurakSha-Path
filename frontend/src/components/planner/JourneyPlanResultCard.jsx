import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';

/**
 * JourneyPlanResultCard component.
 * Displays the validated journey planning submission state.
 * Strictly adheres to non-fabricated routing standards: explains that spatial routing engine is scheduled for Phase 5.
 */
export function JourneyPlanResultCard({
  response,
  onReset,
  onViewEvidence,
}) {
  if (!response) return null;

  const {
    journey_id,
    origin,
    destination,
    journey_date,
    departure_time,
    route_preference,
    routing_status,
    message,
    disclaimer,
  } = response;

  return (
    <div
      style={{
        background: 'var(--color-surface-panel)',
        border: '1px solid var(--color-brand-blue)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        boxShadow: 'var(--shadow-md)',
      }}
      role="region"
      aria-label="Journey Planning Validation Summary"
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '2px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Journey Plan Validated
            </span>
            <StatusBadge label={routing_status || 'PHASE 5 ENGINE'} variant="info" />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Reference ID: <strong className="tabular-numbers" style={{ color: 'var(--color-text-secondary)' }}>{journey_id}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="subtle" size="sm" onClick={onReset}>
            Plan New Journey
          </Button>
        </div>
      </div>

      {/* Confirmed Journey Parameters Box */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-3)',
          fontSize: '0.85rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            ORIGIN LOCATION
          </div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            📍 {origin?.name || 'Chennai Origin'}
          </div>
          {origin?.resolution_source && (
            <div style={{ fontSize: '0.7rem', color: 'var(--color-brand-cyan)' }}>
              Source: {origin.resolution_source}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            DESTINATION LOCATION
          </div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            🏁 {destination?.name || 'Chennai Destination'}
          </div>
          {destination?.resolution_source && (
            <div style={{ fontSize: '0.7rem', color: 'var(--color-brand-cyan)' }}>
              Source: {destination.resolution_source}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            JOURNEY SCHEDULE
          </div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            🗓️ {journey_date || 'Today'} at {departure_time || '21:30'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            ROUTE PREFERENCE
          </div>
          <div style={{ fontWeight: 600, color: '#93c5fd', marginTop: '2px' }}>
            ⚖️ {route_preference} PREFERENCE
          </div>
        </div>
      </div>

      {/* Honest Architectural Notification (No Fabricated Routes) */}
      <div
        style={{
          background: 'rgba(37, 99, 235, 0.08)',
          borderLeft: '3px solid var(--color-brand-blue)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '0.82rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <strong style={{ color: 'var(--color-text-primary)' }}>Engine Status: </strong>
        {message}
      </div>

      {/* Next Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        {onViewEvidence && (
          <Button variant="primary" onClick={onViewEvidence} icon="🔍">
            Explore Evidence Factors for this Corridor
          </Button>
        )}
        <Button variant="secondary" onClick={onReset} icon="🔄">
          Modify Journey Parameters
        </Button>
      </div>

      {/* Disclaimer */}
      {disclaimer && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-2)' }}>
          {disclaimer}
        </div>
      )}
    </div>
  );
}
