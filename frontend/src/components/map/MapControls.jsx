/**
 * MapControls Component for Suraksha Path.
 * Provides accessible, high-contrast, floating map control tools:
 *  - Zoom In / Zoom Out
 *  - Reset to default Chennai viewport
 *  - Fit bounds to active endpoints (Origin + Destination)
 *  - Basemap style toggle (Dark Canvas / Street)
 *  - Infrastructure / safety layer toggles
 */
import React from 'react';
import { LAYER_TYPES, LAYER_METADATA } from './mapOverlays';

export function MapControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitBounds,
  hasEndpoints = false,
  activeBasemap = 'DARK_MATTER',
  onToggleBasemap,
  activeLayers = {},
  onToggleLayer,
  clickMode = 'INSPECT',
  onChangeClickMode,
}) {
  return (
    <>
      {/* Top-Right: Zoom & Viewport Navigation Floating Toolbar */}
      <div
        className="map-viewport-controls"
        style={{
          position: 'absolute',
          top: 'var(--space-3)',
          right: 'var(--space-3)',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
        role="toolbar"
        aria-label="Map Navigation Controls"
      >
        {/* Zoom In Button */}
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in on Chennai map"
          title="Zoom In (+)"
          style={controlBtnStyle}
        >
          <span style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}>+</span>
        </button>

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out on Chennai map"
          title="Zoom Out (-)"
          style={controlBtnStyle}
        >
          <span style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}>−</span>
        </button>

        <div style={{ height: '1px', background: 'var(--color-border-medium)', margin: '2px 0' }} />

        {/* Reset View Button */}
        <button
          type="button"
          onClick={onResetView}
          aria-label="Reset viewport to Chennai Central canvas"
          title="Reset View to Chennai Center (13.0827° N, 80.2707° E)"
          style={{ ...controlBtnStyle, width: 'auto', padding: '0 8px', gap: '4px' }}
        >
          <span aria-hidden="true" style={{ fontSize: '0.9rem' }}>⌖</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Reset</span>
        </button>

        {/* Fit Endpoints Button (Active when endpoints exist) */}
        {hasEndpoints && (
          <button
            type="button"
            onClick={onFitBounds}
            aria-label="Fit map to both origin and destination endpoints"
            title="Fit Map to Origin and Destination"
            style={{ ...controlBtnStyle, width: 'auto', padding: '0 8px', gap: '4px', borderColor: 'var(--color-brand-cyan)' }}
          >
            <span aria-hidden="true" style={{ fontSize: '0.85rem' }}>⛶</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-brand-cyan)' }}>Fit Route</span>
          </button>
        )}
      </div>

      {/* Bottom-Left: Interactive Selection Mode & Basemap Selector */}
      <div
        className="map-mode-controls"
        style={{
          position: 'absolute',
          bottom: 'var(--space-8)',
          left: 'var(--space-3)',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxWidth: '320px',
        }}
      >
        {/* Map Click Action Mode Selector */}
        <div
          style={{
            background: 'rgba(13, 20, 36, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, padding: '0 4px' }}>
            Map Click:
          </span>
          <button
            type="button"
            onClick={() => onChangeClickMode('ORIGIN')}
            className={`btn btn-sm ${clickMode === 'ORIGIN' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ fontSize: '0.7rem', padding: '2px 6px', height: '24px' }}
            aria-pressed={clickMode === 'ORIGIN'}
            title="Next click on map sets Origin"
          >
            📍 Origin
          </button>
          <button
            type="button"
            onClick={() => onChangeClickMode('DESTINATION')}
            className={`btn btn-sm ${clickMode === 'DESTINATION' ? 'btn-primary' : 'btn-subtle'}`}
            style={{ fontSize: '0.7rem', padding: '2px 6px', height: '24px' }}
            aria-pressed={clickMode === 'DESTINATION'}
            title="Next click on map sets Destination"
          >
            🏁 Destination
          </button>
          <button
            type="button"
            onClick={() => onChangeClickMode('INSPECT')}
            className={`btn btn-sm ${clickMode === 'INSPECT' ? 'btn-secondary' : 'btn-subtle'}`}
            style={{ fontSize: '0.7rem', padding: '2px 6px', height: '24px' }}
            aria-pressed={clickMode === 'INSPECT'}
            title="Click on map to inspect coordinates and choose action"
          >
            Inspect
          </button>
        </div>

        {/* Basemap Style & Layers Quick Bar */}
        <div
          style={{
            background: 'rgba(13, 20, 36, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Basemap Toggle */}
          <button
            type="button"
            onClick={onToggleBasemap}
            className="btn btn-subtle btn-sm"
            style={{ fontSize: '0.72rem', padding: '2px 6px', height: '24px' }}
            aria-label="Toggle between Mapbox Dark and Mapbox Streets basemaps"
            title={`Switch to ${activeBasemap === 'MAPBOX_DARK' ? 'Mapbox Streets (Daylight)' : 'Mapbox Dark (Nocturnal)'}`}
          >
            <span>
              🗺️ {activeBasemap === 'MAPBOX_DARK' ? 'Mapbox Dark' : activeBasemap === 'MAPBOX_STREETS' ? 'Mapbox Streets' : activeBasemap === 'DARK_MATTER' ? 'Dark Canvas' : 'Street'}
            </span>
          </button>

          {/* Quick Layer Badges */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {Object.values(LAYER_TYPES).map((type) => {
              if (type === LAYER_TYPES.ROUTES) return null;
              const meta = LAYER_METADATA[type];
              const isActive = !!activeLayers[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onToggleLayer && onToggleLayer(type)}
                  style={{
                    background: isActive ? 'var(--color-surface-elevated)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--color-brand-blue)' : 'var(--color-border-subtle)'}`,
                    borderRadius: 'var(--radius-xs)',
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  aria-pressed={isActive}
                  title={`${meta.label} (${isActive ? 'Visible' : 'Hidden'}) - Demo Layer`}
                >
                  {meta.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

const controlBtnStyle = {
  width: '32px',
  height: '32px',
  background: 'rgba(13, 20, 36, 0.92)',
  backdropFilter: 'blur(8px)',
  border: '1px solid var(--color-border-medium)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-md)',
  transition: 'all var(--transition-fast)',
};
