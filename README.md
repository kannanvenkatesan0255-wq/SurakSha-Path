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

---

## 12. Upcoming Roadmap Phases

1. **Phase 10: Time-Dependent Dynamic Risk Analysis & Nocturnal Modeling**
2. **Phase 11: Real-Time Route Recalibration & Dynamic Deviation Alerts**
3. **Phase 12: Turn-by-Turn Safe Navigation Guidance**
4. **Phase 13: Emergency SOS & Guardian Proximity Sharing**
5. **Phase 14: Historical Safety Analytics & Urban Audit Export**
