# SURAKSHA PATH: CARTOGRAPHIC MAP & GEOSPATIAL WORKSPACE (PHASE 5)

> **Geospatial Infrastructure Specification**  
> **Demonstration Domain:** Chennai Metropolitan Area (CMA), Tamil Nadu, India  
> **Integration Status:** Live Interactive Leaflet Map Canvas

---

## 1. Map Library & Tile Provider Selection

### Selected Map Engine: **Leaflet v1.9.4**
- **Architecture:** Framework-agnostic Leaflet integrated with React 19 via direct DOM `useRef` lifecycle and `ResizeObserver` containment.
- **Why Leaflet Fits Suraksha Path:**
  - Avoids React 19 peer-dependency conflicts common in legacy wrappers.
  - Provides deterministic, flicker-free rendering with immediate cleanup (`map.remove()`) on unmount.
  - Native touch gesture support (pinch zoom, inertia drag) across mobile and desktop devices.
  - Lightweight footprint (~140 kB bundle impact) with zero telemetry or tracking scripts.

### Selected Basemap Providers:
1. **CartoDB Dark Matter (Default):**
   - Tile URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
   - Aesthetic: Deep obsidian background (`#070b12`) matching the Suraksha Path cartographic design tokens. Provides superior contrast for street illumination evidence, police outpost pins, and future safety heatmaps.
2. **CartoDB Voyager (Alternative):**
   - Tile URL: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
   - Aesthetic: Detailed daylight urban view highlighting building outlines and arterial street names for daytime route analysis.
3. **OpenStreetMap Standard:**
   - Tile URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
   - Standard community map tiles for fallback audits.

### Licensing & Attribution Compliance
- **Attribution Display:** Visible in the map footer HUD via `MapLegend.jsx`:
  `© OpenStreetMap contributors © CARTO`
- **Zero-Credential Execution:** All default basemap providers require no paid subscription, API token, or credit card, allowing instant local developer execution.

---

## 2. Geospatial Viewport & Bounding Strategy

- **Default Center:** `[13.0827, 80.2707]` (Chennai Central / Greater Chennai Corporation Headquarters).
- **Default Zoom:** `12` (Captures from Ennore/Madhavaram to Sholinganallur and Central to Poonamallee).
- **Zoom Constraints:** `minZoom = 9`, `maxZoom = 18`.
- **Bounding Box (`maxBounds`):** `[[12.70, 79.85], [13.40, 80.45]]` (Envelops Greater Chennai Corporation and the Chennai Metropolitan Development Authority area).

---

## 3. Environment Variables & Configuration

Suraksha Path supports optional environment variables in `.env` (or via Vite deployment config):

```bash
# Optional: Override basemap with custom self-hosted or proxy tile server
VITE_MAP_TILE_URL="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"

# Optional: Custom attribution string (if using self-hosted tiles)
VITE_MAP_ATTRIBUTION="&copy; OpenStreetMap contributors &copy; CARTO"

# Optional: Mapbox or Stadia (Future expansion)
# VITE_MAPBOX_TOKEN=
# VITE_STADIA_MAPS_KEY=
```

*Note: If no variables are set, Suraksha Path defaults automatically to CartoDB Dark Matter with full OpenStreetMap attribution.*

---

## 4. Key Features & Interactions

### A. Location Selection & Synchronization
- **Two-Way Synchronization:** Typing an address or selecting a corridor preset in the Route Planning form immediately updates origin/destination pins on the map and fits viewport bounds.
- **Click-to-Select on Map:** Users can click anywhere on the Chennai map canvas:
  - If near a verified landmark in the Chennai catalog (<= 400m), it resolves the recognized name (e.g., `T. Nagar Bus Terminus (Vicinity)`).
  - If in an arbitrary area, it accurately displays exact coordinates `(13.xxxx° N, 80.xxxx° E)` without fabricating fake street addresses.
  - Interactive popup provides buttons: `📍 Set Origin` and `🏁 Set Dest`.

### B. High-Contrast Accessible Markers
- **Origin Pin (A):** Pointed teardrop geometry with emerald neon border (`#10b981`), pulsing aura, and bold letter `A`.
- **Destination Pin (B):** Flag badge geometry with amber neon border (`#f59e0b`), pulsing aura, and bold letter `B`.
- **WCAG Compliance:** Distinct geometric shapes, glyphs (`A` vs `B`), and icons (`📍` vs `🏁`) guarantee accessibility without relying on color alone.

### C. Floating Map Controls
- **Zoom In / Zoom Out (`+` / `−`):** High-contrast, keyboard-accessible buttons with minimum 32px touch targets.
- **Reset View (`⌖`):** Smoothly flies back to the default Chennai center at zoom 12.
- **Fit Route (`⛶`):** Zooms and pans to frame both active endpoints with 60px padding.
- **Basemap Mode Toggle:** Instantly switches between "Dark Canvas" and "Street".

### D. Separation of Map Rendering from Routing & Risk Scoring
- Cartographic display logic is isolated inside `frontend/src/components/map/`.
- Routing graph algorithms and multi-criteria risk scoring remain decoupled in `backend/app/services/`.
- Future safety layers (polylines, segment heatmaps, crowd reports) plug into `mapOverlays.js` via standard GeoJSON / LayerGroup registration without modifying the core map component.

---

## 5. Verification & Testing

Run the automated test suite from the root directory:
```bash
# Run both backend and frontend tests
npm test

# Run frontend tests only
npm run test:frontend

# Build frontend production bundle
npm run build:frontend
```
