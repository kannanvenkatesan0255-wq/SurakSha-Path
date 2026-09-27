/**
 * Leaflet Marker and Popup Utilities for Suraksha Path.
 * Generates accessible, high-contrast, custom HTML divIcon markers for:
 *  - Origin point (A / 📍)
 *  - Destination point (B / 🏁)
 *  - Map-click selection preview
 *  - Verified infrastructure reference points (Police, Lighting, CCTV)
 *
 * Adheres to WCAG: Uses distinct geometric shapes, glyphs, and text labels (not color alone).
 */
import L from 'leaflet';
import { formatCoordinates } from './mapConfig';

/**
 * Creates custom divIcon for Origin Location (Pin with "A" glyph and emerald ring)
 */
export function createOriginDivIcon(label = 'Origin') {
  return L.divIcon({
    className: 'suraksha-marker-origin-wrapper',
    iconSize: [36, 48],
    iconAnchor: [18, 46],
    popupAnchor: [0, -44],
    html: `
      <div class="suraksha-pin-marker origin" aria-label="Origin Marker: ${label}" role="img">
        <div class="pin-pulse"></div>
        <div class="pin-body">
          <span class="pin-icon">📍</span>
          <span class="pin-letter">A</span>
        </div>
        <div class="pin-tip"></div>
      </div>
    `,
  });
}

/**
 * Creates custom divIcon for Destination Location (Square badge with "B" glyph and amber/cyan ring)
 */
export function createDestinationDivIcon(label = 'Destination') {
  return L.divIcon({
    className: 'suraksha-marker-dest-wrapper',
    iconSize: [36, 48],
    iconAnchor: [18, 46],
    popupAnchor: [0, -44],
    html: `
      <div class="suraksha-pin-marker destination" aria-label="Destination Marker: ${label}" role="img">
        <div class="pin-pulse"></div>
        <div class="pin-body">
          <span class="pin-icon">🏁</span>
          <span class="pin-letter">B</span>
        </div>
        <div class="pin-tip"></div>
      </div>
    `,
  });
}

/**
 * Creates custom divIcon for clicked map location preview
 */
export function createSelectionDivIcon() {
  return L.divIcon({
    className: 'suraksha-marker-select-wrapper',
    iconSize: [32, 42],
    iconAnchor: [16, 40],
    popupAnchor: [0, -38],
    html: `
      <div class="suraksha-pin-marker selection" aria-label="Selected Map Point" role="img">
        <div class="pin-pulse active"></div>
        <div class="pin-body">
          <span class="pin-icon">🎯</span>
        </div>
        <div class="pin-tip"></div>
      </div>
    `,
  });
}

/**
 * Creates custom divIcon for verified infrastructure points
 */
export function createInfrastructureDivIcon(type = 'police') {
  const iconSymbol = type === 'police' ? '👮' : type === 'lighting' ? '💡' : '📹';
  const badgeClass = `infra-${type}`;

  return L.divIcon({
    className: 'suraksha-infra-marker-wrapper',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    html: `
      <div class="suraksha-infra-badge ${badgeClass}" aria-label="Infrastructure: ${type}" role="img">
        <span>${iconSymbol}</span>
      </div>
    `,
  });
}

/**
 * Formats HTML string for Leaflet marker popups.
 */
export function formatMarkerPopup({
  role = 'LOCATION', // 'ORIGIN' | 'DESTINATION' | 'SELECTED' | 'INFRASTRUCTURE'
  title = '',
  address = '',
  lat,
  lng,
  details = '',
  actionHtml = '',
}) {
  const coordText = formatCoordinates(lat, lng);
  const badgeColor =
    role === 'ORIGIN'
      ? 'var(--color-risk-low-text, #34d399)'
      : role === 'DESTINATION'
      ? 'var(--color-risk-medium-text, #fbbf24)'
      : 'var(--color-brand-cyan, #06b6d4)';

  const roleText =
    role === 'ORIGIN'
      ? 'A • ORIGIN'
      : role === 'DESTINATION'
      ? 'B • DESTINATION'
      : role === 'INFRASTRUCTURE'
      ? 'VERIFIED INFRASTRUCTURE'
      : 'SELECTED POINT';

  return `
    <div class="suraksha-map-popup" style="font-family: var(--font-sans, sans-serif); min-width: 220px; max-width: 280px; padding: 4px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
        <span style="font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px; color: ${badgeColor};">
          ${roleText}
        </span>
      </div>
      <div style="font-size: 0.9rem; font-weight: 600; color: #f8fafc; margin-bottom: 4px; line-height: 1.3;">
        ${title}
      </div>
      ${
        address
          ? `<div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 6px; line-height: 1.4;">${address}</div>`
          : ''
      }
      ${
        details
          ? `<div style="font-size: 0.72rem; color: #38bdf8; background: rgba(56,189,248,0.1); padding: 4px 6px; border-radius: 4px; margin-bottom: 6px;">${details}</div>`
          : ''
      }
      <div style="font-size: 0.7rem; color: #64748b; font-family: var(--font-mono, monospace); margin-bottom: 8px;">
        ${coordText}
      </div>
      ${
        actionHtml
          ? `<div style="display: flex; gap: 6px; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">${actionHtml}</div>`
          : ''
      }
    </div>
  `;
}

/**
 * Creates custom divIcon for Current Commuter Position (Phase 14).
 * Distinguishes Live Device GPS from Simulated Demo coordinates.
 */
export function createCurrentLocationDivIcon(isSimulated = false, label = 'Current Position') {
  const pulseClass = isSimulated ? 'pin-pulse simulated' : 'pin-pulse live';
  const tagText = isSimulated ? 'DEMO' : 'LIVE';
  const tagColor = isSimulated ? '#a855f7' : '#06b6d4';

  return L.divIcon({
    className: 'suraksha-marker-current-loc-wrapper',
    iconSize: [38, 48],
    iconAnchor: [19, 44],
    popupAnchor: [0, -42],
    html: `
      <div class="suraksha-pin-marker current-location" aria-label="${label}: ${tagText}" role="img">
        <div class="${pulseClass}" style="border-color: ${tagColor}; box-shadow: 0 0 12px ${tagColor};"></div>
        <div class="pin-body" style="background: ${isSimulated ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : 'linear-gradient(135deg, #0284c7, #06b6d4)'}; border: 2px solid #ffffff;">
          <span class="pin-icon" style="font-size: 1.1rem;">🚶</span>
        </div>
        <div class="pin-tip" style="border-top-color: ${tagColor};"></div>
      </div>
    `,
  });
}

