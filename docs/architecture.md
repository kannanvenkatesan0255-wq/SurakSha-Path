# SURAKSHA PATH: SYSTEM ARCHITECTURE SPECIFICATION

> **Phase 2 Technical Blueprint: Foundation, Service Boundaries, and Geospatial Intelligence Design**  
> **Demonstration Domain:** Chennai Metro Urban Corridors, Tamil Nadu, India

---

## 1. System Architecture Overview

Suraksha Path implements a decoupled, modern multi-tier geospatial architecture consisting of:
1. **Frontend Presentation Tier:** React 19 + Vite client with a domain-tailored cartographic design system and responsive application shell.
2. **Backend Application Tier:** Python 3.13 + FastAPI REST API orchestrating domain services, request validation, and spatial graph algorithms.
3. **Data Persistence Tier:** SQLAlchemy 2.0 ORM with a local SQLite spatial database engine designed for zero-dependency local execution.
4. **Domain Services & Engines:** Modular boundaries for Routing, Segment Risk, Confidence, Evidence Auditing, Community Intelligence, and Feedback Reassessment.

```text
+-----------------------------------------------------------------------------------+
|                            FRONTEND (React 19 + Vite)                             |
|                                                                                   |
|  [Header / Brand]         [ServiceStatusBar]               [Navigation Tabs]      |
|  [Home / Overview]        [Plan Route (Map)]               [Route Comparison]     |
|  [Evidence Explorer]      [Community Reports]              [Feedback Reassess]    |
|                                                                                   |
|                   Centralized ApiClient (Timeout / Network Failures)              |
+-----------------------------------------------------------------------------------+
                                         │
                                         │ REST API / JSON (CORS Enabled)
                                         ▼
+-----------------------------------------------------------------------------------+
|                             BACKEND API (FastAPI)                                 |
|                                                                                   |
|  GET /api/health          POST /api/routes/plan            POST /api/community    |
|  GET /docs (Swagger)      POST /api/feedback               Pydantic Schemas       |
+-----------------------------------------------------------------------------------+
       │                                                         │
       │ Sessions / Queries                                      │ Service Calls
       ▼                                                         ▼
+-----------------------------+        +--------------------------------------------+
|      DATABASE TIER          |        |          DOMAIN SERVICE BOUNDARIES         |
|                             |        |                                            |
|  SQLAlchemy 2.0 ORM Models: |        |  1. RoutingService                         |
|  - RoadSegment              |        |     (Fastest, Balanced, Safest alternatives)|
|  - EvidenceItem             |        |  2. RiskService                            |
|  - CommunityReport          |        |     (Micro-level segment risk evaluation)  |
|  - RouteEvaluation          |        |  3. ConfidenceEngine                       |
|  - JourneyFeedback          |        |     (Independent certainty scoring)        |
|                             |        |  4. EvidenceService                        |
|  Engine: SQLite /data/      |        |     (Factor audit & provenance tracking)   |
|                             |        |  5. CommunityService                       |
|                             |        |     (Trust-weighted crowd reporting)       |
|                             |        |  6. FeedbackService                        |
|                             |        |     (Closed-loop segment reassessment)     |
+-----------------------------+        +--------------------------------------------+
```

---

## 2. Frontend Responsibilities

### Implemented in Phase 2
- **Application Entry & Shell:** `index.html`, `src/main.jsx`, `src/App.jsx`, providing a responsive layout container, header with Chennai context, and footer with ethical disclaimers.
- **Visual Design System:** `src/index.css` defining CSS custom properties (color tokens, glassmorphism, fluid typography via Inter & Outfit, elevation shadows, and status badges).
- **Navigation Coordinator:** `src/components/shell/Navigation.jsx` enabling tabbed navigation between major functional areas.
- **Live Telemetry & Health Probing:** `src/components/shell/ServiceStatusBar.jsx` periodically calling `GET /api/health` and dynamically rendering connection status, database health, and city context with zero fake data.
- **Centralized API Client:** `src/api/client.js` with structured non-2xx error extraction, request timeouts, and friendly network failure notifications.
- **Prepared Modular Views:** Dedicated view components (`HomeView`, `PlanRouteView`, `RouteResultsView`, `EvidenceView`, `CommunityView`, `ActivityView`) configured as extension points for subsequent phases.

### Planned for Later Phases
- **Phase 3:** Leaflet/MapLibre interactive cartographic map, origin/destination pin-drop, route polyline rendering for Chennai corridors.
- **Phase 5:** Interactive route alternative comparison drawer (Fastest vs. Balanced vs. Safest) and "Why This Route" explanation panel.
- **Phase 6:** Community incident reporting modal and live crowd report marker overlays on the map.
- **Phase 7:** Post-journey feedback form triggering real-time segment score re-evaluations.

---

## 3. Backend Responsibilities

