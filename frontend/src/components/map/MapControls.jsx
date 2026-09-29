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
  activeBasemap = 'MAPBOX_OUTDOORS',
  onToggleBasemap,
  onSelectBasemap,
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
          maxWidth: 'min(460px, calc(100% - 16px))',
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
            gap: '6px',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Basemap Style Options (Outdoors Green/White, Satellite Aerial, Streets, Dark) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'rgba(5, 8, 16, 0.65)',
              padding: '2px 4px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <span
              style={{
                fontSize: '0.64rem',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
                paddingRight: '2px',
                userSelect: 'none',
              }}
            >
              MAP:
            </span>

            {activeBasemap.startsWith('MAPBOX_') ? (
              <>
                <button
                  type="button"
                  onClick={() => (onSelectBasemap ? onSelectBasemap('MAPBOX_OUTDOORS') : onToggleBasemap())}
                  style={{
                    background: activeBasemap === 'MAPBOX_OUTDOORS' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                    border: `1px solid ${activeBasemap === 'MAPBOX_OUTDOORS' ? '#10b981' : 'transparent'}`,
                    color: activeBasemap === 'MAPBOX_OUTDOORS' ? '#34d399' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.68rem',
                    fontWeight: activeBasemap === 'MAPBOX_OUTDOORS' ? 700 : 500,
                    padding: '2px 6px',
                    height: '24px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                  }}
                  title="Green & White View (Mapbox Outdoors: natural terrain, green parks & clean white roads)"
                  aria-pressed={activeBasemap === 'MAPBOX_OUTDOORS'}
                >
                  🌲 Green/White
                </button>

                <button
                  type="button"
                  onClick={() => (onSelectBasemap ? onSelectBasemap('MAPBOX_SATELLITE') : onToggleBasemap())}
                  style={{
                    background: activeBasemap === 'MAPBOX_SATELLITE' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                    border: `1px solid ${activeBasemap === 'MAPBOX_SATELLITE' ? '#3b82f6' : 'transparent'}`,
                    color: activeBasemap === 'MAPBOX_SATELLITE' ? '#60a5fa' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.68rem',
                    fontWeight: activeBasemap === 'MAPBOX_SATELLITE' ? 700 : 500,
                    padding: '2px 6px',
                    height: '24px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                  }}
                  title="Satellite View (Real photorealistic aerial satellite imagery with streets)"
                  aria-pressed={activeBasemap === 'MAPBOX_SATELLITE'}
                >
                  🛰️ Satellite
                </button>

                <button
                  type="button"
                  onClick={() => (onSelectBasemap ? onSelectBasemap('MAPBOX_STREETS') : onToggleBasemap())}
                  style={{
                    background: activeBasemap === 'MAPBOX_STREETS' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                    border: `1px solid ${activeBasemap === 'MAPBOX_STREETS' ? '#f59e0b' : 'transparent'}`,
                    color: activeBasemap === 'MAPBOX_STREETS' ? '#fbbf24' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.68rem',
                    fontWeight: activeBasemap === 'MAPBOX_STREETS' ? 700 : 500,
                    padding: '2px 6px',
                    height: '24px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                  }}
                  title="Daylight Streets (Mapbox Streets urban road network)"
                  aria-pressed={activeBasemap === 'MAPBOX_STREETS'}
                >
                  🏙️ Streets
                </button>

                <button
                  type="button"
                  onClick={() => (onSelectBasemap ? onSelectBasemap('MAPBOX_DARK') : onToggleBasemap())}
                  style={{
                    background: activeBasemap === 'MAPBOX_DARK' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                    border: `1px solid ${activeBasemap === 'MAPBOX_DARK' ? '#8b5cf6' : 'transparent'}`,
                    color: activeBasemap === 'MAPBOX_DARK' ? '#a78bfa' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.68rem',
                    fontWeight: activeBasemap === 'MAPBOX_DARK' ? 700 : 500,
                    padding: '2px 6px',
                    height: '24px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                  }}
                  title="Dark Mode (Mapbox Dark nocturnal canvas)"
                  aria-pressed={activeBasemap === 'MAPBOX_DARK'}
                >
                  🌙 Dark
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => (onSelectBasemap ? onSelectBasemap('DARK_MATTER') : onToggleBasemap())}
                  style={{
                    background: activeBasemap === 'DARK_MATTER' ? 'var(--color-surface-elevated)' : 'transparent',
                    border: `1px solid ${activeBasemap === 'DARK_MATTER' ? 'var(--color-brand-blue)' : 'transparent'}`,
                    color: activeBasemap === 'DARK_MATTER' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    height: '24px',
                    cursor: 'pointer',
                  }}
                  title="Dark Canvas (CartoDB Dark Matter)"
                  aria-pressed={activeBasemap === 'DARK_MATTER'}
                >
                  🌙 Dark
                </button>
                <button
                  type="button"
                  onClick={() => (onSelectBasemap ? onSelectBasemap('VOYAGER') : onToggleBasemap())}
                  style={{
                    background: activeBasemap === 'VOYAGER' ? 'var(--color-surface-elevated)' : 'transparent',
                    border: `1px solid ${activeBasemap === 'VOYAGER' ? 'var(--color-brand-blue)' : 'transparent'}`,
                    color: activeBasemap === 'VOYAGER' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    height: '24px',
                    cursor: 'pointer',
                  }}
                  title="Street Navigation (CartoDB Voyager)"
                  aria-pressed={activeBasemap === 'VOYAGER'}
                >
                  🏙️ Street
                </button>
              </>
            )}
          </div>

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

      <style>{`
        @media (max-width: 640px) {
          .map-mode-controls {
            bottom: 38px !important;
            left: 6px !important;
            right: 6px !important;
            max-width: calc(100% - 12px) !important;
          }
        }
      `}</style>
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
