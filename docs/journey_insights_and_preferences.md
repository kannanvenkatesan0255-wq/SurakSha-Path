# Phase 15 — Journey Insights, Safety Analytics & Personalised Route Preferences

## 1. Architectural Overview

Phase 15 introduces a comprehensive, transparent **Journey Insights Dashboard, Safety Analytics Engine, and Personalised Route Preferences System** to Suraksha Path.

Building on Phases 1–14 (routing, segment risk assessment, community reporting, explainability, environmental context, and active journey monitoring), Phase 15 empowers commuters to:
1. **Understand Historical Transit Patterns**: Review verified past travel distances, durations, and route choices without speculative inflation.
2. **Explore Comparative Safety Analytics**: Contrast Fastest, Balanced, and Safest alternatives side-by-side using authentic route-engine metrics.
3. **Inspect Evidence Coverage & Uncertainty**: Trace the provenance, freshness, and corroboration of safety evidence without mistaking lack of data for safety.
4. **Control Personalised Routing Preferences**: Tune priorities (speed vs. safety, acceptable detour, lighting preferences, confidence threshold) with transparent ranking adjustments that never manipulate underlying segment safety scores.
5. **Enforce Local-First Privacy**: Manage journey history and preferences strictly on-device, with irreversible clearing and zero cloud tracking.

```
+-----------------------------------------------------------------------------------+
|                           JOURNEY INSIGHTS & PREFERENCES                          |
+-----------------------------------------------------------------------------------+
        |                                   |                                   |
        v                                   v                                   v
+-------------------+             +-------------------+               +-------------------+
|  Journey History  |             |  Safety Analytics |               |  Personal Route   |
|     Dashboard     |             |    & Evidence     |               |    Preferences    |
+-------------------+             +-------------------+               +-------------------+
  - Total Journeys                  - Fastest/Balanced/Safest           - Speed vs. Safety
  - Completed Travel Time/Km        - Safety Score [15-95]              - Max Detour (mins)
  - Cancelled/Complete Filter       - Confidence [10-100%]              - Avoid Unlit Roads
  - Time Range (7d, 30d, all)       - 4 Evidential States               - Min Confidence
  - Pure Real or Demo Data          - Freshness Half-Life               - Transparent Ranks
```

---

## 2. Analytics Calculation Definitions & Invariants

The analytics engine adheres to strict mathematical integrity and auditability. Metrics are computed dynamically from actual recorded journeys in the audit ledger or local storage.

### 2.1 Metric Definitions

| Metric | Calculation Method | Rules & Invariants |
| :--- | :--- | :--- |
| **Total Journeys** | Count of all matching journey records in the filtered period. | Includes all statuses (`COMPLETED`, `CANCELLED`). |
| **Completed Journeys** | Count of records where `status == "COMPLETED"`. | **Strictly excludes** `CANCELLED` and incomplete journeys. |
| **Cancelled Journeys** | Count of records where `status == "CANCELLED"`. | Tracked for adherence and reliability audits. |
| **Total Recorded Distance** | $\sum_{\text{completed}} \text{distance\_km}$ | **Only completed journeys** contribute to recorded travel distance. Cancelled trips do not inflate distance. |
| **Total Recorded Travel Time**| $\sum_{\text{completed}} \text{duration\_minutes}$ | **Only completed journeys** contribute to cumulative transit time. |
| **Average Journey Duration** | $\frac{\text{Total Recorded Travel Time}}{\text{Completed Journeys}}$ | Yields `0.0` when completed journeys is 0. Avoids division by zero. |
| **Route Type Breakdown** | Count and percentage of journeys categorized by `route_type` (`FASTEST`, `BALANCED`, `SAFEST`). | Evaluates commuter routing choices across safety-time trade-offs. |
| **Daily Activity Distribution**| Aggregation of completed and cancelled trips grouped by local calendar date (`YYYY-MM-DD`). | Uses Asia/Kolkata timezone (UTC+5:30) for accurate day boundaries. |

### 2.2 Time Range & Filter Handling

