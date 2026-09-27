# Route Explainability, Safety Score & Confidence Dashboard (Phase 11)

## Overview

Suraksha Path is an evidence-based, context-aware safe-route navigation prototype for Chennai, India. It does not predict crime, forecast victimization, or guarantee personal safety.

Phase 11 introduces a comprehensive, interactive **Route Explainability Dashboard** that enables citizens and transportation researchers to inspect:
1. What the route **Safety Score** represents and how it is aggregated.
2. What **Data Confidence** represents and how it differs fundamentally from Safety Score.
3. How much of the route is backed by registered evidence (**Evidence Coverage**).
4. Which specific **evidence streams** (Lighting, Police, Pedestrian infrastructure, Road classification, Community reports) influenced the calculation.
5. Which discrete **road segments** contributed to the route result, highlighting bottlenecks and synchronizing with the Leaflet map.
6. **Why the selected route was chosen** over alternative corridors (Fastest, Balanced, Safest).
7. Active **uncertainties, data gaps, nocturnal lighting cautions, and freshness decay**.

---

## 1. Metric Semantics & Boundaries

Suraksha Path enforces rigorous conceptual separation between the three primary route metrics:

| Metric | Scale | Neutral Baseline | Aggregation Method | Epistemic Meaning | What It Does NOT Establish |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Route Safety Score** | `15.0 to 95.0` | `50.0 pts` | Distance-weighted average over assessed segments: $\frac{\sum (S_i \cdot L_i)}{\sum L_i}$ | Environmental protective infrastructure index based on observable physical audits. | **NOT** a crime prediction, harm probability, or guarantee of safety. |
| **Data Confidence** | `10.0% to 100.0%` | `10.0%` (Baseline) | Distance-weighted segment certainty with $10\%$ penalty for unassessed stretches. | Epistemic completeness, multi-category diversity, and audit freshness. | **NOT** the likelihood that an incident will or will not occur. |
| **Evidence Coverage** | `0.0% to 100.0%` | `0.0%` | Assessed distance divided by total route distance: $\frac{L_{\text{assessed}}}{L_{\text{total}}}$ | Proportion of physical route corridor backed by verified data records. | **NOT** proof of safety for unassessed areas (silence $\neq$ safety). |

### A. Safety Score Semantics
- **Scale:** Clamped between $[15.0, 95.0]$. Absolute zero or $100$ is non-empirical in dynamic urban environments.
- **Starting Anchor:** $50.0$ represents a neutral corridor with zero recorded positive or negative factors.
- **Distance-Weighted:** Longer segments contribute proportionally more to the composite route score than short cut-throughs.
- **Exclusion of Unassessed Gaps:** Unassessed segments are strictly excluded from the composite score to prevent assuming safety from data absence.

### B. Confidence Semantics
- **Scale:** $[10.0, 100.0]\%$.
- **Formula:** Category Diversity ($40\%$) + Record Density ($30\%$) + Verification & Quality ($30\%$).
- **Independence from Score:** A poorly lit, unmonitored road segment can have a **low Safety Score (e.g. 32.0)** with **high Confidence (e.g. 92%)** if reliably audited. Conversely, an arterial corridor can have a **high score with low confidence** if audited sparsely.

### C. Evidence Coverage
- Measures the physical proportion of route distance supported by verified data.
- If coverage falls below $25\%$, the system displays an explicit **Sparse Evidence Caution Flag** (`⚠️ SPARSE COVERAGE`).
- An absence of incident records or community reports is **strictly treated as unknown condition, never safe**.

---

## 2. Core Evidence Streams in Chennai

The assessment engine synthesizes 5 controlled evidence categories:

| Category | Display Name | Configured Weight | Data Source & Vintage | Engine Usage | Known Urban Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `LIGHTING` | **Street Lighting & Illumination** | `35%` | Corporation of Greater Chennai / Smart City LED Audits (2025–2026) | Direct positive impact for functional illumination; penalty during nocturnal hours (20:00–06:00) if unverified. | Does not capture real-time power outages, localized fixture failures, or private compound shadows. |
| `POLICE_PRESENCE` | **Police Stations & Patrols** | `20%` | Greater Chennai Police Station Jurisdictions & Beat Patrols (2025) | Proximity to 24/7 active police stations, booths, and verified beat corridors boosts score. | Fixed jurisdiction boundaries and static beat routes; does not track dynamic patrol vehicles. |
| `PEDESTRIAN_INFRASTRUCTURE` | **Footpaths & Walkways** | `15%` | OpenStreetMap Highway Tags & CMA Pedestrian Network (2026) | Continuous sidewalks, grade-separated pedestrian crossings, and paved footpaths boost score. | Static tags do not capture temporary sidewalk encroachments, construction, or parked vehicles. |
| `ROAD_CHARACTERISTIC` | **Road Classification** | `15%` | OpenStreetMap Arterial Network Hierarchy (2026) | Multi-lane divided carriageways provide natural vehicular surveillance over narrow cut-throughs. | Major arterial roads may present higher traffic collision risks despite better illumination. |
| `COMMUNITY_REPORT` | **Community Observations** | `15%` | Suraksha Path Community Intelligence System (Trust-Weighted) | Citizen observations of hazards subtract points; corroborated safe observations increase confidence. | Subject to volunteer reporting density; absence of reports does not indicate absence of hazards. |

> [!NOTE]
> Configured weights are prototype heuristic baselines designed for demonstration in Chennai, not statistically calibrated empirical constants.

---

## 3. Segment-Level Explainability & Map Synchronization

The dashboard provides granular segment-by-segment inspection:
- **Corridor Progression Bar:** Visual stacked representation of all segments along the journey, colored by risk level:
  - 🟢 **Low Risk:** Score $\ge 70.0$
  - 🟡 **Medium Risk:** Score $45.0 - 69.9$
  - 🔴 **High Risk:** Score $< 45.0$
  - ⚪ **Unassessed Gap:** Insufficient data
- **Bidirectional Map Synchronization:**
  - Selecting any segment in the dashboard highlights that exact road segment geometry on the Leaflet map with a luminous amber/gold casing (`#f59e0b`), displays an inspector popup, and fits the viewport bounds.
  - Clicking a road segment directly on the Leaflet map selects and scrolls to that segment in the dashboard table.
- **Bottleneck Identification:** Identifies the lowest-scoring segment along the corridor (e.g. unlit underpass or deserted stretch) and flags the specific reason for caution.

---

## 4. Dynamic "Why This Route?" Justification

Rather than hardcoded text, explanations are generated dynamically using actual route metrics:
- **⚡ FASTEST:** Explains minimal travel duration, reports time saved compared to the Safest alternative, and highlights any unmonitored arterial segments accepted for speed.
- **⚖️ BALANCED:** Explains the Pareto utility compromise, quantifying the safety points gained per minute of detour.
- **🛡️ SAFEST:** Explains the lower modeled-risk objective, continuous illumination, and patrol presence, while transparently reporting the detour time cost.

---

## 5. API Endpoints

### `POST /api/safety/routes/explain`
Generates a complete `RouteExplainabilityReport` containing metric semantics, category breakdowns, segment items with Leaflet coordinates, trade-off comparisons, and uncertainty notices.

### `GET /api/safety/semantics`
Returns authoritative definitions for Safety Score, Confidence, and Evidence Coverage for client reference.

---

## 6. Authoritative Disclaimer

Suraksha Path is an evidence-based contextual advisory prototype for Chennai. It does not predict criminal activity, forecast personal victimization, or guarantee safety. Unassessed segments reflect an absence of observations, not safety. All metrics are advisory.
