/**
 * MapLegend Component for Suraksha Path.
 * Displays cartographic HUD, coordinate readouts, active layer legends, and provider attribution.
 */
import React from 'react';
import { formatCoordinates } from './mapConfig';

export function MapLegend({
  center = [13.0827, 80.2707],
  zoom = 12,
  origin = null,
  destination = null,
  straightLineDistanceKm = null,
  selectedRoute = null,
  attributionText = '© OpenStreetMap contributors © CARTO',
}) {
  return (
    <div
      className="map-legend-footer"
      style={{
        borderTop: '1px solid var(--color-border-subtle)',
        backgroundColor: 'rgba(7, 11, 18, 0.95)',
        padding: '6px 12px',
        fontSize: '0.73rem',
        color: 'var(--color-text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        zIndex: 400,
        position: 'relative',
      }}
      role="status"
      aria-label="Map status and legend information"
    >
      {/* Left: Viewport Coordinates & Spatial Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {formatCoordinates(center[0], center[1])}
        </span>
        <span style={{ color: 'var(--color-border-strong)' }}>•</span>
        <span>Zoom {zoom}</span>
        {selectedRoute?.metrics?.distance_km ? (
          <>
            <span style={{ color: 'var(--color-border-strong)' }}>•</span>
            <span style={{ color: 'var(--color-brand-cyan)', fontWeight: 600 }}>
              Road: {selectedRoute.metrics.distance_km} km ({selectedRoute.metrics.duration_minutes} min)
            </span>
          </>
        ) : (
          straightLineDistanceKm !== null && straightLineDistanceKm > 0 && (
            <>
              <span style={{ color: 'var(--color-border-strong)' }}>•</span>
              <span style={{ color: 'var(--color-brand-cyan)', fontWeight: 600 }}>
                Air: {straightLineDistanceKm} km
              </span>
            </>
          )
        )}
      </div>

      {/* Middle: Active Marker Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#10b981', fontWeight: 700 }}>[A]</span>
          <span style={{ color: origin ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
            Origin {origin ? '✓' : '(Not Set)'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>[B]</span>
          <span style={{ color: destination ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
            Destination {destination ? '✓' : '(Not Set)'}
          </span>
        </div>
      </div>

      {/* Right: Attribution */}
      <div
        style={{
          fontSize: '0.67rem',
          color: 'var(--color-text-muted)',
        }}
        dangerouslySetInnerHTML={{ __html: attributionText }}
      />
    </div>
  );
}
