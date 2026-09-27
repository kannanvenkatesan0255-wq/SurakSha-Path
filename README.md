# SURAKSHA PATH (सुरक्षा पथ)

> **Evidence-Based, Context-Aware Safe Route Navigation Prototype for Chennai, India**

---

## 1. Project Purpose & Overview

**Suraksha Path** is an evidence-based, context-aware safe route navigation prototype designed for urban mobility, initially demonstrated across key transit and arterial corridors in **Chennai, India**.

Traditional navigation tools optimize almost exclusively for minimal distance or minimal travel duration. When safety is treated as a secondary metric or opaque penalty factor, users are left without context, unable to discern *why* a particular path was selected or whether a two-minute shortcut leads down an isolated, unlit road.

Suraksha Path introduces a transparent, verifiable routing paradigm that evaluates road networks at the discrete **segment level**, weighs community intelligence based on credibility and recency, and offers travelers clear comparisons between **Fastest**, **Balanced**, and **Safest** routes.

---

## 2. Core Concepts & Innovations

1. **Safety is Distinct from Distance:** A 500-meter shortcut that traverses an unlit alley or isolated underpass carries drastically different risk characteristics than a well-lit arterial avenue.
2. **Road-Segment Level Risk:** Risk is not evaluated as a generic neighborhood radius; it is calculated for discrete road links based on verifiable parameters (lighting, footfall, CCTV, police posts).
3. **Safety Score vs. Confidence Score:**
   - **Safety Score (0–100):** Evaluates environmental safety based on available factors.
   - **Confidence Score (0–100):** Measures the density, recency, and corroboration of the underlying evidence. High safety with low confidence indicates an under-audited area; moderate safety with high confidence indicates well-corroborated telemetry.
4. **Three Essential Innovations:**
   - **Trust-Weighted Community Intelligence:** Crowd reports are calibrated using time-decay functions, independent corroboration counts, and reporter reliability track records.
   - **Safety–Time Trade-Off Comparisons:** Transparent multi-route presentation comparing **Fastest**, **Balanced**, and **Safest** alternatives so users make informed personal mobility decisions.
   - **Feedback-Driven Closed-Loop Reassessment:** Post-journey feedback identifies traversed segments and triggers on-the-fly score re-evaluations.
5. **Ethical Guardrails & Disclaimers:**
   - **Strict Disclaimer:** *Suraksha Path is an evidence-based contextual advisory tool. It does not predict crime events and does not guarantee personal safety.*
   - **Clear Demonstration Labeling:** All synthetic demonstration segments and reports are explicitly labeled as synthetic.

---

## 3. Confirmed Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React + Vite | React 19, Vite 8 | Fast, modern component-based cartographic UI |
| **Mapping Engine** | Leaflet | 1.9.4 | Interactive geospatial canvas & custom vector overlays |
| **Styling** | Vanilla CSS (Design Tokens) | CSS3 / Glassmorphic | Curated palette, dark theme, fluid typography |
| **Backend** | Python + FastAPI | Python 3.13, FastAPI 0.139 | High-performance asynchronous REST API |
| **ASGI Server** | Uvicorn | 0.51.0 | Fast ASGI production/development server |
| **Database** | SQLite + SQLAlchemy | SQLAlchemy 2.0 | Spatial graph schema, zero-credential local DB |
| **Data Validation** | Pydantic v2 | 2.13.4 | Strict schema serialization and request validation |
| **Test Suite** | Python `unittest` + Node test runner | Built-in | Automated API, database, and map logic verification |

---

## 4. Project Directory Structure

