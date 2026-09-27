"""Real-Time Context, Time-of-Day, and Environmental Adjustments Service (Phase 13).

Calculates deterministic astronomical solar conditions for Chennai (Asia/Kolkata),
fetches real-time and hourly forecast weather from Open-Meteo with caching and fallbacks,
computes bounded contextual modifiers for road segments, and enriches route assessments.
"""

import math
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any

import httpx
from sqlalchemy.orm import Session

from ..config import settings
from ..models.domain import RoadSegment, EvidenceItem
from ..schemas.contextual import (
    SolarPhase,
    WaterloggingRiskLevel,
    ContextualProvenance,
    SolarContext,
    EnvironmentalWeatherContext,
    ContextAdjustedSegment,
    ContextualAssessmentReport,
)
from ..schemas.routing import RouteAlternative

logger = logging.getLogger(__name__)

# Chennai, India Reference Coordinates
CHENNAI_LATITUDE = 13.0827
CHENNAI_LONGITUDE = 80.2707
CHENNAI_TIMEZONE = timezone(timedelta(hours=5, minutes=30))  # Asia/Kolkata (IST: UTC+5:30)

# WMO Weather Code Descriptions
WMO_WEATHER_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Monsoon Rain",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Severe Thunderstorm with Heavy Hail",
}

# Known Waterlogging-Prone Hotspots in Chennai Urban Transit Network
WATERLOGGING_PRONE_CORRIDORS = {
    "vyasarpadi",
    "gengu reddy",
    "rbi subway",
    "velachery",
    "madipakkam",
    "gst road",
    "underpass",
    "subway",
}