The dashboard supports dynamic filtering without server-side mutation:
- **Last 7 Days (`7d`)**: Evaluates records where `timestamp >= now - 7 days`.
- **Last 30 Days (`30d`)**: Evaluates records where `timestamp >= now - 30 days`.
- **All Recorded (`all`)**: Evaluates the complete recorded history.
- **Route Type Filter**: Filters by `FASTEST`, `BALANCED`, or `SAFEST`.
- **Status Filter**: Filters by `COMPLETED` or `CANCELLED`.

All visualisations, metrics cards, duration histograms, and ledger rows re-calculate reactively and consistently when filters change.

---

## 3. Strict Distinction: Safety Score vs. Epistemic Confidence

Suraksha Path maintains a foundational separation between what is evaluated (**Safety Score**) and how sure the system is about the evaluation (**Confidence**).

```
   [Safety Score: 15.0 - 95.0]                [Confidence: 10.0 - 100.0%]
   What the evidence indicates                How complete & corroborated
   regarding infrastructure, lighting,        the supporting data is for
   footfall, and crowd observations.          the evaluated road segments.
```

### 3.1 Mathematical Boundaries & Semantics

| Parameter | Safety Score | Epistemic Confidence |
| :--- | :--- | :--- |
| **Scale** | `15.0` to `95.0` points | `10.0%` to `100.0%` |
| **Neutral Baseline** | `50.0` (Neutral baseline for unassessed segments) | `10.0%` (Minimum prior when data is absent) |
| **Target Meaning** | Evaluated condition based on verified street lighting, pedestrian infrastructure, transit footfall, and crowd observations. | Completeness, recency, and multi-source corroboration of the supporting evidence. |
| **Ceiling Rationale** | Capped at `95.0` to reflect that no street can be guaranteed perfectly safe in all circumstances. | Capped at `100.0%` for complete spatial and temporal corroboration across all streams. |
| **Floor Rationale** | Lower-bounded at `15.0` to avoid fatalistic or hyperbolic claims about public thoroughfares. | Lower-bounded at `10.0%` representing baseline topological existence. |

### 3.2 Non-Predictive Safety Principles
- **No Crime Prediction**: The application does **not** predict crime, arrest rates, or individual incidents. It assesses observable environmental and infrastructure features.
- **No Safety Guarantees**: Higher safety scores indicate better-lit, more populated, or better-monitored routes, **never** a guarantee of personal safety.
- **Absence of Evidence $\neq$ Proof of Safety**: Segments without recorded reports are explicitly classified as **Unassessed (50.0 score, 10% confidence)**, never presumed safe.

---

## 4. Evidence Coverage & Uncertainty Explorer

To make data gaps transparent, the Evidence Coverage Explorer categorizes all route segments into four explicit evidential tiers:

```
+--------------------------------------------------------------------------------+
|                        4 EVIDENTIAL COVERAGE STATES                            |
+--------------------------------------------------------------------------------+
| 1. No Evidence Recorded    | Unassessed segment; relies on 50.0 neutral prior.  |
| 2. Outdated / Stale        | Observation age > 30 days; recency discount applied|
| 3. Limited Corroboration   | Single unverified source; partial confidence       |
| 4. Strong Coverage         | Multi-source corroboration with active recency    |
+--------------------------------------------------------------------------------+
```

### 4.1 Temporal Decay & Freshness
Evidence decays according to an exponential half-life model:
$$\text{Weight}(t) = \text{Base Weight} \times 2^{-\frac{\Delta t}{T_{\text{half}}}}$$
where $T_{\text{half}} = 14 \text{ days}$ for community reports and $90 \text{ days}$ for municipal lighting surveys. Stale observations are visibly flagged.

---

## 5. Personalised Route Preferences & Route Planning Integration

The Personalised Route Preferences panel allows commuters to customize how route alternatives are evaluated and prioritized.

### 5.1 Supported Preference Controls