```text
suraksha-path/
├── .env.example                     # Environment configuration template
├── .gitignore                       # Git exclusion rules (secrets, dependencies, caches)
├── package.json                     # Root npm script runner for unified execution
├── README.md                        # Primary project documentation
├── data/                            # Local SQLite database directory (ignored by git)
├── docs/
│   └── architecture.md              # Detailed architecture & service boundary specs
├── backend/
│   ├── requirements.txt             # Python dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                # Pydantic & dotenv configuration settings
│   │   ├── database.py              # SQLAlchemy engine, session, and health check
│   │   ├── main.py                  # FastAPI entry point, CORS, lifespan, exception handlers
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── health.py            # GET /api/health endpoint
│   │   │   └── routes.py            # Centralized API router (routing, community, feedback)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── domain.py            # SQLAlchemy models (RoadSegment, CommunityReport, etc.)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── health.py            # System & database health response models
│   │   │   ├── routing.py           # Multi-route request and alternative schemas
│   │   │   ├── risk.py              # Segment risk, weights, and evidence schemas
│   │   │   ├── community.py         # Trust-weighted community report schemas
│   │   │   └── feedback.py          # Post-journey feedback & reassessment schemas
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── routing_service.py   # Multi-route generation boundary
│   │       ├── route_optimization_service.py # Phase 10 safety-time trade-off engine
│   │       ├── risk_service.py      # Micro-level segment risk boundary
│   │       ├── confidence_engine.py # Separate confidence calculation engine
│   │       ├── evidence_service.py  # Evidence query & audit boundary
│   │       ├── community_service.py # Trust-weighting crowd calculation boundary
│   │       └── feedback_service.py  # Segment reassessment trigger boundary
│   └── tests/
│       ├── __init__.py
│       ├── test_health.py           # Unit tests for /api/health & root
│       └── test_database.py         # Unit tests for DB connection & table creation
└── frontend/
    ├── package.json                 # Frontend dependencies and Vite build scripts
    ├── index.html                   # HTML5 shell with Google Fonts (Outfit, Inter)
    ├── vite.config.js               # Vite bundler configuration
    └── src/
        ├── main.jsx                 # React root mount
        ├── App.jsx                  # Main shell coordinator
        ├── App.css                  # Animations and responsive layout
        ├── index.css                # Design system tokens and glassmorphic UI
        ├── config/
        │   └── appConfig.js         # Frontend config & environment defaults
        ├── api/
        │   ├── client.js            # Centralized HTTP client (network/timeout error handling)
        │   └── health.js            # Telemetry probe calling GET /api/health
        ├── components/
        │   ├── common/
        │   │   ├── Badge.jsx        # Status pill and confidence badge component
        │   │   ├── Card.jsx         # Glassmorphic card container
        │   │   └── Button.jsx       # Interactive button with hover micro-animations
        │   ├── shell/
        │   │   ├── Header.jsx       # Top brand bar with Chennai indicator
        │   │   ├── Navigation.jsx   # Tab navigation coordinator
        │   │   ├── ServiceStatusBar.jsx # Live telemetry probe displaying API status
        │   │   └── Footer.jsx       # Ethical disclaimer and architecture metadata
        │   └── views/
        │       ├── HomeView.jsx     # Overview & core innovations dashboard
        │       ├── PlanRouteView.jsx # Route planning inputs and map mount container
        │       ├── RouteResultsView.jsx # Multi-route comparison (Fastest, Balanced, Safest)
        │       ├── EvidenceView.jsx # Segment-level evidence factors
        │       ├── CommunityView.jsx# Trust-weighted crowd reporting
        │       └── ActivityView.jsx # Feedback and reassessment loop status
        └── utils/
            └── constants.js         # Navigation tabs and Chennai corridors list
```

---

## 5. Prerequisites

Before running the application, ensure the following are installed:
- **Node.js**: v18.0.0 or higher (v24.x tested and confirmed)
- **npm**: v9.0.0 or higher (v11.x tested and confirmed)
- **Python**: v3.10 or higher (v3.13 tested and confirmed)
- **Git**: v2.30 or higher

---

## 6. Installation Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/kannanvenkatesan0255-wq/SurakSha-Path.git
   cd SurakSha-Path
   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Install Backend Dependencies:**
   ```bash
   python -m pip install -r backend/requirements.txt
   ```

---

## 7. Environment Setup

Copy the example environment configuration:
```bash
cp .env.example .env
```
*(No third-party API keys are required for local prototype operation).*

---

## 8. Database Setup

Initialize the SQLite spatial graph database tables:
```bash
npm run init:db
```
*(Or execute directly via Python: `python -c "from backend.app.database import init_db; init_db()"`).*

---

## 9. Running the Application

### Option A: Run Both Services Concurrently
In two separate terminals:

* **Terminal 1: Start Backend API (FastAPI + Uvicorn)**
  ```bash
  npm run dev:backend
  ```
  *The backend will be available at:* `http://127.0.0.1:8000`  
  *Interactive Swagger API Documentation:* `http://127.0.0.1:8000/docs`

