# Phase 9: Trust-Weighted Community Intelligence & Report Verification

## Overview

Suraksha Path introduces community safety observations as a dynamic, crowdsourced layer of spatial intelligence for Chennai. Crucially, **community reports are never treated as verified crime statistics or official ground truth by default**. 

The system treats community inputs through a rigorous, trust-weighted empirical heuristic that calibrates impact based on **reporter reliability**, **independent corroborations**, **recency time-decay**, **transparent moderation status**, and **community disputes**.

---

## Core Safety Principles

1. **Absence of Evidence is Not Evidence of Safety**: An absence of community reports on a road segment does *not* imply the road is safe. Unassessed roads remain explicitly labeled as `UNASSESSED` with `None` safety scores.
2. **No Crime Prediction**: The platform does not predict where crimes will occur. It tracks physical environment observations (lighting outages, footpath blockages, isolated stretches, active police outposts).
3. **Bounded Influence**: Community observations are strictly bounded ($\pm 8.0$ points per report) so that bursts of submissions cannot hijack route safety scores.
4. **Zero Personal Data Exposure**: Reporter emails, phone numbers, and credentials are never stored in reports or exposed publicly. Public responses use masked anonymous identifiers (`Community Contributor #XXXX`).
5. **Clear Synthetic Labeling**: Demonstration reports are explicitly marked with `is_synthetic=True` and flagged with visible badges in the UI.

---

## Controlled Observation Categories

Every community observation is categorized within a controlled urban mobility taxonomy with defined decay characteristics:

| Category | Description | Base Score Impact | Half-Life ($t_{1/2}$) | Max Validity | Mapped Evidence Category |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `POOR_LIGHTING` | Dark stretch, broken or flickering luminaires | -6.0 | 72 hours (3d) | 168 hours (7d) | `LIGHTING` |
| `DESERTED_STRETCH` | Deserted roadway, zero footfall or open shops | -8.0 | 24 hours (1d) | 72 hours (3d) | `COMMUNITY_REPORT` |
| `OBSTRUCTED_FOOTPATH` | Blocked footpath, construction debris, trenches | -4.0 | 48 hours (2d) | 168 hours (7d) | `PEDESTRIAN_INFRASTRUCTURE` |
| `ISOLATED_UNDERPASS` | Underpass blind spot, restricted sightline | -10.0 | 48 hours (2d) | 168 hours (7d) | `COMMUNITY_REPORT` |
| `SUSPICIOUS_LOITERING` | Threatening groups, reported harassment | -7.0 | 12 hours (0.5d) | 48 hours (2d) | `COMMUNITY_REPORT` |
| `ROAD_HAZARD` | Monsoon waterlogging, open potholes | -5.0 | 48 hours (2d) | 168 hours (7d) | `ROAD_CHARACTERISTIC` |
| `ACTIVE_POLICE_PRESENCE` | Stationary patrol van, beat outpost active | +7.0 | 24 hours (1d) | 48 hours (2d) | `POLICE_PRESENCE` |
| `HIGH_PEDESTRIAN_FOOTFALL` | Nocturnal commercial footfall, open tea stalls | +5.0 | 24 hours (1d) | 48 hours (2d) | `COMMUNITY_REPORT` |
| `INFRASTRUCTURE_DAMAGE` | Missing manhole covers, broken guardrails | -6.0 | 168 hours (7d) | 720 hours (30d) | `ROAD_CHARACTERISTIC` |

---

## Report Lifecycle & State Machine

```
              ┌───────────────┐
              │   SUBMITTED   │  (Baseline unverified community observation)
              └───────┬───────┘
                      │
         ┌────────────┼────────────┐
         │ (Flagged)  │ (Disputed) │ (Moderator Approved)
         ▼            ▼            ▼
  ┌─────────────┐ ┌──────────┐ ┌──────────┐
  │UNDER_REVIEW │ │ DISPUTED │ │ VERIFIED │
  └──────┬──────┘ └────┬─────┘ └────┬─────┘
         │             │            │
         └─────────────┼────────────┘
                       │ (Hours > Validity Window or Rejected)
                       ▼
              ┌─────────────────┐
              │EXPIRED / REJECTED│  (Weight = 0.0, Zero Score Impact)
              └─────────────────┘
```

### State Definitions