| Preference Parameter | Control Type | Valid Range | Engine Implementation |
| :--- | :--- | :--- | :--- |
| **Speed vs. Safety Balance** | Continuous Slider | `0.0` (Max Speed) to `1.0` (Max Safety) | Adjusts Pareto multi-objective weighting between travel duration and safety score in alternative ranking. |
| **Max Detour Tolerance** | Stepper / Slider | `0` to `45` minutes | Sets a hard ceiling on allowable additional travel time over the fastest route baseline when recommending safer alternatives. |
| **Avoid Unlit Roads** | Boolean Toggle | `true` / `false` | Penalizes poorly lit segments during nocturnal hours (18:00–06:00 IST). |
| **Minimum Confidence Threshold** | Slider | `10%` to `80%` | Warns if alternative route confidence falls below the commuter's threshold. |
| **Prioritize Active Corridors** | Boolean Toggle | `true` / `false` | Favors arterial roads with established transit footfall. |

### 5.2 Preservation of Underlying Safety Scores
**Critical Invariant**: Setting a preference for "Safest" or adjusting the slider **never** artificially changes the underlying Safety Score of a segment or route. The Safety Score is strictly derived from verified environmental and community evidence. Preferences solely govern the **trade-off ranking** and selection recommendations among valid alternatives.

---

## 6. Privacy, Local Storage & Data Retention

Suraksha Path adheres to a privacy-first, local-custody model:
- **No Background Telemetry**: Personal journey histories and GPS traces are stored exclusively in the browser's `localStorage`. No cloud tracking or third-party profiling occurs.
- **Address Masking**: Exact street numbers are masked in UI logs (`Anna Nagar 3rd Avenue` $\rightarrow$ `Anna Nagar area`) to protect commuter habit privacy.
- **Confirmed Wipe**: Commuters can permanently wipe all stored journeys and reset preferences with explicit two-step confirmation modals.
- **Demo Isolation**: Pre-loaded Chennai demo journeys (Central to Adyar, T. Nagar to Marina, etc.) are strictly isolated with `is_demo: true` and can be toggled on/off without contaminating real commuter histories.

---

## 7. Verification & Test Matrix

Phase 15 is verified across both backend (pytest) and frontend (node:test) environments:

### 7.1 Backend Test Coverage (`backend/tests/`)
- `test_journey_insights_api.py`:
  - `test_empty_journey_history_returns_zeroed_metrics`: Validates zeroed defaults without exceptions.
  - `test_cancelled_journeys_excluded_from_completed_metrics`: Ensures cancelled journeys do not inflate completed distance or duration.
  - `test_journey_recording_idempotency_and_deduplication`: Verifies duplicate journey IDs update existing records without creating phantom trips.
  - `test_journey_history_filtering`: Tests date range (7d, 30d, all), route type, and status filtering.
  - `test_journey_history_privacy_deletion`: Verifies complete purge upon DELETE request.
  - `test_route_preferences_persistence_and_reset`: Tests preference update and reset to defaults.
  - `test_demo_journey_history_isolation`: Ensures demo records are tagged and isolated from real trips.
- `test_route_preferences.py`:
  - `test_route_plan_with_personalized_preferences`: Verifies route engine accepts and applies preference parameters.
  - `test_route_plan_rejects_out_of_bounds_preferences`: Enforces validation bounds on detour and confidence inputs.

### 7.2 Frontend Test Coverage (`frontend/src/tests/insights.test.js`)
- `API client exports all journey analytics and route preference functions`: Verifies client interface.
- `Empty history yields valid zeroed metrics without crashing`: Validates UI calculations on clean state.
- `Journey metrics calculation strictly excludes cancelled trips from distance and duration`: Frontend calculation safety check.
- `Date-range filtering accurately subsets records across 7d, 30d, and all`: ISO timestamp boundary checking.
- `Filtering by route type and journey status updates all metrics consistently`: Cross-metric consistency.
- `LocalStorage persistence prevents duplicate records with identical journey_id`: Browser storage deduplication.
- `Privacy control: clearing history removes all local records`: Storage purge test.
- `Route preferences can be loaded, updated, and reset to defaults`: Preference state cycle.
- `Demo sample journeys are isolated and explicitly labeled with is_demo: true`: Synthetic data tagging.
- `Safety Score and Epistemic Confidence are strictly distinct metrics`: Epistemic invariant check.

**Overall Test Results**:
- Backend: **111 / 111 Passed** (100%)
- Frontend: **81 / 81 Passed** (100%)
- Frontend Production Bundle: **Vite build clean (0 errors)**