* **Terminal 2: Start Frontend (Vite + React)**
  ```bash
  npm run dev:frontend
  ```
  *The frontend will be available at:* `http://localhost:5173`

---

* **Run Full Test Suite (Backend + Frontend):**
  ```bash
  npm test
  ```
  *(Executes Python unittest suite and Node test runner, verifying all API contracts and map utilities).*

* **Run Backend Unit Tests:**
  ```bash
  npm run test:backend
  ```

* **Run Frontend Unit Tests:**
  ```bash
  npm run test:frontend
  ```
  *(Executes `node --test src/tests/*.test.js` verifying coordinates validation, Haversine calculations, basemap providers, and layer schemas).*

* **Run Frontend Build Verification:**
  ```bash
  npm run build:frontend
  ```
  *(Executes `vite build` verifying zero syntax errors, correct module resolution, and clean bundle generation).*

---

## 11. Current Implementation Status

- [x] **Phase 1: Project & Git Audit:** Workspace verified, clean slate audited, remote origin configured.
- [x] **Phase 2: Application Architecture & Project Foundation:** Decoupled FastAPI backend + React 19 frontend, SQLite database with SQLAlchemy domain models, health check endpoint, centralized API client, automated unit tests.
- [x] **Phase 3: Professional UI Design System & Navigation:**
  - Distinctive, restrained geospatial design tokens (`index.css`) with dark cartographic canvas, high-contrast semantic risk colors (LOW, MEDIUM, HIGH paired strictly with text labels), and tabular numerals.
  - Comprehensive reusable domain components (`AppShell`, `AppHeader`, `PrimaryNavigation`, `ServiceStatusBar`, `StatusBadge`, `Button`, etc.).
  - Functional views: `HomeView`, `PlanRouteView`, `EvidenceView`, `CommunityView`, and `ActivityView`.
- [x] **Phase 4: Route Planner & Journey Configuration:**
  - Interactive location inputs with curated Chennai location catalog suggestions and location swap control (`⇅`).
  - Temporal context controls (journey date & departure time presets) and safety–time preference selector (`FASTEST`, `BALANCED`, `SAFEST`).
  - Strict validation preventing empty or identical endpoints and past dates.
  - Typed backend API contract `POST /api/routes/plan` returning honest `PENDING_ROUTING_ENGINE_PHASE_5` without fabricating mock routes or scores.
- [x] **Phase 5: Interactive Chennai Map & Geospatial Workspace:**
  - Integrated Leaflet 1.9.4 cartographic engine centered on Chennai Metropolitan Area (`13.0827° N, 80.2707° E`, zoom 12).
  - Configurable basemaps: CartoDB Dark Matter (default nocturnal theme), CartoDB Voyager (street navigation), and OpenStreetMap.
  - High-contrast, accessible `L.divIcon` markers: Origin (Emerald A / 📍) and Destination (Amber B / 🏁) with pulsing visual aura and non-color-exclusive shapes.
  - Interactive map click-to-select workflow with Chennai landmark proximity matching and exact coordinate readouts.
  - Accessible floating controls: Zoom in/out, Reset View to Chennai center, Fit Endpoints, and Basemap switcher.
  - Cartographic status HUD & Legend with coordinate readouts, air distance in km, active markers, and visible attribution.
  - Layer overlay registration points for verified infrastructure (police posts, lighting stretches) and future safety heatmaps.