class ContextualService:
    """Service boundary for journey time, astronomical illumination, and environmental context."""

    _weather_cache: Dict[str, Dict[str, Any]] = {}
    _cache_ttl_minutes: int = 15

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    # --------------------------------------------------------------------------
    # 1. Date, Time & Timezone Parsing
    # --------------------------------------------------------------------------
    @staticmethod
    def get_chennai_now() -> datetime:
        """Returns the current date and time in Asia/Kolkata (IST: UTC+5:30)."""
        return datetime.now(timezone.utc).astimezone(CHENNAI_TIMEZONE)

    @classmethod
    def parse_journey_datetime(
        cls,
        journey_date: Optional[str] = None,
        departure_time: Optional[str] = None,
    ) -> Tuple[datetime, bool]:
        """
        Parses journey date and departure time into an IST datetime.
        Determines whether the scheduled departure is in the future.
        """
        now_ist = cls.get_chennai_now()

        # Parse date
        if journey_date:
            try:
                date_parts = [int(p) for p in journey_date.split("-")]
                year, month, day = date_parts[0], date_parts[1], date_parts[2]
            except Exception:
                year, month, day = now_ist.year, now_ist.month, now_ist.day
        else:
            year, month, day = now_ist.year, now_ist.month, now_ist.day

        # Parse time
        if departure_time:
            try:
                time_parts = [int(p) for p in departure_time.split(":")[:2]]
                hour, minute = time_parts[0], time_parts[1]
            except Exception:
                hour, minute = now_ist.hour, now_ist.minute
        else:
            hour, minute = now_ist.hour, now_ist.minute

        journey_dt = datetime(year, month, day, hour, minute, tzinfo=CHENNAI_TIMEZONE)
        is_future = journey_dt > (now_ist + timedelta(minutes=10))

        return journey_dt, is_future

    # --------------------------------------------------------------------------
    # 2. Astronomical Solar Context Engine (Chennai: 13.0827 N, 80.2707 E)
    # --------------------------------------------------------------------------
    @classmethod
    def calculate_solar_context(cls, journey_dt: datetime) -> SolarContext:
        """
        Calculates deterministic solar elevation, sunrise, sunset, and twilight for Chennai.
        Uses NOAA solar position formulation calibrated to Chennai's coordinates.
        """
        day_of_year = journey_dt.timetuple().tm_yday
        hour_fraction = journey_dt.hour + (journey_dt.minute / 60.0)

        # Fractional year in radians
        gamma = (2.0 * math.pi / 365.0) * (day_of_year - 1.0 + (hour_fraction - 12.0) / 24.0)

        # Equation of time in minutes
        eot = 229.18 * (
            0.000075
            + 0.001868 * math.cos(gamma)
            - 0.032077 * math.sin(gamma)
            - 0.014615 * math.cos(2.0 * gamma)
            - 0.040849 * math.sin(2.0 * gamma)
        )

        # Solar declination angle in radians
        decl = (
            0.006918
            - 0.399912 * math.cos(gamma)
            + 0.070257 * math.sin(gamma)
            - 0.006758 * math.cos(2.0 * gamma)
            + 0.000907 * math.sin(2.0 * gamma)
            - 0.002697 * math.cos(3.0 * gamma)
            + 0.00148 * math.sin(3.0 * gamma)
        )

        # Chennai Longitude offset from standard IST meridian (82.5° E)
        # 4 minutes per degree of longitude delta
        time_offset_min = 4.0 * (CHENNAI_LONGITUDE - 82.5) + eot
        true_solar_time_min = (journey_dt.hour * 60.0 + journey_dt.minute + time_offset_min) % 1440.0
        hour_angle_deg = (true_solar_time_min / 4.0) - 180.0
        hour_angle_rad = math.radians(hour_angle_deg)

        # Solar elevation angle
        phi_rad = math.radians(CHENNAI_LATITUDE)
        sin_elev = (math.sin(phi_rad) * math.sin(decl)) + (
            math.cos(phi_rad) * math.cos(decl) * math.cos(hour_angle_rad)
        )
        elev_deg = math.degrees(math.asin(max(-1.0, min(1.0, sin_elev))))

        # Sunrise and Sunset times for 90.833° zenith (center of sun at horizon + refraction)
        zenith_sunrise = math.radians(90.833)
        cos_ha_sunrise = (math.cos(zenith_sunrise) - (math.sin(phi_rad) * math.sin(decl))) / (
            math.cos(phi_rad) * math.cos(decl)
        )
        cos_ha_sunrise = max(-1.0, min(1.0, cos_ha_sunrise))
        ha_sunrise_deg = math.degrees(math.acos(cos_ha_sunrise))

        solar_noon_min = (720.0 - time_offset_min) % 1440.0
        sunrise_min = (solar_noon_min - (ha_sunrise_deg * 4.0)) % 1440.0
        sunset_min = (solar_noon_min + (ha_sunrise_deg * 4.0)) % 1440.0

        # Civil Twilight (zenith 96.0°: sun 6° below horizon)
        zenith_twilight = math.radians(96.0)
        cos_ha_twilight = (math.cos(zenith_twilight) - (math.sin(phi_rad) * math.sin(decl))) / (
            math.cos(phi_rad) * math.cos(decl)
        )
        cos_ha_twilight = max(-1.0, min(1.0, cos_ha_twilight))
        ha_twilight_deg = math.degrees(math.acos(cos_ha_twilight))
        dawn_min = (solar_noon_min - (ha_twilight_deg * 4.0)) % 1440.0
        dusk_min = (solar_noon_min + (ha_twilight_deg * 4.0)) % 1440.0

        sunrise_str = f"{int(sunrise_min // 60):02d}:{int(sunrise_min % 60):02d} IST"
        sunset_str = f"{int(sunset_min // 60):02d}:{int(sunset_min % 60):02d} IST"
        dawn_str = f"{int(dawn_min // 60):02d}:{int(dawn_min % 60):02d} IST"
        dusk_str = f"{int(dusk_min // 60):02d}:{int(dusk_min % 60):02d} IST"

        # Classification of Phase
        if elev_deg > 6.0:
            solar_phase = SolarPhase.DAYLIGHT.value
            lighting_relevance = 0.20
            phase_desc = f"Broad daylight (Solar elevation: {elev_deg:.1f}°). Natural ambient visibility is high; street lighting status is non-critical."
        elif elev_deg >= 0.0:
            solar_phase = SolarPhase.GOLDEN_HOUR.value
            lighting_relevance = 0.45
            phase_desc = f"Golden hour transition (Solar elevation: {elev_deg:.1f}°). Ambient daylight waning; roadway visibility transitioning."
        elif elev_deg >= -6.0:
            solar_phase = SolarPhase.CIVIL_TWILIGHT.value
            lighting_relevance = 0.75
            phase_desc = f"Civil twilight (Solar elevation: {elev_deg:.1f}°). Ambient natural light declining; street illumination increasingly vital."
        else:
            # Below twilight horizon: Full nocturnal conditions
            if journey_dt.hour >= 22 or journey_dt.hour < 5:
                solar_phase = SolarPhase.NIGHT_LATE.value
                lighting_relevance = 1.00
                phase_desc = "Late-night nocturnal hours (22:30–05:00 IST). Street lighting is critical; commercial pedestrian footfall is minimal."
            else:
                solar_phase = SolarPhase.NIGHT_EARLY.value
                lighting_relevance = 1.00
                phase_desc = "Early evening nocturnal hours (Sunset–22:30 IST). Street lighting is vital; arterial commercial activity remains active."

        # Footfall attenuation based on Chennai transport diurnal rhythm
        hour = journey_dt.hour
        if 8 <= hour < 21:
            footfall_factor = 1.00
        elif 21 <= hour < 22:
            footfall_factor = 0.85
        elif 22 <= hour < 23:
            footfall_factor = 0.60
        elif 23 <= hour or hour < 5:
            footfall_factor = 0.35  # Sparse late night
        else:
            footfall_factor = 0.70  # Early morning commute ramp

        return SolarContext(
            solar_phase=solar_phase,
            solar_elevation_degrees=round(elev_deg, 2),
            is_dark=elev_deg < -6.0,
            sunrise_ist=sunrise_str,
            sunset_ist=sunset_str,
            dawn_twilight_ist=dawn_str,
            dusk_twilight_ist=dusk_str,
            lighting_relevance_factor=round(lighting_relevance, 2),
            footfall_attenuation_factor=round(footfall_factor, 2),
            phase_description=phase_desc,
        )

    # --------------------------------------------------------------------------
    # 3. Environmental & Weather Data Integration (Open-Meteo + Fallback)
    # --------------------------------------------------------------------------
    @classmethod
    def get_environmental_context(
        cls,
        journey_dt: datetime,
        is_future: bool = False,
    ) -> EnvironmentalWeatherContext:
        """
        Retrieves real-time or hourly forecast weather for Chennai from Open-Meteo API.
        Applies in-memory TTL caching and deterministic seasonal baseline fallbacks.
        """
        cache_key = f"{journey_dt.strftime('%Y-%m-%d:%H')}:{is_future}"
        now_utc = datetime.now(timezone.utc)

        # Check Cache
        if cache_key in cls._weather_cache:
            entry = cls._weather_cache[cache_key]
            if (now_utc - entry["cached_at"]).total_seconds() < (cls._cache_ttl_minutes * 60):
                return entry["data"]

        # Attempt Live Open-Meteo Fetch
        weather_data = None
        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={CHENNAI_LATITUDE}&longitude={CHENNAI_LONGITUDE}"
                f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"
                f"&hourly=temperature_2m,precipitation_probability,precipitation,weather_code"
                f"&timezone=Asia%2FKolkata"
            )
            with httpx.Client(timeout=3.5) as client:
                res = client.get(url)
                if res.status_code == 200:
                    weather_data = res.json()
        except Exception as ex:
            logger.warning(f"Open-Meteo weather fetch failed; using seasonal baseline: {ex}")

        if weather_data:
            context = cls._parse_open_meteo_response(weather_data, journey_dt, is_future)
        else:
            context = cls._get_seasonal_climate_baseline(journey_dt, is_future)

        # Cache result
        cls._weather_cache[cache_key] = {
            "cached_at": now_utc,
            "data": context,
        }
        return context

    @classmethod
    def _parse_open_meteo_response(
        cls,
        raw_json: Dict[str, Any],
        journey_dt: datetime,
        is_future: bool,
    ) -> EnvironmentalWeatherContext:
        """Parses Open-Meteo response into structured EnvironmentalWeatherContext."""
        advisories = []
        now_utc = datetime.now(timezone.utc)

        if is_future and "hourly" in raw_json:
            # Locate matching hour in hourly forecast
            target_str = journey_dt.strftime("%Y-%m-%dT%H:00")
            times = raw_json["hourly"].get("time", [])
            idx = 0
            if target_str in times:
                idx = times.index(target_str)

            temp = float(raw_json["hourly"].get("temperature_2m", [30.0])[idx])
            precip = float(raw_json["hourly"].get("precipitation", [0.0])[idx])
            code = int(raw_json["hourly"].get("weather_code", [0])[idx])
            rain_prob = int(raw_json["hourly"].get("precipitation_probability", [0])[idx])
            wind_speed = None
            apparent_temp = temp
            provenance = ContextualProvenance.HOURLY_FORECAST.value
        else:
            curr = raw_json.get("current", {})
            temp = float(curr.get("temperature_2m", 30.5))
            apparent_temp = float(curr.get("apparent_temperature", temp))
            precip = float(curr.get("precipitation", 0.0))
            code = int(curr.get("weather_code", 0))
            wind_speed = float(curr.get("wind_speed_10m", 12.0))
            rain_prob = 100 if precip > 0.5 else 10
            provenance = ContextualProvenance.LIVE_OPEN_METEO.value

        desc = WMO_WEATHER_CODES.get(code, "Clear / Moderate Conditions")

        # Derive Waterlogging Risk Level
        if precip >= 7.5 or code in (65, 82, 95, 96, 99):
            waterlogging_risk = WaterloggingRiskLevel.HIGH.value
            advisories.append("High waterlogging risk: Torrential monsoon downpour. Avoid subway underpasses.")
        elif precip >= 2.5 or code in (63, 81):
            waterlogging_risk = WaterloggingRiskLevel.MODERATE.value
            advisories.append("Moderate rain: Road friction reduced; minor water stagnation possible.")
        elif precip > 0.2:
            waterlogging_risk = WaterloggingRiskLevel.LOW.value
            advisories.append("Light precipitation: Wet road surfaces; maintain braking distance.")
        else:
            waterlogging_risk = WaterloggingRiskLevel.NONE.value

        if temp >= 38.0:
            advisories.append("Extreme heat caution: Afternoon heat index exceeds 40°C.")

        return EnvironmentalWeatherContext(
            temperature_celsius=round(temp, 1),
            apparent_temperature_celsius=round(apparent_temp, 1) if apparent_temp else None,
            weather_description=desc,
            weather_code=code,
            precipitation_mm=round(precip, 2),
            rain_probability_pct=rain_prob,
            wind_speed_kmh=round(wind_speed, 1) if wind_speed else None,
            waterlogging_risk_level=waterlogging_risk,
            active_advisories=advisories,
            is_forecast=is_future,
            provenance=provenance,
            observed_or_forecast_time_ist=journey_dt.strftime("%Y-%m-%d %H:%M IST"),
            retrieval_timestamp_utc=now_utc.isoformat(),
            data_freshness_status="LIVE_FRESH" if not is_future else "HOURLY_FORECAST",
        )

    @classmethod
    def _get_seasonal_climate_baseline(
        cls,
        journey_dt: datetime,
        is_future: bool,
    ) -> EnvironmentalWeatherContext:
        """
        Deterministic climatological fallback when live external APIs are unavailable.
        Reflects documented Chennai climate norms (Northeast Monsoon in Oct-Dec, Summer in Apr-Jun).
        """
        month = journey_dt.month
        now_utc = datetime.now(timezone.utc)
        advisories = []

        if month in (10, 11, 12):
            # Northeast Monsoon season
            temp = 28.5
            desc = "Northeast Monsoon Season (Seasonal Norm)"
            precip = 1.8
            code = 61
            waterlogging_risk = WaterloggingRiskLevel.LOW.value
            advisories.append("Northeast Monsoon season: Periodic showers typical for Chennai in this month.")
        elif month in (5, 6):
            # Peak Summer
            temp = 36.0
            desc = "Agni Nakshatram Summer Heat"
            precip = 0.0
            code = 0
            waterlogging_risk = WaterloggingRiskLevel.NONE.value
            advisories.append("Elevated ambient temperatures expected during daytime.")
        else:
            temp = 30.0
            desc = "Clear Tropical Coastal Conditions"
            precip = 0.0
            code = 0
            waterlogging_risk = WaterloggingRiskLevel.NONE.value

        return EnvironmentalWeatherContext(
            temperature_celsius=temp,
            apparent_temperature_celsius=temp + 3.0,
            weather_description=desc,
            weather_code=code,
            precipitation_mm=precip,
            rain_probability_pct=30 if month in (10, 11, 12) else 5,
            wind_speed_kmh=14.0,
            waterlogging_risk_level=waterlogging_risk,
            active_advisories=advisories,
            is_forecast=is_future,
            provenance=ContextualProvenance.HISTORICAL_CLIMATE_BASELINE.value,
            observed_or_forecast_time_ist=journey_dt.strftime("%Y-%m-%d %H:%M IST"),
            retrieval_timestamp_utc=now_utc.isoformat(),
            data_freshness_status="STALE_FALLBACK",
        )

    # --------------------------------------------------------------------------
    # 4. Safe and Bounded Contextual Adjustments for Road Segments
    # --------------------------------------------------------------------------
    def evaluate_segment_context(
        self,
        segment: RoadSegment,
        journey_dt: datetime,
        traversal_offset_minutes: float = 0.0,
        weather: Optional[EnvironmentalWeatherContext] = None,
    ) -> ContextAdjustedSegment:
        """
        Evaluates contextual factors for a single road segment at its expected traversal time.
        Produces bounded score modifiers [-8.0, +5.0] without double-counting existing evidence.
        """
        segment_traversal_dt = journey_dt + timedelta(minutes=traversal_offset_minutes)
        solar = self.calculate_solar_context(segment_traversal_dt)

        if not weather:
            weather = self.get_environmental_context(segment_traversal_dt)

        raw_base = segment.current_safety_score if segment.current_safety_score is not None else segment.baseline_safety_score
        base_score = float(raw_base) if raw_base is not None else None
        base_confidence = float(segment.confidence_score) if segment.confidence_score is not None else 80.0

        modifiers = []
        active_factors = []

        # A. Solar Illumination & Street Lighting Relevance
        lighting_level = float(segment.lighting_level or 0.6)
        relevance = solar.lighting_relevance_factor

        if solar.is_dark or solar.solar_phase == SolarPhase.CIVIL_TWILIGHT.value:
            if lighting_level >= 0.8:
                mod = 1.5 * relevance
                modifiers.append(mod)
                active_factors.append(f"Well-lit night corridor (+{mod:.1f} pts)")
            elif lighting_level <= 0.4:
                mod = -3.8 * relevance
                modifiers.append(mod)
                active_factors.append(f"Unlit/poorly lit stretch during darkness ({mod:.1f} pts)")
        else:
            # During bright daylight, lighting status impact is muted
            if lighting_level <= 0.4:
                mod = -0.5  # Minimal daylight penalty for lack of fixtures
                modifiers.append(mod)
                active_factors.append("Daylight traversal: lighting status secondary (-0.5 pts)")

        # B. Footfall Diurnal Curve
        if solar.footfall_attenuation_factor < 0.6:
            mod = -2.5 * (1.0 - solar.footfall_attenuation_factor)
            modifiers.append(mod)
            active_factors.append(f"Deserted late-night corridor ({mod:.1f} pts)")

        # C. Precipitation & Monsoon Impact
        seg_name_lower = (segment.name or "").lower()
        corridor_lower = (segment.corridor or "").lower()
        is_waterlogging_prone = any(
            hotspot in seg_name_lower or hotspot in corridor_lower
            for hotspot in WATERLOGGING_PRONE_CORRIDORS
        )

        waterlogging_status = "NONE"
        if weather.precipitation_mm >= 7.5 or weather.weather_code in (65, 82, 95):
            rain_mod = -4.5
            if is_waterlogging_prone:
                rain_mod -= 2.0
                waterlogging_status = "HIGH"
                active_factors.append("Critical underpass waterlogging risk (-6.5 pts)")
            else:
                waterlogging_status = "MODERATE"
                active_factors.append("Torrential monsoon rainfall (-4.5 pts)")
            modifiers.append(rain_mod)
        elif weather.precipitation_mm >= 2.5:
            rain_mod = -2.5
            if is_waterlogging_prone:
                rain_mod -= 1.0
                waterlogging_status = "MODERATE"
                active_factors.append("Waterlogging prone subway (-3.5 pts)")
            else:
                active_factors.append("Moderate rain spray and slick roadway (-2.5 pts)")
            modifiers.append(rain_mod)
        elif weather.precipitation_mm > 0.2:
            modifiers.append(-1.0)
            active_factors.append("Light precipitation wet surface (-1.0 pts)")

        # D. Double-Counting Prevention
        # If segment already has an active community report for hazard or lighting, dampen contextual modifier
        if self.db:
            has_existing_hazard = (
                self.db.query(EvidenceItem)
                .filter(
                    EvidenceItem.segment_code == segment.segment_code,
                    EvidenceItem.category.in_(["ROAD_CHARACTERISTIC", "LIGHTING"]),
                    EvidenceItem.verification_status.in_(["VERIFIED", "CORROBORATED"]),
                )
                .count()
            ) > 0
            if has_existing_hazard and len(modifiers) > 0:
                # Dampen to prevent stacking double penalties on the same physical reality
                modifiers = [m * 0.65 for m in modifiers]
                active_factors.append("Double-counting prevention: modifier dampened against verified reports")

        # Sum and Clamp Contextual Modifier strictly to [-8.0, +5.0]
        raw_modifier = sum(modifiers)
        clamped_modifier = round(max(-8.0, min(5.0, raw_modifier)), 2)

        # Clamped Final Safety Score [15.0, 95.0] if base score exists
        if base_score is not None:
            adjusted_score = round(max(15.0, min(95.0, base_score + clamped_modifier)), 1)
        else:
            adjusted_score = None

        # Confidence Adjustments
        adjusted_confidence = base_confidence
        if solar.is_dark and segment.lighting_level is None:
            adjusted_confidence = max(10.0, round(adjusted_confidence * 0.85, 1))
            active_factors.append("Confidence reduced: unverified nocturnal lighting")
        if weather.precipitation_mm >= 7.5:
            adjusted_confidence = max(10.0, round(adjusted_confidence * 0.90, 1))

        return ContextAdjustedSegment(
            segment_code=segment.segment_code,
            road_name=segment.name,
            corridor=segment.corridor,
            traversal_time_offset_minutes=round(traversal_offset_minutes, 1),
            base_safety_score=base_score,
            contextual_modifier=clamped_modifier,
            context_adjusted_safety_score=adjusted_score,
            base_confidence=base_confidence,
            context_adjusted_confidence=adjusted_confidence,
            lighting_relevance=round(solar.lighting_relevance_factor, 2),
            active_factors=active_factors,
            waterlogging_vulnerability=waterlogging_status,
        )

    # --------------------------------------------------------------------------
    # 5. Route-Level Contextual Enrichment & Aggregation
    # --------------------------------------------------------------------------
    def enrich_route_with_context(
        self,
        route: RouteAlternative,
        journey_date: Optional[str] = None,
        departure_time: Optional[str] = None,
    ) -> ContextualAssessmentReport:
        """
        Calculates progressive traversal context for all segments on a route.
        Updates route composite scores and attaches a comprehensive ContextualAssessmentReport.
        Preserves verified routing kinematics (distance and travel duration remain invariant).
        """
        journey_dt, is_future = self.parse_journey_datetime(journey_date, departure_time)
        solar = self.calculate_solar_context(journey_dt)
        weather = self.get_environmental_context(journey_dt, is_future)

        cumulative_duration_min = 0.0
        adjusted_segments: List[ContextAdjustedSegment] = []
        total_length = max(1.0, float(route.metrics.distance_meters))

        # Weight by segment length
        weighted_adjusted_scores = []
        weighted_confidences = []
        modifiers = []
        vulnerable_count = 0
        assessed_length = 0.0

        for seg_summary in route.segments:
            # Traversal time progressive offset
            seg_len = float(seg_summary.length_meters or 100.0)
            seg_fraction = seg_len / total_length
            seg_duration_min = (route.metrics.duration_minutes or 10.0) * seg_fraction
            traversal_offset = cumulative_duration_min + (seg_duration_min / 2.0)
            cumulative_duration_min += seg_duration_min

            # If segment is unassessed in base risk engine, preserve None
            if seg_summary.safety_score is None:
                continue

            # Find domain model if DB available
            seg_obj = None
            if self.db:
                seg_obj = (
                    self.db.query(RoadSegment)
                    .filter(RoadSegment.segment_code == seg_summary.segment_code)
                    .first()
                )

            if not seg_obj:
                # Fallback model representation from summary
                seg_obj = RoadSegment(
                    segment_code=seg_summary.segment_code,
                    name=seg_summary.name,
                    corridor=seg_summary.corridor or "Chennai Corridor",
                    current_safety_score=seg_summary.safety_score,
                    confidence_score=seg_summary.confidence_score,
                    lighting_level=seg_summary.lighting_level or 0.6,
                )
            else:
                # Use the evaluated safety score from the summary as base
                seg_obj.current_safety_score = seg_summary.safety_score

            adj = self.evaluate_segment_context(
                segment=seg_obj,
                journey_dt=journey_dt,
                traversal_offset_minutes=traversal_offset,
                weather=weather,
            )
            adjusted_segments.append(adj)

            # Update segment summary with context-adjusted score
            seg_summary.safety_score = adj.context_adjusted_safety_score
            seg_summary.confidence_score = adj.context_adjusted_confidence
            if adj.waterlogging_vulnerability in ("MODERATE", "HIGH"):
                vulnerable_count += 1

            if adj.context_adjusted_safety_score is not None:
                weighted_adjusted_scores.append(adj.context_adjusted_safety_score * seg_len)
                assessed_length += seg_len
            weighted_confidences.append(adj.context_adjusted_confidence * seg_len)
            modifiers.append(adj.contextual_modifier)

        # Aggregate Route-Level Contextual Scores
        if weighted_adjusted_scores and assessed_length > 0:
            new_composite_score = round(sum(weighted_adjusted_scores) / assessed_length, 1)
            new_composite_conf = round(sum(weighted_confidences) / total_length, 1)
            mean_modifier = round(sum(modifiers) / len(modifiers), 2)
        else:
            new_composite_score = route.safety_score
            new_composite_conf = round(sum(weighted_confidences) / total_length, 1) if weighted_confidences else route.confidence_score
            mean_modifier = round(sum(modifiers) / len(modifiers), 2) if modifiers else 0.0

        # Store pre-adjustment composite confidence to calculate delta
        old_composite_conf = route.confidence_score if route.confidence_score is not None else 80.0

        # Update RouteAlternative scores without altering duration or distance
        route.safety_score = new_composite_score
        route.confidence_score = new_composite_conf

        # Formulate Route-Wide Active Advisories
        route_advisories = list(weather.active_advisories)
        if solar.is_dark:
            route_advisories.append(f"Nocturnal travel ({solar.solar_phase}): Street lighting relevance is 100%.")
        if vulnerable_count > 0:
            route_advisories.append(
                f"{vulnerable_count} segment(s) on this route pass through waterlogging-vulnerable Chennai underpasses."
            )

        report = ContextualAssessmentReport(
            journey_date=journey_dt.strftime("%Y-%m-%d"),
            departure_time=journey_dt.strftime("%H:%M"),
            timezone="Asia/Kolkata (IST: UTC+5:30)",
            is_departure_future=is_future,
            solar_context=solar,
            environmental_context=weather,
            contextual_modifier_mean_pts=mean_modifier,
            confidence_modifier_mean_pct=round(new_composite_conf - old_composite_conf, 2),
            vulnerable_segments_count=vulnerable_count,
            active_advisories=route_advisories,
            disclaimer=settings.DISCLAIMER_TEXT,
        )

        return report
