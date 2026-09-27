import React from 'react';
import { RouteAlternativeCard } from './RouteAlternativeCard';
import { SectionPanel } from '../common/SectionPanel';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';

/**
 * RouteComparisonPanel component.
 * Displays road-network route alternatives returned by the routing engine,
 * enabling users to compare trade-offs, inspect metrics, and select active routes on the map.
 */
export function RouteComparisonPanel({
  routes = [],
  selectedRouteId = null,
  tradeoffSummary = null,
  userPreference = 'BALANCED',
  onSelectRoute,
  onSelectPreference,
  onPlanRequest,
  onClearRoutes,
}) {
  return (
    <SectionPanel
      title="Route Alternatives & Trade-Offs"
      subtitle="Multi-objective speed vs. safety evidence evaluation across Chennai corridors"
      badge={<StatusBadge label="PHASE 10 TRADE-OFF ENGINE" variant="info" />}
      action={
        routes && routes.length > 0 && onClearRoutes ? (
          <button
            type="button"
            onClick={onClearRoutes}
            className="btn btn-subtle btn-sm"
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
          >
            Clear Routes
          </button>
        ) : null
      }
    >
      {routes && routes.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Executive Trade-Off Callout Card (Phase 10) */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid var(--color-border-medium)',
              borderLeft: '4px solid var(--color-brand-cyan)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3) var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>⚖️</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Safety–Time Trade-Off Landscape
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-brand-cyan)', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 6px', borderRadius: 'var(--radius-pill)' }}>
                Pareto Utility v1
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.79rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              {tradeoffSummary || (
                `Generated ${routes.length} distinct corridor alternative(s). Compare driving duration against ` +
                `verified segment lighting, police patrols, and community observations.`
              )}
            </p>

            {/* Quick Preference Filter Bar */}
            {onSelectPreference && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Focus Strategy:
                </span>
                {['FASTEST', 'BALANCED', 'SAFEST'].map((pref) => {
                  const isActive = userPreference === pref;
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => onSelectPreference(pref)}
                      className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-subtle'}`}
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 8px',
                        height: 'auto',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: isActive ? 700 : 500,
                      }}
                    >
                      {pref === 'FASTEST' ? '⚡ Fastest' : pref === 'BALANCED' ? '⚖️ Balanced' : '🛡️ Safest'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Route Alternative Cards */}
          {routes.map((route) => {
            const isSelected = selectedRouteId
              ? route.route_id === selectedRouteId
              : route.is_selected;

            return (
              <RouteAlternativeCard
                key={route.route_id}
                route={route}
                isSelected={isSelected}
                onSelect={(routeId) => onSelectRoute && onSelectRoute(routeId)}
              />
            );
          })}

          {/* Provider & Methodology Attribution Box */}
          <div
            style={{
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: '0.76rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '3px' }}>
              ℹ️ Routing Engine & Safety Evidence Methodology:
            </div>
            <div>
              Route geometries and free-flow travel estimates are generated via OpenStreetMap / OSRM.
              Safety Scores [15.0–95.0] aggregate verified street lighting, pedestrian infrastructure, and trust-weighted
              community reports. Unassessed corridors reflect data absence, never zero hazard. Personal safety is never guaranteed.
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="🗺️"
          title="No Route Alternatives Calculated"
          description="Enter an origin and destination in the journey form above to generate and compare real road routes across Chennai."
          actionLabel="Load Chennai Corridor Preset"
          onAction={onPlanRequest}
        />
      )}
    </SectionPanel>
  );
}
