import React from 'react';
import { RouteAlternativeCard } from './RouteAlternativeCard';
import { SectionPanel } from '../common/SectionPanel';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';

/**
 * RouteComparisonPanel component.
 * Displays side-by-side or stacked route alternatives comparing Fastest, Balanced, and Safest paths.
 */
export function RouteComparisonPanel({
  routes = [],
  selectedRouteType = 'BALANCED',
  onSelectRoute,
  onPlanRequest,
}) {
  return (
    <SectionPanel
      title="Alternative Route Comparisons"
      subtitle="Evaluated trade-offs between travel duration, road-segment lighting, and safety score"
      badge={<StatusBadge label="SEGMENT RISK MODEL" variant="info" />}
    >
      {routes && routes.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {routes.map((route) => (
            <RouteAlternativeCard
              key={route.routeType}
              route={route}
              isSelected={selectedRouteType === route.routeType}
              onSelect={onSelectRoute}
            />
          ))}

          {/* Trade-Off Summary Box */}
          <div
            style={{
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: '0.82rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: 'var(--color-text-primary)' }}>Trade-off Insight: </strong>
            The <span style={{ color: 'var(--color-brand-cyan)', fontWeight: 600 }}>Balanced</span> alternative adds ~90 seconds of travel time along major commercial corridors, eliminating isolated flyover segments and improving the overall safety score from 68 to 81.
          </div>
        </div>
      ) : (
        <EmptyState
          icon="⚡"
          title="No Route Alternatives Calculated"
          description="Enter an origin and destination to generate and compare Fastest, Balanced, and Safest journeys across Chennai road corridors."
          actionLabel="Load Chennai Corridor Preset"
          onAction={onPlanRequest}
        />
      )}
    </SectionPanel>
  );
}
