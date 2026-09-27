# Safety–Time Trade-Off & Route Preference Engine (Phase 10)

## Overview

Suraksha Path provides evidence-based, context-aware navigational route guidance for Chennai, India. The application does not guarantee personal safety, predict crime events, or claim to forecast victimization. Instead, it enables informed user decision-making through transparent multi-objective trade-offs between **estimated travel duration** and **verified environmental safety evidence**.

The Phase 10 engine evaluates candidate corridors generated from the OpenStreetMap road network and classifies them according to three distinct optimization strategies:
1. **FASTEST** (Minimal travel duration)
2. **BALANCED** (Pareto utility compromise between time and evidence)
3. **SAFEST** (Maximizes verified environmental safety within practical detour limits)

---

## 1. Route Optimization Preferences

| Preference | Primary Objective | Trade-Off Rationale | Selection Mechanism |
| :--- | :--- | :--- | :--- |
| **⚡ FASTEST** | Minimize travel duration ($T$) | Prioritizes minimal travel time along primary arterial corridors. Transparently explains when lower-scoring or unlit segments are traversed. | $\min(T)$ from viable road network candidates. |
| **⚖️ BALANCED** | Maximize Pareto Utility ($U$) | Weighs travel duration against verified segment safety factors. Avoids unmonitored or unlit corridors without incurring excessive detours. | $\max(U_{\text{effective}})$ combining safety score and normalized detour penalty. |
| **🛡️ SAFEST** | Maximize Composite Safety Score ($S$) | Prefers corridors with verified street illumination, high footfall, and police patrol coverage, subject to a practical detour ceiling. | $\max(S)$ with practical detour constraint ($T \le 1.40 \cdot T_{\min}$). |

> [!IMPORTANT]
> **Advisory Optimization, Not Guaranteed Outcome:** Route preference labels describe algorithmic optimization criteria, not absolute real-world safety guarantees. An unassessed segment is marked as unknown risk, never as safe.

---

## 2. Mathematical Formulation & Trade-Off Objective

### A. Normalized Quantities
To combine travel time (measured in seconds/minutes) and safety scores (scale $15.0$ to $95.0$), the engine normalizes metrics:

1. **Normalized Time Detour Penalty ($\Delta t_{\text{norm}}$):**
   $$\Delta t_{\text{norm}} = \min\left(1.0, \max\left(0.0, \frac{T - T_{\min}}{\max(T_{\min}, 60.0)}\right)\right)$$
   where $T_{\min}$ is the travel time of the fastest viable candidate.

2. **Normalized Safety Score ($S_{\text{norm}}$):**
   $$S_{\text{norm}} = \frac{S}{100.0} \quad \text{for } S \in [15.0, 95.0]$$
   *(If a route has unassessed segments, data confidence $C / 100.0$ serves as proxy).*

### B. Balanced Pareto Utility Formula
The Balanced candidate maximizes multi-attribute utility:
$$U_{\text{raw}} = \left(w_{\text{safety}} \cdot S_{\text{norm}}\right) - \left(w_{\text{time}} \cdot \Delta t_{\text{norm}}\right)$$

To prevent sparse or unverified data from distorting recommendations, utility is dampened by data confidence $C \in [10, 100]\%$:
$$U_{\text{effective}} = U_{\text{raw}} \times \left(0.60 + 0.40 \cdot \frac{C}{100.0}\right)$$

### C. Safest Candidate Detour Constraint
To ensure that the Safest preference does not recommend an impractical detour (e.g. +2 hours for +2 points of safety), practical bounds are enforced:
$$T \le \min\left(T_{\min} \cdot \text{MAX\_SAFEST\_DETOUR\_RATIO}, \; T_{\min} + \text{MAX\_SAFEST\_DETOUR\_MINUTES} \cdot 60\right)$$
If the highest-scoring candidate exceeds this bound, the engine flags an explicit detour warning (`exceeding standard practical bounds`) in the explanation.

---

## 3. Configurable Parameters & Defaults

All engine parameters reside in `backend/app/config.py` and can be configured via environment variables:

