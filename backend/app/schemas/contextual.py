"""Schemas for Phase 13 Real-Time Context, Time-of-Day, and Environmental Adjustments."""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, Field


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SolarPhase(str, Enum):
    DAYLIGHT = "DAYLIGHT"
    GOLDEN_HOUR = "GOLDEN_HOUR"
    CIVIL_TWILIGHT = "CIVIL_TWILIGHT"
    NIGHT_EARLY = "NIGHT_EARLY"
    NIGHT_LATE = "NIGHT_LATE"


class WaterloggingRiskLevel(str, Enum):
    NONE = "NONE"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"


class ContextualProvenance(str, Enum):
    LIVE_OPEN_METEO = "LIVE_OPEN_METEO"
    HOURLY_FORECAST = "HOURLY_FORECAST"
    HISTORICAL_CLIMATE_BASELINE = "HISTORICAL_CLIMATE_BASELINE"
    OFFLINE_DEMO_SIMULATION = "OFFLINE_DEMO_SIMULATION"


class SolarContext(BaseModel):
    solar_phase: str = Field(..., description="DAYLIGHT, GOLDEN_HOUR, CIVIL_TWILIGHT, NIGHT_EARLY, or NIGHT_LATE")
    solar_elevation_degrees: float = Field(..., description="Sun elevation angle above horizon in degrees")
    is_dark: bool = Field(..., description="True if sun is below civil twilight horizon (-6 degrees)")
    sunrise_ist: str = Field(..., description="Sunrise time in IST, e.g. '05:58 IST'")
    sunset_ist: str = Field(..., description="Sunset time in IST, e.g. '18:04 IST'")
    dawn_twilight_ist: str = Field(..., description="Civil dawn start time in IST")
    dusk_twilight_ist: str = Field(..., description="Civil dusk end time in IST")
    lighting_relevance_factor: float = Field(..., ge=0.0, le=1.0, description="How critical street lighting is (0.20 in day, 1.00 at night)")
    footfall_attenuation_factor: float = Field(..., ge=0.0, le=1.0, description="Diurnal footfall activity factor (1.0 peak, 0.35 late night)")
    phase_description: str = Field(..., description="Contextual explanation of solar illumination")


class EnvironmentalWeatherContext(BaseModel):
    temperature_celsius: float = Field(..., description="Ambient temperature in degrees Celsius")
    apparent_temperature_celsius: Optional[float] = Field(None, description="Feels-like temperature factoring humidity")
    weather_description: str = Field(..., description="Human-readable condition, e.g. Clear Sky, Moderate Rain")
    weather_code: int = Field(..., description="WMO weather interpretation code")
    precipitation_mm: float = Field(0.0, ge=0.0, description="Precipitation rate in mm/hour")
    rain_probability_pct: Optional[int] = Field(None, ge=0, le=100, description="Probability of precipitation (0-100%)")
    wind_speed_kmh: Optional[float] = Field(None, description="Wind speed in km/h")
    waterlogging_risk_level: str = Field("NONE", description="NONE, LOW, MODERATE, or HIGH")
    active_advisories: List[str] = Field(default_factory=list, description="Active environmental cautions")
    is_forecast: bool = Field(False, description="True if data is a future model forecast rather than current telemetry")
    provenance: str = Field("LIVE_OPEN_METEO", description="Data provider or simulation label")
    observed_or_forecast_time_ist: str = Field(..., description="Target time in IST format")
    retrieval_timestamp_utc: str = Field(..., description="Timestamp of telemetry fetch in ISO UTC")
    data_freshness_status: str = Field("LIVE_FRESH", description="LIVE_FRESH, CACHED_VALID, STALE_FALLBACK, or OFFLINE_SIMULATION")


class ContextAdjustedSegment(BaseModel):
    segment_code: str
    road_name: str
    corridor: Optional[str] = None
    traversal_time_offset_minutes: float = Field(0.0, description="Estimated minutes from journey start when traversed")
    base_safety_score: Optional[float] = Field(None, description="Baseline safety score before environmental adjustments")
    contextual_modifier: float = Field(..., description="Signed contextual modifier (-8.0 to +5.0 pts)")
    context_adjusted_safety_score: Optional[float] = Field(None, description="Final context-aware score [15.0, 95.0]")
    base_confidence: float = Field(..., description="Base data confidence")
    context_adjusted_confidence: float = Field(..., description="Confidence adjusted for darkness/rain uncertainty")
    lighting_relevance: float = Field(1.0, description="Lighting relevance multiplier applied")
    active_factors: List[str] = Field(default_factory=list, description="Specific contextual influences applied")
    waterlogging_vulnerability: str = Field("NONE", description="NONE, LOW, or HIGH vulnerability")


class ContextualAssessmentReport(BaseModel):
    journey_date: str = Field(..., description="Journey date YYYY-MM-DD")
    departure_time: str = Field(..., description="Departure time HH:MM")
    timezone: str = Field("Asia/Kolkata (IST: UTC+5:30)", description="Official journey local timezone")
    is_departure_future: bool = Field(..., description="True if journey departure is scheduled in the future")
    solar_context: SolarContext
    environmental_context: EnvironmentalWeatherContext
    contextual_modifier_mean_pts: float = Field(..., description="Average contextual score adjustment across route")
    confidence_modifier_mean_pct: float = Field(..., description="Average confidence adjustment percentage")
    vulnerable_segments_count: int = Field(0, description="Number of segments flagged for nocturnal or waterlogging vulnerability")
    active_advisories: List[str] = Field(default_factory=list, description="Route-wide environmental warnings")
    disclaimer: str = Field(..., description="Non-predictive ethical advisory disclaimer")


class CurrentContextResponse(BaseModel):
    current_time_ist: str = Field(..., description="Current timestamp in Asia/Kolkata (IST: UTC+5:30)")
    timezone: str = Field("Asia/Kolkata (IST: UTC+5:30)", description="Official journey local timezone")
    solar_context: SolarContext
    environmental_context: EnvironmentalWeatherContext
    disclaimer: str = Field(..., description="Non-predictive contextual advisory disclaimer")


class ContextEvaluateRequest(BaseModel):
    journey_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Departure date (YYYY-MM-DD)")
    departure_time: Optional[str] = Field(None, description="Departure time (HH:MM or HH:MM:SS)")
    segment_codes: Optional[List[str]] = Field(default_factory=list, description="Optional segment codes to evaluate")


class ContextEvaluateResponse(BaseModel):
    journey_date: str = Field(..., description="Target journey date (YYYY-MM-DD)")
    departure_time: str = Field(..., description="Target departure time (HH:MM)")
    timezone: str = Field("Asia/Kolkata (IST: UTC+5:30)", description="Official journey local timezone")
    is_departure_future: bool = Field(..., description="True if departure time is in the future")
    solar_context: SolarContext
    environmental_context: EnvironmentalWeatherContext
    evaluated_segments: List[ContextAdjustedSegment] = Field(default_factory=list)
    active_advisories: List[str] = Field(default_factory=list)
    disclaimer: str = Field(..., description="Non-predictive contextual advisory disclaimer")


class RouteReassessContextRequest(BaseModel):
    route: Dict[str, Any] = Field(..., description="Existing route alternative dictionary to be reassessed")
    journey_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="New departure date (YYYY-MM-DD)")
    departure_time: Optional[str] = Field(None, description="New departure time (HH:MM)")