- [x] **Phase 7: Road Network Segmentation & Geospatial Data Foundation:**
  - Typed, extensible `RoadSegment` database model with dynamic SQLite schema migration (`source_feature_id`, `road_classification`, `source_dataset`, `source_metadata_json`, `from_node_id`, `to_node_id`).
  - Sourced OpenStreetMap road-network dataset covering 23 core Chennai arterial corridors (Anna Salai, Poonamallee High Road, GST Road, Rajiv Gandhi Salai / OMR, Kamarajar Salai, Sardar Patel Road, Usman Road, Dr. Radhakrishnan Salai, Pantheon Road) with genuine OSM way IDs (`way/24483756`), authentic road classifications, speed limits, lanes, and ODbL licensing.
  - Reusable, idempotent `RoadNetworkService` ingestion pipeline with duplicate detection, Great-Circle Haversine distance and point-to-line projection formulas, and startup auto-ingestion.
  - Deterministic segment identifier strategy (`SEG-OSM-W{way_id}`) with SHA-256 coordinate fingerprint fallback.
  - Route-to-segment association layer (`match_route_to_segments`) mapping real route coordinate polylines to traversed road segments in sequential chronological order, computing coverage ratios and explicitly accounting for unmatched portions.
  - Spatial query interfaces: `/api/segments`, `/api/segments/{code}`, `/api/segments/bbox`, `/api/segments/near`, `/api/segments/match-route`, and `/api/segments/provenance`.
  - Leaflet cartographic visualization with togglable `ROAD_SEGMENTS` overlay, neutral sourced styling, and interactive segment inspection without fabricated safety scores.
  - Integrated traversed segment breakdown cards in `RouteAlternativeCard`.
  - Comprehensive automated test suite: 11 backend tests + 6 frontend tests (total 42 passing tests across project).
  - Detailed documentation in `docs/road_network_foundation.md`.

- [x] **Phase 8: Evidence-Based Safety Data & Risk Assessment Engine:**
  - Modular, explainable safety-evidence and risk-assessment engine evaluating discrete road segments and producing route-level safety comparisons.
  - Sourced Chennai evidence baseline linked to 23 OpenStreetMap arterial segments: Greater Chennai Corporation (GCC) smart LED telemetry, Greater Chennai Police outposts (Central D-2, Saidapet J-1, Guindy J-3, Taramani J-13, Mambalam R-1), pedestrian infrastructure, and verified commercial footfall.
  - Mathematical risk scoring with anchor heuristics (50.0 baseline, bounded $[15.0, 95.0]$), exponential time-decay freshness policies, separate confidence engine, and explicit missing-data outcomes (`INSUFFICIENT_DATA` with `safety_score=None`, never assumed zero risk).
  - Route-level length-weighted safety aggregation with explicit unassessed distance accounting and nocturnal departure lighting evaluation.
  - REST endpoints: `/api/safety/segments/{code}`, `/api/safety/routes/evaluate`, `/api/safety/evidence`, `/api/safety/provenance`, `/api/safety/methodology`.
  - Frontend integration: Live evidence explorer, dataset provenance tables, safety score and confidence badges in route alternative cards.
- [x] **Phase 9: Trust-Weighted Community Intelligence & Report Verification:**
  - Complete, integrated community reporting and verification workflow allowing commuters to record location-based observations.
  - Controlled 9-category urban mobility taxonomy (`POOR_LIGHTING`, `DESERTED_STRETCH`, `OBSTRUCTED_FOOTPATH`, `ISOLATED_UNDERPASS`, `SUSPICIOUS_LOITERING`, `ROAD_HAZARD`, `ACTIVE_POLICE_PRESENCE`, `HIGH_PEDESTRIAN_FOOTFALL`, `INFRASTRUCTURE_DAMAGE`) with category-specific half-life decay and max validity windows.
  - Calibrated trust-weight calculation ($W = R \times C \times T \times V \times D$) factoring reporter reliability, independent corroboration tallies, recency time decay, transparent verification status, and community disputes.
  - Strict abuse prevention: single active interaction per user per report enforced via database unique constraint, self-corroboration prevention, rate limiting (5 reports/hr, 25 interactions/hr), and spatial duplicate detection (120m, 24h).
  - Dynamic reassessment: syncing `EvidenceItem` (`EVD-{report_id}`) and triggering instant re-evaluation of affected road segments and route safety.
  - Complete report lifecycle state machine: `SUBMITTED`, `UNDER_REVIEW`, `VERIFIED`, `DISPUTED`, `REJECTED`, `EXPIRED` with administrative moderation controls (`X-Admin-Key`).
  - Privacy safeguards: reporter IDs masked as `Community Contributor #XXXX`, zero personal data storage or exposure.
  - REST endpoints: `GET /api/community/categories`, `GET /api/community/reports`, `POST /api/community/reports`, `GET /api/community/reports/{id}`, `POST /api/community/reports/{id}/confirm`, `POST /api/community/reports/{id}/dispute`, `POST /api/community/reports/{id}/flag`, `POST /api/community/reports/{id}/moderate`.
  - Interactive UI: Chennai landmark quick-selectors, live filterable community feed, confirmation/dispute/flag buttons, and expandable mathematical explainability drawer.
  - Comprehensive test suite: 13 backend unit/integration tests + 7 frontend tests.