- **`SUBMITTED`**: Initial unverified state entered upon submission ($V = 0.85$).
- **`UNDER_REVIEW`**: Flagged by $\ge 3$ community members or undergoing moderation ($V = 0.50$).
- **`VERIFIED`**: Validated by official audit, beat check, or administrative review ($V = 1.25$).
- **`DISPUTED`**: Community accuracy challenges exceed confirmations by $\ge 2$ ($V = 0.20$).
- **`REJECTED`**: Administrative rejection for spam, prank, or false claim ($V = 0.00$, $W = 0.0$).
- **`EXPIRED`**: Elapsed time since observation exceeds category `validity_hours` ($W = 0.0$).

---

## Trust-Weighting Mathematical Formulation

The composite trust weight $W \in [0.0, 1.0]$ and signed safety impact are computed deterministically:

$$W = \text{round}(R \times C \times T \times V \times D, 3)$$

$$\text{Impact} = \text{round}(\text{BaseImpact} \times W, 2)$$

Where:
1. **$R$ (Reporter Reliability)**:
   - Regular users: $0.75$ baseline.
   - Verified / authority contributors: $0.95$.
   - History penalty: $\max(0.2, 0.75 - 0.25 \times \text{rejected\_count})$.
2. **$C$ (Corroboration Multiplier)**:
   $$C = \min\left(1.50, 1.0 + 0.15 \times \min(\text{confirmations}, 4)\right)$$
   Each independent confirmation adds $+15\%$ confidence, capped at $+60\%$ ($C = 1.50$).
3. **$T$ (Recency Time-Decay)**:
   $$\Delta t = \frac{\text{now} - \text{observed\_at}}{3600}$$
   $$T = \begin{cases} 
   0.0 & \text{if } \Delta t > \text{validity\_hours} \\
   \max(0.05, 0.5^{(\Delta t / t_{1/2})}) & \text{otherwise}
   \end{cases}$$
4. **$V$ (Verification Status Multiplier)**:
   - `VERIFIED`: $1.25$
   - `SUBMITTED`: $0.85$
   - `UNDER_REVIEW`: $0.50$
   - `DISPUTED`: $0.20$
   - `REJECTED`: $0.00$
   - `EXPIRED`: $0.00$
5. **$D$ (Dispute Penalty Factor)**:
   $$D = \begin{cases}
   1.0 & \text{if } \text{disputes} = 0 \\
   \max(0.10, 1.0 - 0.35 \times \text{disputes}) & \text{if } \text{disputes} > 0
   \end{cases}$$

---

## Abuse Prevention & Moderation Controls

1. **Single-Interaction Constraint**:
   Enforced at the database level via `UniqueConstraint("report_id", "user_id", "interaction_type")` on the `report_interactions` table. A user can never submit multiple confirmations for the same report.
2. **Self-Corroboration Prevention**:
   The backend explicitly rejects any confirmation attempt where `report.reporter_id == user_id`.
3. **Rate Limiting**:
   - Max 5 report submissions per user per hour.
   - Max 25 interactions (confirmations, disputes, flags) per user per hour.
4. **Duplicate Detection**:
   Queries active reports within $120\text{m}$ for the same category submitted in the last 24 hours. If found, users are directed to corroborate rather than fragmenting observations into duplicates.
5. **Moderator Authorization**:
   Transitions to `VERIFIED` or `REJECTED` require an authorized `X-Admin-Key` header matching `settings.MODERATOR_KEY`.

---

## Dynamic Segment & Route Reassessment

When a community report is submitted, corroborated, disputed, or moderated:
1. An associated `EvidenceItem` (`EVD-{report_id}`) is synchronized in the database.
2. The affected road segment's safety score is re-evaluated via `RiskService.evaluate_segment_safety(segment_code)`.
3. `road_segments.current_safety_score`, `confidence_score`, `assessment_status`, and `evidence_count` are updated.
4. Subsequent route planning requests traversing this road segment instantly incorporate the recalibrated segment score!

---

## REST API Specification

### Community Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/community/categories` | Retrieve controlled category list and decay parameters |
| `GET` | `/api/community/reports` | Query reports with category, status, and segment filters |
| `POST` | `/api/community/reports` | Submit a location-based observation (`X-User-Id` header) |
| `GET` | `/api/community/reports/{id}` | Retrieve detail and mathematical explainability breakdown |
| `POST` | `/api/community/reports/{id}/confirm` | Independently corroborate an observation |
| `POST` | `/api/community/reports/{id}/dispute` | Contest the accuracy or freshness of an observation |
| `POST` | `/api/community/reports/{id}/flag` | Flag an observation for moderator inspection |
| `POST` | `/api/community/reports/{id}/moderate` | Execute verified moderation action (`X-Admin-Key` header) |
