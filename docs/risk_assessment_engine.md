# Phase 8: Evidence-Based Safety Data & Risk Assessment Engine

## Overview

Suraksha Path's Risk Assessment Engine is an explainable, deterministic spatial analysis framework that evaluates road segment safety and aggregates route-level comparisons for Chennai transit corridors.

The engine separates three orthogonal concepts:
1. **Safety Score ($0–100$):** Evaluates physical and empirical safety factors based on available evidence.
2. **Confidence Score ($0–100$):** Measures data density, category diversity, and source freshness.
3. **Data Completeness:** Represents whether a road segment has sufficient evidence to compute a defensible score (`ASSESSED`, `LIMITED_EVIDENCE`, `INSUFFICIENT_DATA`, `STALE_EVIDENCE`).

---

## Core Principles

- **No Zero-Risk Conversion:** Missing evidence or an absence of reports is **never** converted to zero risk or a default 100% safety score. A segment with zero evidence returns `status="INSUFFICIENT_DATA"` and `safety_score=None`.
- **Predictive Restraint:** The system does not claim to predict crime events or guarantee personal safety. It models physical and environmental conditions (lighting, active police outposts, footfall, dual carriageways).
- **Explainability:** Every safety evaluation returns traceable `contributing_factors` citing the exact evidence ID, source name, and impact score.

---

## Sourced Evidence Baseline

The baseline dataset (`backend/app/data/chennai_safety_evidence.json`) connects verified physical attributes to 23 OpenStreetMap arterial segments:
- **Greater Chennai Corporation (GCC) Smart LED Telemetry:** Audited continuous illumination along major corridors (Anna Salai, Poonamallee High Road, OMR).
- **Greater Chennai Police Outposts:** 24/7 manned stations and beat patrol booths (Chennai Central D-2, Saidapet J-1, Guindy J-3, Taramani J-13, Mambalam R-1).
- **OpenStreetMap Physical Infrastructure:** Multi-lane divided carriageways, median barriers, and pedestrian footpaths.
- **Corroborated Community Telemetry:** Commercial nocturnal footfall and isolated underpass stretches.

---

## Mathematical Scoring Methodology

### Segment Score
$$\text{Score} = \text{clamp}\left(50.0 + \sum_{i} \text{impact}_i \times \text{freshness}_i \times \text{confidence}_i, [15.0, 95.0]\right)$$

- **Anchor Baseline:** Starts at 50.0 (neutral baseline).
- **Clamping:** Bounded to $[15.0, 95.0]$ to reflect that no urban road is 100% risk-free.
- **Risk Thresholds:**
  - `LOW`: $\text{Score} \ge 70.0$
  - `MEDIUM`: $45.0 \le \text{Score} < 70.0$
  - `HIGH`: $\text{Score} < 45.0$
  - `UNKNOWN`: Insufficient evidence (`Score = None`)

### Freshness Half-Life Decay
$$\text{Freshness} = \max\left(0.1, 0.5^{(\text{days\_old} / \text{half\_life})}\right)$$

- Infrastructure: 365 days
- Lighting telemetry: 90 days
- Police outposts: 180 days
- Community reports: 14 days

### Route-Level Aggregation
$$\text{Composite Safety} = \frac{\sum_{s \in \text{Assessed}} \text{Score}_s \times \text{Length}_s}{\sum_{s \in \text{Assessed}} \text{Length}_s}$$

$$\text{Coverage Ratio} = \frac{\text{Assessed Length}}{\text{Total Route Length}}$$

Routes with $< 50\%$ coverage are classified as `INSUFFICIENT_DATA`. Routes with $< 100\%$ coverage are labeled as `PARTIALLY_ASSESSED`.

---

## REST API

- `GET /api/safety/segments/{code}`: Segment-level evaluation and explainability.
- `POST /api/safety/routes/evaluate`: Sequential route safety evaluation.
- `GET /api/safety/evidence`: Filterable evidence query interface.
- `GET /api/safety/evidence/{id}`: Single evidence detail.
- `GET /api/safety/provenance`: Data provenance, update cadences, and license reports.
- `GET /api/safety/methodology`: Mathematical formulas, weights, and limitations.
