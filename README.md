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
| **Styling** | Vanilla CSS (Design Tokens) | CSS3 / Glassmorphic | Curated palette, dark theme, fluid typography |
| **Backend** | Python + FastAPI | Python 3.13, FastAPI 0.139 | High-performance asynchronous REST API |
| **ASGI Server** | Uvicorn | 0.51.0 | Fast ASGI production/development server |
| **Database** | SQLite + SQLAlchemy | SQLAlchemy 2.0 | Spatial graph schema, zero-credential local DB |
| **Data Validation** | Pydantic v2 | 2.13.4 | Strict schema serialization and request validation |
| **Test Suite** | Python `unittest` | Built-in | Automated API and database verification |

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

## 10. Testing & Verification Commands

* **Run Backend Unit Tests:**
  ```bash
  npm run test:backend
  ```
  *(Executes `python -m unittest discover -s backend/tests -p "test_*.py"` verifying health endpoints and database connectivity).*

* **Run Frontend Build Verification:**
  ```bash
  npm run build:frontend
  ```
  *(Executes `vite build` verifying zero syntax errors, correct module resolution, and clean bundle generation).*

---

## 11. Current Implementation Status (Phase 2 Foundation)

- [x] **Project Scaffolding & Git Workflow:** Clean repository structure initialized on `main` branch with remote origin configured.
- [x] **Repository Hygiene:** Comprehensive `.gitignore` protecting secrets, databases, build artifacts, and dependencies.
- [x] **Frontend Architecture:** Modular React 19 application with custom glassmorphic cartographic design system tokens, responsive navigation shell, live telemetry probing, and prepared view containers.
- [x] **Backend Architecture:** Modular FastAPI application with Pydantic v2 schemas, CORS middleware, lifespan events, and global exception handlers.
- [x] **Database Connectivity:** SQLite engine with SQLAlchemy 2.0 ORM models for road segments, evidence items, community reports, route evaluations, and journey feedback.
- [x] **API Communication Layer:** Centralized `ApiClient` with network failure handling, request timeouts, and non-2xx error handling.
- [x] **Health Check Telemetry:** `GET /api/health` providing live system status, database health, city context, and active service boundaries.
- [x] **Automated Tests:** 100% passing unit tests covering API endpoints and database table creation.

---

## 12. Known Limitations & Upcoming Phases

1. **Interactive Leaflet Map:** Planned for **Phase 3** (interactive map tiles, origin/destination pins, and polyline visualization across Chennai corridors).
2. **Dynamic Risk Calculation Engine:** Planned for **Phase 4** (mathematical formulas evaluating lighting, footfall, CCTV, and time-of-day modifiers).
3. **Multi-Route Comparison & Explainability UI:** Planned for **Phase 5** (Fastest, Balanced, and Safest comparative route cards and "Why This Route" explanation drawer).
4. **Trust-Weighted Community Reporting:** Planned for **Phase 6** (interactive reporting form with corroboration tallies and time-decay algorithms).
5. **Closed-Loop Feedback Reassessment:** Planned for **Phase 7** (post-journey feedback interface dynamically modifying segment risk scores).
