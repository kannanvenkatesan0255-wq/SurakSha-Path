import React, { useState } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';

/**
 * MapWorkspace component.
 * Establishes the cartographic viewport container and layout boundary for Suraksha Path.
 * Sized for responsive desktop, tablet, and mobile views.
 * Reserves locations for map controls, layer toggles, and route overlay injection.
 */
export function MapWorkspace({
  activeCorridor = 'Anna Salai Corridor',
  origin = '',
  destination = '',
  selectedRouteType = 'BALANCED',
  onSelectCorridor,
  children,
}) {
  const [activeLayers, setActiveLayers] = useState({
    lighting: true,
    police: true,
    cctv: false,
    crowd: false,
  });

  const toggleLayer = (layerKey) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div
      className="map-workspace-container"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '460px',
        height: '100%',
        backgroundColor: '#070b12',
        backgroundImage: `
          linear-gradient(rgba(37, 99, 235, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(37, 99, 235, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
        border: '1px solid var(--color-border-medium)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="region"
      aria-label="Chennai Cartographic Map Workspace"
    >
      {/* Top Floating Control Bar (Overlay) */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-3)',
          left: 'var(--space-3)',
          right: 'var(--space-3)',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          pointerEvents: 'none',
        }}
      >
        {/* Left: Spatial Context Pill */}
        <div
          style={{
            pointerEvents: 'auto',
            background: 'var(--color-surface-overlay)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2) var(--space-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--color-brand-cyan)' }}>📍</span>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Chennai Metro Canvas
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              13.0827° N, 80.2707° E • {activeCorridor}
            </div>
          </div>
          <StatusBadge label="PHASE 5 ENGINE TARGET" variant="status" />
        </div>

        {/* Right: Layer Selector Overlays */}
        <div
          style={{
            pointerEvents: 'auto',
            background: 'var(--color-surface-overlay)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px',
            display: 'flex',
            gap: '4px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <button
            onClick={() => toggleLayer('lighting')}
            className={`btn btn-sm ${activeLayers.lighting ? 'btn-primary' : 'btn-subtle'}`}
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
            aria-pressed={activeLayers.lighting}
          >
            💡 Lighting
          </button>
          <button
            onClick={() => toggleLayer('police')}
            className={`btn btn-sm ${activeLayers.police ? 'btn-primary' : 'btn-subtle'}`}
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
            aria-pressed={activeLayers.police}
          >
            👮 Police Posts
          </button>
          <button
            onClick={() => toggleLayer('cctv')}
            className={`btn btn-sm ${activeLayers.cctv ? 'btn-primary' : 'btn-subtle'}`}
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
            aria-pressed={activeLayers.cctv}
          >
            📹 CCTV
          </button>
        </div>
      </div>

      {/* Main Cartographic Body / Layout Reservation */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-10) var(--space-4)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            background: 'rgba(13, 20, 36, 0.88)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }} aria-hidden="true">
            🧭
          </div>
          <h4 style={{ fontSize: '1.15rem', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
            Spatial Graph & Cartographic Viewport
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
            Dedicated map boundary reserved for <strong>Leaflet.js</strong> integration.
            Subsequent phases will mount dynamic vector tiles, route polylines, segment-level risk heatmaps,
            and pin markers for Chennai corridors.
          </p>

          {(origin || destination) ? (
            <div
              style={{
                background: 'var(--color-surface-panel)',
                border: '1px solid var(--color-border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)',
                fontSize: '0.8rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                Active Route Planning Points
              </div>
              <div style={{ color: 'var(--color-text-primary)' }}>
                <strong>Origin:</strong> {origin || 'Not specified'}
              </div>
              <div style={{ color: 'var(--color-text-primary)' }}>
                <strong>Destination:</strong> {destination || 'Not specified'}
              </div>
              <div style={{ color: 'var(--color-brand-cyan)', marginTop: '2px', fontWeight: 600 }}>
                Selected Alternative: {selectedRouteType}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Enter origin and destination in the planning panel to evaluate routes.
            </div>
          )}
        </div>
      </div>

      {/* Embedded Children (e.g. Floating inspection drawers) */}
      {children}

      {/* Bottom Map Status Bar */}
      <div
        style={{
          borderTop: '1px solid var(--color-border-subtle)',
          backgroundColor: 'rgba(7, 11, 18, 0.95)',
          padding: 'var(--space-2) var(--space-4)',
          fontSize: '0.74rem',
          color: 'var(--color-text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div>
          CRS: EPSG:4326 (WGS 84) • Zoom: 12.5 • Extent: Chennai Metropolitan Area
        </div>
        <div>
          Data Source: OpenStreetMap & Chennai Urban Corridor Audits (Synthetic Prototype)
        </div>
      </div>
    </div>
  );
}
