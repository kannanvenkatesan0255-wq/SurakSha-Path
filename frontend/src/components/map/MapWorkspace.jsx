/**
 * MapWorkspace Component for Suraksha Path.
 * Top-level geospatial workspace container integrating the interactive Leaflet map canvas,
 * spatial contextual header, layer control state, and responsive boundaries.
 */
import React, { useMemo } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { InteractiveMap } from './InteractiveMap';
import { resolveLocationQuery } from '../../services/locationService';

export function MapWorkspace({
  activeCorridor = 'Chennai Metropolitan Area',
  origin = '',
  destination = '',
  routes = [],
  selectedRouteId = null,
  onSelectRoute = null,
  selectedRouteType = 'BALANCED',
  onSelectOrigin,
  onSelectDestination,
  onClearOrigin,
  onClearDestination,
  children,
}) {
  // Resolve origin and destination strings to coordinate objects
  const resolvedOrigin = useMemo(() => {
    return origin ? resolveLocationQuery(origin) : null;
  }, [origin]);

  const resolvedDestination = useMemo(() => {
    return destination ? resolveLocationQuery(destination) : null;
  }, [destination]);

  return (
    <div
      className="map-workspace-container"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '620px',
        height: '100%',
        backgroundColor: '#070b12',
        border: '1px solid var(--color-border-medium)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
      }}
      role="region"
      aria-label="Chennai Cartographic Map Workspace"
    >
      {/* Top Floating Spatial Context Pill */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-3)',
          left: 'var(--space-3)',
          zIndex: 400,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            background: 'rgba(13, 20, 36, 0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2) var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--color-brand-cyan)', fontSize: '1rem' }}>
            🧭
          </span>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Chennai Metro Spatial Canvas
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              13.0827° N, 80.2707° E • {activeCorridor}
            </div>
          </div>
          <StatusBadge label="PHASE 6 ROUTE ENGINE" variant="status" />
          {routes && routes.length > 0 ? (
            <StatusBadge label={`${routes.length} Alternatives`} variant="info" />
          ) : (
            selectedRouteType && (
              <StatusBadge label={selectedRouteType} variant="info" />
            )
          )}
        </div>
      </div>

      {/* Main Interactive Leaflet Map Canvas */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <InteractiveMap
          originLocation={resolvedOrigin}
          destinationLocation={resolvedDestination}
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={onSelectRoute}
          onSelectOrigin={onSelectOrigin}
          onSelectDestination={onSelectDestination}
          onClearOrigin={onClearOrigin}
          onClearDestination={onClearDestination}
        />
      </div>

      {/* Embedded Children (e.g. Floating inspection drawers if passed) */}
      {children}
    </div>
  );
}