- [x] **Phase 10: Safety–Time Trade-Off & Route Preference Engine:**
  - Reusable, testable `RouteOptimizationService` implementing multi-objective Pareto utility balancing for `FASTEST`, `BALANCED`, and `SAFEST` strategies.
  - Practical detour constraint enforcement on `SAFEST` candidate ($T \le 1.40 \cdot T_{\min}$ or $+20$ min max) with explicit warnings when exceeded.
  - Dynamic candidate classification and assignment of distinct route types rather than static index mapping.
  - Data-driven, metric-traceable trade-off explanations detailing travel time savings vs. segment safety scores.
  - Strict distinction between Safety Score [15–95] and Data Confidence [10–100%].
  - Evidence coverage accounting ($L_{\text{assessed}} / L_{\text{total}}$) with explicit warnings when coverage is below 25%.
  - Single-route honesty: refuses to clone artificial duplicates when only 1 corridor is returned by the routing engine.
  - In-memory segment assessment caching in `RiskService` to avoid redundant spatial evaluations within a request.
  - UI integration: `RouteAlternativeCard` trade-off chips (+X min detour, +Y pts safety, % coverage), executive trade-off landscape callout in `RouteComparisonPanel`, and dynamic preference switching in `PlanRouteView`.
  - Comprehensive automated test suite: 61 backend unit/integration tests + 33 frontend tests (94 total passing tests).
  - Detailed documentation in `docs/safety_time_tradeoff_engine.md`.

- [x] **Phase 11: Route Explainability, Safety Score & Confidence Dashboard:**
  - Interactive, polished `RouteExplainabilityDashboard` integrated with route results, offering 5 comprehensive sub-views: Overview, Evidence Streams, Traversed Segments, Trade-Off Matrix, and Metric Semantics.
  - Authoritative metric definitions:
    - **Safety Score (15.0–95.0 pts, 50.0 anchor):** Length-weighted environmental protective infrastructure index. Does NOT claim to predict crime or guarantee safety.
    - **Data Confidence (10.0%–100.0%):** Epistemic measure of data completeness, multi-category diversity, record density, and verification status. Independent from Safety Score.
    - **Evidence Coverage (0.0%–100.0%):** Physical proportion of route distance supported by registered evidence ($L_{\text{assessed}} / L_{\text{total}}$). Sparse coverage caution flag when $< 25\%$. Absence of reports is strictly treated as unknown condition, never assumed safety.
  - Evidence stream contribution breakdown across all 5 core Chennai sources (Lighting 35%, Police 20%, Pedestrian 15%, Road 15%, Community 15%) with active counts, point impacts, data sources, and urban limitations.
  - Granular segment-level explainability with interactive corridor progression bar and **bidirectional Leaflet map synchronization**: selecting a segment in the panel highlights its exact geometry on the map with a glowing casing (`#f59e0b`) and opens an inspector callout; clicking a segment on the map selects it in the dashboard.
  - Dynamic, data-driven "Why This Route?" trade-off justifications explaining travel time savings vs. safety score differences for `FASTEST`, `BALANCED`, and `SAFEST` strategies.
  - Active uncertainty, freshness decay, and nocturnal departure lighting advisory handling.
  - Dedicated REST endpoints: `POST /api/safety/routes/explain` and `GET /api/safety/semantics`.
  - Comprehensive automated test suite: 72 backend unit tests + 43 frontend unit tests (115 total tests passing across project).
  - Detailed documentation in `docs/route_explainability_dashboard.md`.