### Implemented in Phase 2
- **FastAPI Core Application:** `backend/app/main.py` configuring CORS middleware, lifespan events, and global exception handlers.
- **Environment & Configuration:** `backend/app/config.py` using Pydantic and python-dotenv to support environment variables with zero required external API keys.
- **Health Check API:** `GET /api/health` reporting system status, database connection, city context, and active services.
- **Pydantic Validation Schemas:** Strict data validation models for health, routing requests, segment risk, community reports, and feedback.
- **Root Endpoint:** `GET /` providing service metadata, Swagger link, and project disclaimer.
- **Automated Test Suite:** Built-in Python `unittest` suite (`test_health.py`, `test_database.py`) running in under 0.05 seconds.

### Planned for Later Phases
- **Phase 3:** OpenStreetMap/OSRM route generation or synthetic Chennai road corridor graph traversal.
- **Phase 4:** Segment-level risk engine combining lighting levels, CCTV coverage, commercial density, and time-of-day contextual modifiers.
- **Phase 6:** Trust-weighting decay algorithms (recency exponential decay, corroboration multipliers, and reporter track record scaling).
- **Phase 7:** Affected-segment identification and spatial graph score reassessment pipeline.

---

## 4. API Communication Layer

Frontend-to-backend communication follows strict REST principles:
- **Base URL:** Defined via `VITE_API_BASE_URL` with a sensible default (`http://127.0.0.1:8000/api`).
- **Resilience:** If the backend is offline, the frontend displays clear, actionable diagnostic alerts rather than unhandled promise rejections or fake success states.
- **Timeouts:** All requests automatically abort after 10,000ms if unresponsive.
- **Security:** Private backend credentials and database paths are never leaked into the frontend client.

---

## 5. Database Responsibilities & Domain Schema

The database tier is managed via SQLAlchemy 2.0 ORM (`backend/app/database.py`).
Default local database file: `data/suraksha_path.db` (automatically excluded by `.gitignore`).

### Foundational Domain Models (Implemented in Phase 2)
1. **`RoadSegment`:** Discrete road segment in Chennai (e.g. Anna Salai, OMR, Guindy). Stores start/end coordinates, GeoJSON geometry, length, lighting level (0–1), crowd density (0–1), police presence (0–1), baseline safety score (0–100), current reassessed safety score, and confidence score (0–100).
2. **`EvidenceItem`:** Concrete evidence items linked to segments (lighting audit results, police station proximity, CCTV cameras). Includes source type, factor name, impact score, confidence weight, and freshness timestamp.
3. **`CommunityReport`:** Crowd-sourced reports with category, description, coordinates, reporter ID, reporter reliability (0.1–1.0), confirmation tally, and verification status.
4. **`RouteEvaluation`:** Stores evaluated route alternatives (Fastest, Balanced, Safest) with distance, duration, composite safety score, confidence score, and explanation summary.
5. **`JourneyFeedback`:** Post-trip feedback with user safety rating (1–5), felt-safe boolean, comments, and reassessment processing flag.

---

## 6. Domain Service Boundaries

Each service encapsulates a distinct business domain without monolithic coupling:

| Service | Module | Status in Phase 2 | Planned Target |
| :--- | :--- | :--- | :--- |
| **Routing Service** | `routing_service.py` | Foundational interface & schema contract | Phase 3: Spatial multi-path generator |
| **Risk Service** | `risk_service.py` | Foundational interface & schema contract | Phase 4: Dynamic mathematical risk formula |
| **Confidence Engine** | `confidence_engine.py` | Foundational calculation method | Phase 4: Data completeness & recency engine |
| **Evidence Service** | `evidence_service.py` | Foundational query interface | Phase 4/5: Audit trails & factor breakdown |
| **Community Service** | `community_service.py` | Foundational trust algorithm | Phase 6: Full crowd ingestion & corroboration |
| **Feedback Service** | `feedback_service.py` | Foundational ingestion interface | Phase 7: Closed-loop segment reassessment |
| **Journey & Insights Service** | `journey_service.py` | Active in Phase 14 & 15 | Phase 14-15: Active monitoring, SOS, and historical analytics |


---

## 7. Ethical Guardrails & Legal Principles

Suraksha Path enforces the following non-negotiable principles throughout all layers:
1. **No Crime Prediction:** The system does not claim to predict criminal incidents, forecast crime events, or classify neighborhoods as intrinsically criminal.
2. **No Safety Guarantee:** Route recommendations are contextual advisories intended to inform traveler decisions, never guarantees of personal safety.
3. **Synthetic Data Labeling:** All demonstration data (road links, baseline scores, sample reports) are explicitly flagged with `is_synthetic = True` across schemas and database rows.
4. **Confidence Transparency:** A route or segment with sparse evidence must present a lower confidence score regardless of its safety rating.