| Parameter | Default Value | Environment Variable | Purpose |
| :--- | :--- | :--- | :--- |
| `BALANCED_SAFETY_WEIGHT` | `0.60` | `BALANCED_SAFETY_WEIGHT` | Weight assigned to safety score in Balanced utility |
| `BALANCED_TIME_WEIGHT` | `0.40` | `BALANCED_TIME_WEIGHT` | Weight assigned to detour penalty in Balanced utility |
| `MAX_SAFEST_DETOUR_RATIO` | `1.40` | `MAX_SAFEST_DETOUR_RATIO` | Maximum allowed time multiplier (+40%) for Safest candidate |
| `MAX_SAFEST_DETOUR_MINUTES` | `20.0` | `MAX_SAFEST_DETOUR_MINUTES` | Maximum absolute detour minutes (+20 min) for Safest candidate |
| `SPARSE_EVIDENCE_THRESHOLD` | `0.25` | `SPARSE_EVIDENCE_THRESHOLD` | Below 25% coverage ratio, flags route as sparsely verified |
| `MIN_COVERAGE_FOR_HIGH_CONFIDENCE` | `0.40` | `MIN_COVERAGE_FOR_HIGH_CONFIDENCE` | Minimum coverage needed for high route confidence |

---

## 4. Separation of Safety Score and Data Confidence

Suraksha Path maintains a strict epistemic distinction between **Safety Score** and **Data Confidence**:

```
┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│              SAFETY SCORE               │   │             DATA CONFIDENCE             │
│                [15 – 95]                │   │               [10 – 100%]               │
├─────────────────────────────────────────┤   ├─────────────────────────────────────────┤
│ • Distance-weighted aggregation of      │   │ • Completeness of evidence streams      │
│   observed segment factors              │     (lighting, CCTV, patrol, footfall)      │
│ • Higher score = favorable environment  │   │ • Freshness with exponential half-life  │
│ • Evaluated over assessed length only   │   │ • Corroboration of community reports    │
│ • Neither crime rate nor incident prob. │   │ • Epistemic certainty, NOT safety rate  │
└─────────────────────────────────────────┘   └─────────────────────────────────────────┘
```

---

## 5. Evidence Coverage & Transparency

- **Distance-Weighted Aggregation:** Composite scores are calculated exclusively over segments with verified data:
  $$S_{\text{composite}} = \frac{\sum_{i \in \text{assessed}} S_i \cdot L_i}{\sum_{i \in \text{assessed}} L_i}$$
- **Coverage Ratio Reporting:** Every alternative reports `evidence_coverage_ratio` ($L_{\text{assessed}} / L_{\text{total}}$).
- **Sparse Evidence Caution:** When coverage is below 25%, the explanation explicitly warns the user:
  > *"Preferred for available positive safety factors, but evidence coverage is sparse (18%), so safety cannot be conclusively confirmed."*
- **Single-Route Honesty:** If OSRM or the network graph returns only 1 viable arterial route, the engine outputs 1 route with an explicit notice (`"Single viable road corridor identified... speed vs safety alternatives were not returned"`), refusing to fabricate artificial duplicates.

---

## 6. Performance & In-Memory Caching

To ensure high-throughput route planning:
- Road segment assessments are memoized within the request lifecycle using an in-memory cache (`RiskService._segment_cache`).
- Segments shared across multiple alternatives (e.g. common origin or destination arterial links) are evaluated exactly once per request.
- Expensive spatial point-to-line matching is performed on indexed OSM linestrings without blocking rendering.

---

## 7. Known Limitations of the Prototype

1. **Traffic Modeling:** Travel times reflect free-flow speed limits sourced from OpenStreetMap road tags. Real-time traffic congestion sensors are not integrated.
2. **Public Data Availability:** Chennai does not publish public street-level crime incidence geodata. Scores reflect observable environmental audits and moderated community reports.
3. **Detour Viability:** In dense or congested urban sections, practical driving detours may be restricted by one-way regulations or railway crossings.