- [x] **Phase 12: Feedback-Driven Reassessment & Continuous Improvement:**
  - Structured feedback intake (`FeedbackService`) with controlled taxonomy (`CONDITION_CHANGED`, `OBSERVATION_OUTDATED`, `REPORT_INACCURATE`, `INFRASTRUCTURE_ISSUE`, `ASSESSMENT_INCONSISTENT`, `LOCATION_ASSOCIATION_ERROR`, `GENERAL_PRODUCT_FEEDBACK`).
  - Strict separation of general product feedback: `GENERAL_PRODUCT_FEEDBACK` (UI/UX comments, audio language requests) is archived and resolved without ever altering road segment weights or routing calculations.
  - Operational intents supporting nuanced civic participation: `NEW_OBSERVATION`, `CORRECTION`, `CONFIRMATION`, `DISPUTE`, and `GENERAL_FEEDBACK`.
  - Comprehensive lifecycle management (`SUBMITTED`, `PENDING_REVIEW`, `ACCEPTED`, `REJECTED`, `DISPUTED`, `RESOLVED`, `EXPIRED`) with administrative moderation controls and prevention of self-moderation.
  - Controlled segment reassessment with atomic cache invalidation in `RiskService`, deterministic score recalibration ($S \in [15.0, 95.0]$, $C \in [10.0, 100.0]\%$), and immutable `ReassessmentAuditLog` recording before-and-after metric deltas ($\Delta S$, $\Delta C$).
  - Route-level refresh without altering verified kinematics: geometry, distance, and duration are preserved while safety metrics and explainability reports are dynamically updated.
  - Anti-abuse safeguards: rate limiting (10 submissions/hr), duplicate detection (2-hour window), client-supplied idempotency keys, and privacy-preserving reporter pseudonym masking (`che****er_77`).
  - Non-predictive safety boundaries: score updates explicitly disclaim crime prediction and personal safety guarantees; absence of reports is never treated as proof of safety.
  - Comprehensive UI workspace in `ActivityView.jsx`: interactive submission console, filterable audit log ledger with delta indicators, submitted feedback tracker, moderator review queue with live score recalculation, and governance policies.
  - REST endpoints: `GET /api/feedback/types`, `POST /api/feedback/submit`, `GET /api/feedback`, `GET /api/feedback/{id}`, `POST /api/feedback/{id}/review`, `POST /api/feedback/reassess-segment/{code}`, `POST /api/feedback/reassess-route`, `GET /api/feedback-audit-log`, `GET /api/feedback/segment/{code}/history`.
  - Comprehensive automated test suite: 81 backend unit/integration tests + 51 frontend tests (132 total passing tests across the workspace).
  - Detailed documentation in `docs/feedback_driven_reassessment.md`.

- [x] **Phase 13: Real-Time Context, Time-of-Day & Environmental Adjustments:**
  - Astronomical solar position engine using NOAA formulation calibrated to Chennai coordinates ($13.0827^\circ\text{ N}, 80.2707^\circ\text{ E}$) and `Asia/Kolkata` timezone (IST: UTC+5:30), calculating solar noon, equation of time, solar elevation, sunrise/sunset, civil dawn/dusk, and time-dependent lighting relevance ($0.20$ to $1.00$) and footfall attenuation curve ($0.35$ to $1.00$).
  - Open-Meteo meteorological telemetry integration: current observations, hourly forecasts for future scheduled departures, WMO weather descriptions, precipitation rate, and deterministic seasonal climatological fallback (`HISTORICAL_CLIMATE_BASELINE`).
  - Bounded segment contextual modifier strictly clamped to $[-8.0, +5.0]$ points.
  - Low-lying Chennai underpass waterlogging risk detection (Vyasarpadi, Gengu Reddy, RBI subways) during heavy rainfall ($\ge 2.5\text{ mm/h}$).
  - Double-counting safeguard: dampens contextual weather/lighting penalty ($0.65\times$) when verified community hazard/lighting reports already exist on that segment.
  - Route-level progressive traversal offset calculation, context aggregation, and kinematic invariance (route geometry, distance, and duration remain strictly invariant).
  - Dedicated REST endpoints: `GET /api/context/current`, `POST /api/context/evaluate`, `POST /api/context/reassess-route`.
  - UI integration: Live solar badge and weather pill in `JourneyDateTimeControls.jsx`, instant "Reassess Routes for Current Date/Time" action in `PlanRouteView.jsx`, contextual chips in `RouteAlternativeCard.jsx`, and a comprehensive "Time & Weather" tab in `RouteExplainabilityDashboard.jsx`.
  - Comprehensive automated test suite: 92 backend unit/integration tests + 61 frontend tests (153 total passing tests across the workspace).
  - Detailed documentation in `docs/context_and_environmental_adjustments.md`.

