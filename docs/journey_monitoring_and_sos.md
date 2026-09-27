# Phase 14 — Safety Check-In, Journey Monitoring & SOS Workflow

## 1. Architectural Overview

Phase 14 introduces a **usable, accessible, and privacy-conscious Journey Safety Monitoring and SOS Workflow** to the Suraksha Path platform.

While Phases 1–13 focused on multi-route generation, spatial segment risk evaluation, trust-weighted community evidence, route trade-offs, explainability, feedback-driven reassessment, and environmental adjustments, Phase 14 equips Chennai commuters with active journey reassurance:
1. **Journey Lifecycle Management**: Rigidly enforced state transitions (`NOT_STARTED`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`).
2. **Opt-In Safety Check-Ins**: Periodic prompts ("I'm OK" / "I need help") with configurable cadences and non-alarmist missed check-in handling.
3. **Emergency SOS Workflow**: Deliberately activated in-app emergency state with verified Chennai public helplines and honest prototype disclaimers.
4. **Strict Location Privacy**: Off-by-default location sharing, local device processing, and explicit distinction between live device GPS and simulated demo coordinates.
5. **Auditable Event Ledger**: Minimal, non-sensitive chronological log of journey lifecycle events with Chennai local time (IST).

```
                      +-------------------+
                      |    NOT_STARTED    |
                      +-------------------+
                                |
                        (Start Journey)
                                v
               +----------------------------------+
               |              ACTIVE              |<-----------+
               +----------------------------------+            |
                 |              |               |              |
             (Pause)       (Complete)       (Cancel)        (Resume)
                 v              v               v              |
        +-------------+  +-------------+ +-------------+       |
        |   PAUSED    |  |  COMPLETED  | |  CANCELLED  |       |
        +-------------+  +-------------+ +-------------+       |
               |                                               |
               +------------------(Resume)---------------------+
```

---

## 2. Journey Lifecycle State Transitions

The state machine strictly prevents invalid transitions, duplicate starts, duplicate completions, and resurrection of terminated journeys:

| From State | Action / Transition | To State | Description & Invariants |
| :--- | :--- | :--- | :--- |
| `NOT_STARTED` | `start` | `ACTIVE` | Captures origin, destination, route type, distance, duration, safety score, confidence. Initializes timers and schedules first check-in. |
| `ACTIVE` | `pause` | `PAUSED` | Suspends elapsed timers and check-in countdown. Commuter retains session. |
| `PAUSED` | `resume` | `ACTIVE` | Resumes timers and recalculates next check-in window from resume timestamp. |
| `ACTIVE` / `PAUSED` | `complete` | `COMPLETED` | Marks safe arrival at destination. Clears pending check-in prompts. Deactivates SOS. Terminal state. |
| `ACTIVE` / `PAUSED` | `cancel` | `CANCELLED` | Terminates monitoring before reaching destination. Clears timers. Terminal state. |
| `COMPLETED` | *Any transition* | *Rejected (400)* | Finished journeys cannot be paused, resumed, or altered. |
| `CANCELLED` | *Any transition* | *Rejected (400)* | Cancelled journeys cannot be resumed or restarted without starting a fresh session. |

---

## 3. Opt-In Safety Check-In Workflow

### 3.1 Consent & Cadence Selection
Before monitoring commences, commuters configure their preferred check-in interval:
- **Fast Demo (30 seconds)**: Rapid demonstration and testing.
- **Short Demo (1 minute)**: Evaluator demonstration.
- **Standard (15 minutes)**: Recommended for typical Chennai cross-corridor transit.
- **Extended (30 minutes)**: For longer inter-district journeys (e.g., Central to Tambaram/Mahabalipuram).

### 3.2 Check-In Interaction
When the timer expires:
- **"✅ I'm OK"**: Resets the countdown timer, schedules the next prompt, and appends a `CHECK_IN_COMPLETED` record.
- **"⚠️ I need help"**: Immediately activates In-App SOS mode, displays the Chennai emergency helpline directory, and logs `SOS_ACTIVATED`.

### 3.3 Missed Check-In Handling & Grace Period
- If a check-in is not acknowledged within the interval plus a grace period (30s in demo, 90s standard), the session transitions to an overdue state (`CHECK_IN_MISSED`).
- **Non-Alarmist Epistemic Standard**:
  > *"A missed check-in is an uncertain event and does NOT indicate verified danger. Suraksha Path does not automatically dial police or send silent alerts."*
- Commuters can click **"I'm OK now — Resume Monitoring"** to dismiss the prompt and log `CHECK_IN_MISSED_RESOLVED`.

---

## 4. In-App SOS Workflow & Emergency Directory

### 4.1 Accidental Activation Safeguards
Accidental SOS activation is prevented through deliberate interactions:
1. **Press-and-Hold**: Commuter holds the emergency control continuously for 2.0 seconds with visual progress bar fill.
2. **Accessible Confirmation Modal**: For assistive technology and keyboard users, opening the SOS dialog requires an explicit confirmation step (`Enter` or Space).

### 4.2 Transparent In-App Active State
When SOS is active:
- An unmistakable red pulsing beacon and high-visibility alert banner (`role="alert"`, `aria-live="assertive"`) are displayed.
- **Honest Prototype Notice**:
  > *"PROTOTYPE DEMONSTRATION MODE: In-app SOS mode is active. This prototype logs safety events and presents emergency assistance numbers. It does NOT automatically notify police, call an ambulance, or send SMS alerts."*
- Commuters have direct tap-to-call telephone shortcuts to verified Tamil Nadu emergency services:
  - **Police Control Room**: `100` / `112` (`tel:100`)
  - **Chennai Police Women Helpline (Kavalan)**: `1091` (`tel:1091`)
  - **Tamil Nadu Ambulance & Medical Service (108)**: `108` (`tel:108`)
  - **Greater Chennai Corporation (GCC) Disaster Helpline**: `1913` (`tel:1913`)
  - **Chennai Traffic Police Control**: `103` (`tel:103`)
  - **Fire and Rescue Services**: `101` (`tel:101`)

### 4.3 SOS Resolution
- Commuter confirms safe status via the **"Resolve SOS / I Am Safe"** button.
- A confirmation dialog ensures the state is not closed by accidental touch.
- An `SOS_RESOLVED` event is recorded in the ledger.

---

## 5. Location Privacy & Geolocation Controls

### 5.1 Privacy Guarantees
- **Off by Default**: Location sharing is never enabled without explicit user opt-in.
- **Local Processing**: Browser coordinates from the Geolocation API remain strictly within the client session; they are never uploaded to backend databases or public logs.
- **Graceful Failure Handling**: If geolocation permission is denied by the commuter or unavailable from the device, the application continues to provide full route navigation and monitoring without error.

### 5.2 Live GPS vs. Demo Simulation
To ensure absolute provenance honesty, commuter positions are clearly distinguished:
- **`LIVE_GPS`**: Acquired from device GPS sensors via `navigator.geolocation`.
- **`SIMULATED_DEMO`**: Synthetic progression coordinates along the Chennai Central – T. Nagar corridor, explicitly labeled `[DEMO SIMULATION]`.

---

## 6. Minimal Event History Ledger

Every monitored session records minimal, auditable checkpoints:

| Event Type | Trigger | Logged Details |
| :--- | :--- | :--- |
| `JOURNEY_STARTED` | Session initialization | Origin, destination, route strategy, check-in interval, distance |
| `CHECK_IN_COMPLETED` | User taps "I'm OK" | Next scheduled prompt timestamp |
| `CHECK_IN_MISSED` | Check-in window expires | Overdue count; non-alarmist disclaimer |
| `CHECK_IN_MISSED_RESOLVED` | User taps "I'm OK now" | Resumption of regular cadence |
| `JOURNEY_PAUSED` | User pauses journey | Temporary suspension timestamp |
| `JOURNEY_RESUMED` | User resumes journey | Rescheduling of next check-in window |
| `SOS_ACTIVATED` | Hold or modal confirmation | Emergency mode timestamp |
| `SOS_RESOLVED` | User confirms safe status | Resolution timestamp |
| `JOURNEY_COMPLETED` | Arrival at destination | Safe completion timestamp |
| `JOURNEY_CANCELLED` | User cancels trip | Early termination timestamp |

*Note: Raw latitude/longitude coordinates and personal contact phone numbers are never stored in the event ledger.*

---

## 7. API Reference

### 7.1 Emergency Helplines
- **`GET /api/journey/helplines`**
  - Returns verified official emergency numbers for Chennai with descriptions and dial URIs.

### 7.2 Session Management
- **`POST /api/journey/session`**
  - Initializes a new journey session state machine in `ACTIVE` status.
  - Body: `JourneyStartRequest`
- **`GET /api/journey/session/{journey_id}`**
  - Retrieves current session state and event audit ledger.
- **`POST /api/journey/transition`**
  - Executes a state transition or check-in response (`pause`, `resume`, `complete`, `cancel`, `check_in_ok`, `check_in_help`, `check_in_missed`, `sos_activate`, `sos_resolve`).
  - Body: `JourneyTransitionRequest`
