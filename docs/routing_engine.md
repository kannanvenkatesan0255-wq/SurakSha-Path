# SURAKSHA PATH: ROUTE ENGINE & ALTERNATIVE ROUTE GENERATION (PHASE 6)

> **Navigation & Routing Engine Specification**  
> **Demonstration Domain:** Chennai Metropolitan Area (CMA), Tamil Nadu, India  
> **Primary Provider:** OpenStreetMap / OSRM Driving Engine (`router.project-osrm.org`)  
> **Integration Status:** Complete Phase 6 Implementation

---

## 1. Routing Engine Selection & Architecture

### Selected Routing Engine: **OpenStreetMap / OSRM (Open Source Routing Machine)**
- **API Endpoint:** `https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson&alternatives=true&steps=true`
- **Routing Mode:** Real road-network driving graph calculated over OpenStreetMap way geometries.
- **Provider Rationale:**
  - **Authentic Road Geometry:** Returns detailed coordinate sequences following actual Chennai roads (e.g., Anna Salai, GST Road, Poonamallee High Road, OMR).
  - **Alternative Routes:** Directly supports calculating multi-corridor alternatives across the road graph (`alternatives=true`).
  - **Zero Secret Exposure:** Backend-mediated HTTP calls via `httpx` ensure no external API keys or tokens are ever exposed to the client or stored in frontend bundles.
  - **High Performance:** Response times consistently under 500ms for typical Chennai origin–destination pairs.
  - **Community & Standards:** Based on OpenStreetMap, conforming strictly to ODbL licensing and Open Source conventions.

### Architectural Decoupling
The routing engine is isolated behind a clean service layer in `backend/app/services/routing_service.py`:
- UI and client components never call external routing endpoints directly.
- Provider-specific structures are mapped into canonical `RouteAlternative` and `RouteMetrics` models.
- Upstream routing engine switches (e.g. self-hosted OSRM, Valhalla, or GraphHopper) can be configured via environment variables without altering the frontend or database layers.

---

## 2. Routing Data Model & API Contracts

### A. Coordinates
GeoJSON order `[longitude, latitude]` is converted systematically to Leaflet `[latitude, longitude]` for map rendering.

### B. Route Metrics (`RouteMetrics`)
```json
{
  "distance_km": 9.48,
  "distance_meters": 9482.0,
  "duration_minutes": 10.8,
  "duration_seconds": 648.0,
  "is_live_traffic": false,
  "traffic_model": "Free-flow standard speed limits (OpenStreetMap data)"
}
```

### C. Route Alternative (`RouteAlternative`)
Each route returned includes:
- `route_id`: Stable identifier (e.g., `route-osrm-1`).
- `title`: Domain title (e.g., `FASTEST CORRIDOR`, `BALANCED CORRIDOR`).
- `preference`: `FASTEST` | `BALANCED` | `SAFEST`.
- `summary_roads`: Names of arterial roads traversed (e.g., `Grand Southern Trunk Road, EVR Periyar Salai`).
- `coordinates`: Real GeoJSON coordinate polyline `[[lng, lat], ...]`.
- `metrics`: Standardized `RouteMetrics`.
- `safety_assessment_status`: Explicit state (`PENDING_PHASE_7_SAFETY_SCORING`).
- `safety_score`: `null` (strictly non-fabricated; awaits Phase 7).
- `is_selected`: Boolean indicating active status.
- `disclaimer`: Contextual limitation notice.

### D. Route Request & Response (`/api/routes/plan`)
- **Request (`RoutePlanRequest`):** Accepts `origin`, `destination`, optional schedule (`journey_date`, `departure_time`), and `route_preference`. Validates non-identical endpoints.
- **Response (`RoutePlanResponse`):** Returns canonical `alternatives`, `selected_route_id`, provider attribution, and engine status message.

---

## 3. Environment Variables & Configuration

Configured in `backend/app/config.py` with runtime overrides in `.env`:

```bash
# Routing Provider Configuration
OSRM_ROUTER_URL="https://router.project-osrm.org"
ROUTING_TIMEOUT_SECONDS=8.0
ROUTING_PROVIDER_NAME="OpenStreetMap / OSRM Driving Engine"
ENABLE_OFFLINE_CORRIDOR_FALLBACK=True
```

---

## 4. Key Behavioral Rules & Demarcations

1. **Free-Flow vs Live Traffic:**  
   OSRM calculates travel durations using standard road classifications and legal speed profiles. The platform explicitly labels these as **Free-flow estimates** and **never claims to possess live sensor traffic data**.

2. **Routing vs Safety Scoring:**  
   A fastest route is **not automatically a safe route**. Preferences `BALANCED` and `SAFEST` are preserved as core Suraksha Path options, but their cards explicitly show `Safety Analysis Pending Phase 7` and do not fabricate fake safety percentages, crime probabilities, or artificial safety ranks.

3. **Single Alternative Integrity:**  
   If the routing engine returns only one viable route between two endpoints, the system presents exactly that one route. It **never fabricates fake artificial detours** merely to fill a quota.

4. **Deduplication:**  
   If the routing provider returns alternatives that differ by less than 0.5% in distance and share identical step counts, they are automatically deduplicated.

5. **Offline Corridor Fallback:**  
   If internet connectivity is interrupted or OSRM times out, verified benchmark Chennai road geometries (e.g. Central to T. Nagar via Anna Salai) ensure uninterrupted demonstration without inventing non-existent roads.

---

## 5. Map & UI Synchronization

- **Two-Way Sync:** Selecting a route card in `RouteComparisonPanel` instantly focuses and highlights the corresponding polyline on the Leaflet map. Clicking an unselected dashed polyline on the map activates the route and updates the comparison panel.
- **Visual Distinction:**
  - Selected Route: Bold cyan line (`#06b6d4`, 5px) with deep blue glowing casing (`#0284c7`, 9px).
  - Unselected Alternatives: Subdued slate dashed lines (`#64748b`, 4px, `6, 8` dash array).
- **Auto-Fit Viewport:** Selecting a route automatically fits map bounds to display the entire polyline with comfortable padding.
- **Real-Time HUD:** The bottom cartographic HUD (`MapLegend`) updates dynamically with the active route's distance (km) and estimated travel time (min).

---

## 6. Verification & Automated Tests

All tests can be executed via:
```bash
# Run both backend and frontend test suites
npm test

# Run frontend tests only (includes Leaflet conversion & metric tests)
npm run test:frontend

# Run backend tests only (includes OSRM mock & integration tests)
npm run test:backend

# Run frontend linter
npm --prefix frontend run lint

# Run production bundle build
npm run build:frontend
```