- [x] **Phase 14: Safety Check-In, Journey Monitoring & SOS Workflow:**
  - Robust journey lifecycle state machine enforcing valid transitions (`NOT_STARTED`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`) with strict rejection of invalid or duplicate actions.
  - Opt-in, consent-based safety check-in engine with configurable cadences (30s demo, 1m demo, 5m, 10m, 15m standard, 30m), live elapsed timers, and next-check-in countdown progress indicators.
  - Prompt workflow with large touch targets ("✅ I'm OK" and "⚠️ I need help").
  - Grace-period missed check-in handling: non-alarmist epistemic standard (uncertain signal; does not prove danger; no silent emergency alerts).
  - Accessible, deliberate emergency SOS workflow: 2-second press-and-hold activation or accessible confirmation modal preventing accidental triggers.
  - Unmistakable SOS-active state with verified Chennai emergency directory shortcuts (Police 100/112, Women Helpline 1091, Ambulance 108, GCC Flood 1913, Traffic 103, Fire 101) with direct `tel:` dialing.
  - Strict location privacy: location sharing is off by default, opt-in consent only, device coordinates processed strictly in local browser memory without remote storage or server logging.
  - Transparent distinction between live device GPS (`LIVE_GPS`) and simulated progression coordinates (`SIMULATED_DEMO`).
  - Auditable minimal journey event ledger with IST timestamps, no sensitive coordinates, and local history clearing controls.
  - Local persistence in browser `localStorage` with corrupted-state validation, preserving paused journeys across reloads.
  - Dedicated REST endpoints: `GET /api/journey/helplines`, `POST /api/journey/session`, `GET /api/journey/session/{id}`, `POST /api/journey/transition`.
  - UI integration: Dedicated `JourneyMonitorView.jsx` workspace, `NAV_TABS.MONITOR` navigation tab, "Start Journey Monitoring with this Route" action in `PlanRouteView.jsx`, and current commuter location pulsing beacon in `InteractiveMap.jsx`.
  - Comprehensive automated test suite: 102 backend unit/integration tests + 71 frontend tests (**173 total passing tests across the workspace**).
  - Detailed documentation in `docs/journey_monitoring_and_sos.md`.

- [x] **Phase 15: Journey Insights, Safety Analytics & Personalised Route Preferences:**
  - Dynamic **Journey Insights Dashboard** computing authentic metrics from recorded commuter history: completed journeys, cancelled trips, total travel distance, travel time, and average duration.
  - Strict calculation integrity: cancelled or incomplete journeys are tracked in status audits but **strictly excluded** from cumulative completed distance and travel time.
  - Flexible temporal and categorical filters: 7-day, 30-day, and all-time range filters; route type filters (`FASTEST`, `BALANCED`, `SAFEST`); and status filters (`COMPLETED`, `CANCELLED`).
  - Accessible, responsive charting suite with high-contrast text and tabular alternatives: completed journeys over time, duration histogram, route-type distribution, and side-by-side alternative comparison.
  - Epistemic clarity and non-predictive safety boundaries: **Safety Score** ($15.0 - 95.0$) and **Epistemic Confidence** ($10.0 - 100.0\%$) are kept strictly distinct. Higher safety scores reflect well-lit, active infrastructure, never a prediction of crime or personal safety guarantee.
  - **Evidence Coverage & Uncertainty Explorer**: Categorizes segment data into 4 evidential states (No evidence recorded, Outdated/stale, Limited corroboration, Strong multi-source coverage) with transparent half-life decay indicators.
  - **Personalised Route Preferences Panel**: Commuter-controlled sliders and toggles for Speed vs. Safety balance, maximum acceptable detour tolerance ($0 - 45\text{ mins}$), avoid unlit streets during nocturnal hours, and minimum confidence thresholds.
  - **Routing Integration with Separation of Concerns**: Preferences adjust alternative ranking without artificially inflating underlying segment safety scores.
  - Privacy-first local custody: Personal travel histories stored strictly on-device via `localStorage` with address masking, zero background tracking, confirmed two-step history wipe, and preference reset.
  - Isolated demonstration mode: Pre-seeded Chennai commuter sample journeys labeled with `is_demo: true` and toggleable without contaminating real user history.
  - Dedicated REST endpoints: `GET /api/journey/history`, `POST /api/journey/record`, `GET /api/journey/analytics`, `DELETE /api/journey/history`, `GET /api/preferences/route`, `POST /api/preferences/route`, `POST /api/preferences/route/reset`.
  - UI integration: Dedicated `JourneyInsightsView.jsx` workspace, `NAV_TABS.INSIGHTS` navigation tab, personalized preferences drawer in `PlanRouteView.jsx`, and automatic journey history archiving in `JourneyMonitoringWorkspace.jsx`.
  - Comprehensive automated test suite: 111 backend unit/integration tests + 81 frontend tests (**192 total passing tests across the workspace**).
  - Detailed documentation in `docs/journey_insights_and_preferences.md`.

- [x] **Phase 17: Security, Authentication, Privacy & Production Readiness:**
  - Hardened administrative authentication with **constant-time credential comparison** (`secrets.compare_digest`) protecting moderation endpoints against timing side-channel attacks.
  - Standardized Bearer token authentication (`Authorization: Bearer <token>`) alongside custom `X-Admin-Key` headers for enterprise integration.
  - Strict **self-moderation prevention gates** in community intelligence and feedback review workflows, forbidding contributors from verifying their own observations.
  - Defensive **HTTP security headers middleware**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection: 1; mode=block`, `Permissions-Policy: geolocation=(self)...`, and customized `Content-Security-Policy` permitting Leaflet tiles, Open-Meteo API, OSRM routing, and Google Fonts.
  - Request body size limit enforcement (`RequestSizeLimitMiddleware` rejecting payloads $> 1\text{ MB}$ with `413 Payload Too Large`) preventing Denial-of-Service memory exhaustion.
  - Thread-safe in-memory sliding-window **Rate Limiting** across report submissions, feedback intakes, and moderation actions (`429 Too Many Requests` with `Retry-After`).
  - Comprehensive **input sanitization** (`sanitize_user_text`) and safe URL protocol validation (HTTP/HTTPS only) preventing XSS, markup injection, and dangerous `javascript:` or `data:` URIs.
  - Elimination of `dangerouslySetInnerHTML` in frontend components (`MapLegend.jsx`) for complete render safety.
  - Sanitized global exception handling preventing reflection of sensitive query strings or internal stack traces in client error responses.
  - Privacy-first architecture: Location sharing strictly **OFF by default**, pseudonymous reporter ID masking (`che****_42`), and confirmed one-click history deletion.
  - Comprehensive automated test suite: 124 backend unit/integration tests + 87 frontend tests (**211 total passing tests across the workspace**).
  - Detailed documentation in `docs/security_and_production_readiness.md`.

- [x] **Phase 18: End-to-End Integration, User Acceptance Testing & Bug Fixing:**
  - Complete end-to-end integration and stabilization of all 8 core user workflows (Flows A through H) across frontend and backend.
  - Comprehensive feature inventory audit covering route planning, interactive maps, segment risk assessment, community reporting, journey monitoring, check-ins, SOS prototype, safety analytics, route preferences, and security/privacy boundaries.
  - Cross-component state consistency verification between route planner, Leaflet map overlays, journey tracking state machine, local archival storage, and insights dashboard.
  - Automated backend integration test suite (`backend/tests/test_e2e_integration.py`) covering all 8 workflows with deterministic synthetic test fixtures.
  - Automated frontend integration test suite (`frontend/src/tests/e2e_integration.test.js`) covering navigation, route selection, explainability, check-in cycles, SOS workflows, metrics aggregation, preferences, and privacy controls.
  - Fixed subtle integration defects: cleaned up unused imports, prevented rate-limit collisions in persistent databases, and resolved storage key assertions.
  - Zero-error frontend production build (`npm run build`) and zero-error linter (`oxlint`).
  - Comprehensive automated test suite: 132 backend unit/integration tests + 95 frontend tests (**227 total passing tests across the workspace**).
  - Detailed documentation in `docs/e2e_integration_and_uat.md`.

---

## 12. Upcoming Roadmap Phases

1. **Phase 16: Offline PWA & Offline Network Caching**
2. **Phase 19: Civic Authority Open Data Integration & Automated Spatial Auditing**






