# Phase 13 — Real-Time Context, Time-of-Day & Environmental Adjustments

## 1. Overview & Objective

Suraksha Path introduces a context-aware assessment layer that incorporates journey time, astronomical solar illumination, and environmental conditions into road-segment and route assessments.

Contextual factors are derived from verifiable physical realities (such as nocturnal darkness requiring street lighting, reduced road friction during precipitation, or flooding vulnerability in underpasses). They are **never** presented as statistical crime probabilities or guarantees of personal safety.

---

## 2. Temporal & Astronomical Solar Engine

### 2.1 Timezone Compliance
- All journey calculations strictly use the official regional timezone: **`Asia/Kolkata` (IST: UTC+5:30)**.
- India does not observe Daylight Saving Time (DST); the offset remains an invariant $+05:30$ throughout the year.
- Distinguishes current departures from future scheduled journeys. Future departures (>10 minutes ahead) query hourly weather model forecasts rather than live real-time telemetry.

### 2.2 Solar Position Formulation (Chennai: 13.0827° N, 80.2707° E)
Using NOAA celestial equations calibrated to Chennai's geographic coordinates, the engine deterministically calculates:
1. **Fractional Year ($\gamma$) & Equation of Time ($\text{EoT}$)**:
   $$\gamma = \frac{2\pi}{365} \times \left(\text{day\_of\_year} - 1 + \frac{\text{hour} - 12}{24}\right)$$
2. **Solar Declination ($\delta$) & Longitude Meridian Offset**:
   Chennai ($80.2707^\circ\text{ E}$) sits $-2.23^\circ$ west of India's standard meridian ($82.5^\circ\text{ E}$), creating a constant $-8.9\text{ min}$ solar time offset $+\text{EoT}$.
3. **Solar Elevation Angle ($\alpha$)**:
   $$\sin\alpha = \sin\phi \sin\delta + \cos\phi \cos\delta \cos h$$
4. **Astronomical Solar Phases**:
   - **`DAYLIGHT`** ($\alpha > +6.0^\circ$): High ambient illumination. Lighting relevance is secondary ($0.20$).
   - **`GOLDEN_HOUR`** ($0^\circ \le \alpha \le +6.0^\circ$): Twilight transition. Visibility waning ($0.45$).
   - **`CIVIL_TWILIGHT`** ($-6.0^\circ \le \alpha < 0^\circ$): Ambient light fading. Lighting relevance escalates to $0.75$.
   - **`NIGHT_EARLY`** ($\alpha < -6.0^\circ$, before 22:30 IST): Street lighting is vital ($1.00$). Commercial footfall remains active.
   - **`NIGHT_LATE`** ($\alpha < -6.0^\circ$, 22:30–05:00 IST): Street lighting is critical ($1.00$). Commercial footfall drops to $0.35$.

---

## 3. Environmental & Meteorological Integration

### 3.1 Data Provider & Endpoint
- **Provider**: Open-Meteo REST API (`https://api.open-meteo.com/v1/forecast`).
- **Telemetry Requested**:
  - `current`: 2m temperature, relative humidity, apparent temperature, precipitation, WMO weather code, 10m wind speed.
  - `hourly`: Temperature, precipitation probability, hourly precipitation, weather code.
- **Timezone**: Explicitly queried with `timezone=Asia%2FKolkata`.

### 3.2 Data Provenance & Freshness Classifications
1. **`LIVE_OPEN_METEO`** (`LIVE_FRESH`): Current real-time meteorological observations. Cached in-memory with a 15-minute TTL.
2. **`HOURLY_FORECAST`** (`HOURLY_FORECAST`): Future model forecast matched to the nearest scheduled departure hour.
3. **`HISTORICAL_CLIMATE_BASELINE`** (`STALE_FALLBACK`): Climatological baseline used when network requests time out or fail. Reflects Chennai's climate norms (Northeast Monsoon in Oct-Dec, Summer in May-Jun).
4. **`OFFLINE_DEMO_SIMULATION`**: Deterministic offline simulation fixtures for air-gapped test environments.

---

## 4. Safe and Bounded Adjustments

### 4.1 Segment Modifier Bounds
Contextual adjustments are strictly clamped to:
$$\Delta S_{\text{context}} \in [-8.0, +5.0] \text{ points}$$

- **Nocturnal Unlit Corridor**: Unlit segments during darkness receive up to $-3.8 \times \text{relevance}$ points.
- **Well-Lit Night Corridor**: Verified lighting level $\ge 0.8$ during darkness receives $+1.5 \times \text{relevance}$ points.
- **Late-Night Footfall Drop**: Deserted corridors (footfall $< 0.60$) receive up to $-2.5 \times (1 - \text{footfall})$ points.
- **Precipitation & Waterlogging**:
  - Light rain ($> 0.2\text{ mm/h}$): $-1.0$ pt.
  - Moderate rain ($\ge 2.5\text{ mm/h}$): $-2.5$ pts (subways: $-3.5$ pts).
  - Torrential monsoon ($\ge 7.5\text{ mm/h}$): $-4.5$ pts (subways: $-6.5$ pts).

### 4.2 Double-Counting Prevention
If a segment already has active, verified community hazard or lighting reports (`ROAD_CHARACTERISTIC` or `LIGHTING`), the contextual environmental modifier is scaled down:
$$\text{modifier}_{\text{applied}} = \text{modifier}_{\text{raw}} \times 0.65$$
This prevents penalizing commuters twice for the same underlying physical condition.

### 4.3 Kinematic Invariance
Contextual reassessments update safety score, confidence, and contextual advisories, but **strictly preserve route geometry, distance, and travel duration**.

---

## 5. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/context/current` | Returns current Chennai solar and weather conditions. |
| `POST` | `/api/context/evaluate` | Evaluates context for a given date, departure time, and segment codes. |
| `POST` | `/api/context/reassess-route` | Reassesses an existing route alternative with new context without re-routing. |

---

## 6. Non-Predictive Disclaimer
> **Important**: Contextual adjustments reflect physical illumination and meteorological road traction. They do NOT predict crime or guarantee personal safety.
