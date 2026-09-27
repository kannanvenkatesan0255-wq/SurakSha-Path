"""Unit and integration tests for Phase 13 Real-Time Context, Time-of-Day, and Environmental Adjustments."""

import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from backend.app.services.contextual_service import (
    ContextualService,
    CHENNAI_LATITUDE,
    CHENNAI_LONGITUDE,
    CHENNAI_TIMEZONE,
    WATERLOGGING_PRONE_CORRIDORS,
)
from backend.app.schemas.contextual import (
    SolarPhase,
    WaterloggingRiskLevel,
    ContextualProvenance,
    SolarContext,
    EnvironmentalWeatherContext,
    ContextAdjustedSegment,
    ContextualAssessmentReport,
)
from backend.app.models.domain import RoadSegment, EvidenceItem
from backend.app.schemas.routing import RouteAlternative, RouteMetrics, SegmentSummary


class TestContextualService(unittest.TestCase):
    """Test suite for Phase 13 Contextual Service."""

    def setUp(self):
        self.service = ContextualService(db=None)

    def test_chennai_timezone_utc_offset(self):
        """Chennai timezone must be strictly UTC+5:30 (Asia/Kolkata)."""
        now_ist = self.service.get_chennai_now()
        self.assertEqual(now_ist.tzinfo, CHENNAI_TIMEZONE)
        self.assertEqual(now_ist.utcoffset(), timedelta(hours=5, minutes=30))

    def test_parse_journey_datetime_present_and_future(self):
        """Distinguishes current departures from future scheduled journeys."""
        now_ist = self.service.get_chennai_now()

        # Present departure
        dt_curr, is_future_curr = self.service.parse_journey_datetime(
            journey_date=now_ist.strftime("%Y-%m-%d"),
            departure_time=now_ist.strftime("%H:%M"),
        )
        self.assertFalse(is_future_curr)
        self.assertEqual(dt_curr.tzinfo, CHENNAI_TIMEZONE)

        # Future departure (tomorrow)
        tomorrow = now_ist + timedelta(days=1)
        dt_fut, is_future_fut = self.service.parse_journey_datetime(
            journey_date=tomorrow.strftime("%Y-%m-%d"),
            departure_time="14:30",
        )
        self.assertTrue(is_future_fut)
        self.assertEqual(dt_fut.hour, 14)
        self.assertEqual(dt_fut.minute, 30)

        # Fallback for malformed string
        dt_fallback, _ = self.service.parse_journey_datetime(
            journey_date="invalid-date",
            departure_time="bad:time:format",
        )
        self.assertIsInstance(dt_fallback, datetime)

    def test_solar_elevation_and_phases_across_day(self):
        """NOAA solar position calculations correctly classify daylight, twilight, and nocturnal hours."""
        test_date = datetime(2026, 9, 27, tzinfo=CHENNAI_TIMEZONE)

        # 1. Solar Noon (12:15 IST) -> High daylight elevation
        noon_dt = test_date.replace(hour=12, minute=15)
        solar_noon = self.service.calculate_solar_context(noon_dt)
        self.assertEqual(solar_noon.solar_phase, SolarPhase.DAYLIGHT.value)
        self.assertGreater(solar_noon.solar_elevation_degrees, 40.0)
        self.assertFalse(solar_noon.is_dark)
        self.assertEqual(solar_noon.lighting_relevance_factor, 0.20)
        self.assertEqual(solar_noon.footfall_attenuation_factor, 1.00)

        # 2. Civil Twilight / Sunset transition (~18:15 IST)
        dusk_dt = test_date.replace(hour=18, minute=15)
        solar_dusk = self.service.calculate_solar_context(dusk_dt)
        self.assertIn(
            solar_dusk.solar_phase,
            [SolarPhase.GOLDEN_HOUR.value, SolarPhase.CIVIL_TWILIGHT.value, SolarPhase.NIGHT_EARLY.value],
        )
        self.assertGreater(solar_dusk.lighting_relevance_factor, 0.40)

        # 3. Early Night (21:30 IST) -> Complete darkness
        night_dt = test_date.replace(hour=21, minute=30)
        solar_night = self.service.calculate_solar_context(night_dt)
        self.assertEqual(solar_night.solar_phase, SolarPhase.NIGHT_EARLY.value)
        self.assertTrue(solar_night.is_dark)
        self.assertEqual(solar_night.lighting_relevance_factor, 1.00)
        self.assertLess(solar_night.solar_elevation_degrees, -6.0)

        # 4. Late Night (02:30 IST) -> Full darkness with low footfall
        late_dt = test_date.replace(hour=2, minute=30)
        solar_late = self.service.calculate_solar_context(late_dt)
        self.assertEqual(solar_late.solar_phase, SolarPhase.NIGHT_LATE.value)
        self.assertTrue(solar_late.is_dark)
        self.assertEqual(solar_late.lighting_relevance_factor, 1.00)
        self.assertEqual(solar_late.footfall_attenuation_factor, 0.35)

    def test_environmental_context_seasonal_baseline_fallback(self):
        """When external API is unavailable, service provides deterministic seasonal norms."""
        # Northeast Monsoon month (November)
        nov_dt = datetime(2026, 11, 15, 10, 0, tzinfo=CHENNAI_TIMEZONE)
        weather_nov = self.service._get_seasonal_climate_baseline(nov_dt, is_future=False)
        self.assertEqual(weather_nov.provenance, ContextualProvenance.HISTORICAL_CLIMATE_BASELINE.value)
        self.assertEqual(weather_nov.data_freshness_status, "STALE_FALLBACK")
        self.assertGreater(weather_nov.precipitation_mm, 0.0)
        self.assertIn("Northeast Monsoon", weather_nov.weather_description)

        # Summer month (May)
        may_dt = datetime(2026, 5, 20, 14, 0, tzinfo=CHENNAI_TIMEZONE)
        weather_may = self.service._get_seasonal_climate_baseline(may_dt, is_future=False)
        self.assertGreaterEqual(weather_may.temperature_celsius, 35.0)

    def test_segment_context_modifier_bounds_and_daylight_vs_night(self):
        """Segment contextual modifiers must be strictly bounded to [-8.0, +5.0] points."""
        test_dt_day = datetime(2026, 9, 27, 12, 0, tzinfo=CHENNAI_TIMEZONE)
        test_dt_night = datetime(2026, 9, 27, 23, 30, tzinfo=CHENNAI_TIMEZONE)

        # Clear weather mock
        clear_weather = EnvironmentalWeatherContext(
            temperature_celsius=29.0,
            weather_description="Clear Sky",
            weather_code=0,
            precipitation_mm=0.0,
            waterlogging_risk_level="NONE",
            is_forecast=False,
            provenance="LIVE_OPEN_METEO",
            observed_or_forecast_time_ist="2026-09-27 12:00 IST",
            retrieval_timestamp_utc=datetime.now(timezone.utc).isoformat(),
            data_freshness_status="LIVE_FRESH",
        )

        unlit_segment = RoadSegment(
            segment_code="SEG-TEST-UNLIT-001",
            name="Unlit Suburban Lane",
            corridor="Perungudi Link",
            current_safety_score=65.0,
            confidence_score=75.0,
            lighting_level=0.1,  # Poorly lit
        )

        # A. Daylight traversal: Unlit lane has only mild daylight penalty (-0.5 pts)
        adj_day = self.service.evaluate_segment_context(
            segment=unlit_segment,
            journey_dt=test_dt_day,
            weather=clear_weather,
        )
        self.assertGreater(adj_day.contextual_modifier, -2.0)
        self.assertGreaterEqual(adj_day.context_adjusted_safety_score, 15.0)
        self.assertLessEqual(adj_day.context_adjusted_safety_score, 95.0)

        # B. Night traversal (23:30 IST): Unlit lane has strong nocturnal penalty + late night sparsity
        adj_night = self.service.evaluate_segment_context(
            segment=unlit_segment,
            journey_dt=test_dt_night,
            weather=clear_weather,
        )
        self.assertLess(adj_night.contextual_modifier, -3.0)
        self.assertGreaterEqual(adj_night.contextual_modifier, -8.0)
        self.assertLess(adj_night.context_adjusted_safety_score, adj_day.context_adjusted_safety_score)

    def test_waterlogging_hotspot_penalization_during_heavy_rain(self):
        """Low-lying subways in Chennai receive waterlogging penalties during monsoon downpours."""
        test_dt = datetime(2026, 11, 10, 16, 0, tzinfo=CHENNAI_TIMEZONE)

        heavy_rain_weather = EnvironmentalWeatherContext(
            temperature_celsius=26.0,
            weather_description="Heavy Monsoon Rain",
            weather_code=65,
            precipitation_mm=12.5,  # Torrential
            waterlogging_risk_level=WaterloggingRiskLevel.HIGH.value,
            active_advisories=["High waterlogging risk"],
            is_forecast=False,
            provenance="LIVE_OPEN_METEO",
            observed_or_forecast_time_ist="2026-11-10 16:00 IST",
            retrieval_timestamp_utc=datetime.now(timezone.utc).isoformat(),
            data_freshness_status="LIVE_FRESH",
        )

        subway_segment = RoadSegment(
            segment_code="SEG-VYASARPADI-SUBWAY-01",
            name="Vyasarpadi Subway Underpass",
            corridor="Vyasarpadi Arterial",
            current_safety_score=70.0,
            confidence_score=80.0,
            lighting_level=0.7,
        )

        adj = self.service.evaluate_segment_context(
            segment=subway_segment,
            journey_dt=test_dt,
            weather=heavy_rain_weather,
        )
        self.assertEqual(adj.waterlogging_vulnerability, "HIGH")
        self.assertLess(adj.contextual_modifier, -5.0)
        self.assertGreaterEqual(adj.contextual_modifier, -8.0)  # Bound clamped

    def test_double_counting_prevention_with_existing_community_reports(self):
        """Contextual modifiers are dampened when verified community hazard reports already exist."""
        test_dt = datetime(2026, 9, 27, 22, 0, tzinfo=CHENNAI_TIMEZONE)

        # Mock DB session with existing verified evidence item
        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_filter.count.return_value = 2  # 2 verified reports exist on this segment
        mock_query.filter.return_value = mock_filter
        mock_db.query.return_value = mock_query

        service_with_db = ContextualService(db=mock_db)

        unlit_segment = RoadSegment(
            segment_code="SEG-ANNA-HAZARD-01",
            name="Anna Salai Stretch",
            corridor="Anna Salai",
            current_safety_score=60.0,
            confidence_score=75.0,
            lighting_level=0.2,
        )

        adj = service_with_db.evaluate_segment_context(
            segment=unlit_segment,
            journey_dt=test_dt,
        )
        # Should have double-counting damping factor applied
        has_damping = any("Double-counting prevention" in f for f in adj.active_factors)
        self.assertTrue(has_damping)

    def test_enrich_route_preserves_kinematics_and_aggregates_scores(self):
        """Route-level enrichment preserves geometry and duration while updating contextual scores."""
        alt = RouteAlternative(
            route_id="ROUTE-TEST-ALT-01",
            route_type="BALANCED",
            title="via Anna Salai",
            summary="Anna Salai, Mount Road",
            metrics=RouteMetrics(
                distance_meters=5000.0,
                distance_km=5.0,
                duration_seconds=720.0,
                duration_minutes=12.0,
            ),
            coordinates=[[80.2707, 13.0827], [80.2500, 13.0600]],
            safety_score=72.0,
            confidence_score=85.0,
            segments=[
                SegmentSummary(
                    segment_code="SEG-ANNA-01",
                    name="Anna Salai North",
                    length_meters=2500.0,
                    safety_score=74.0,
                    confidence_score=85.0,
                    lighting_level=0.8,
                ),
                SegmentSummary(
                    segment_code="SEG-ANNA-02",
                    name="Anna Salai South",
                    length_meters=2500.0,
                    safety_score=70.0,
                    confidence_score=85.0,
                    lighting_level=0.3,
                ),
            ],
        )

        # Nocturnal trip at 23:45 IST
        report = self.service.enrich_route_with_context(
            route=alt,
            journey_date="2026-09-27",
            departure_time="23:45",
        )

        # 1. Kinematics must remain invariant
        self.assertEqual(alt.metrics.distance_meters, 5000.0)
        self.assertEqual(alt.metrics.duration_minutes, 12.0)
        self.assertEqual(len(alt.coordinates), 2)

        # 2. Contextual report attached
        self.assertIsInstance(report, ContextualAssessmentReport)
        self.assertEqual(report.solar_context.solar_phase, SolarPhase.NIGHT_LATE.value)
        self.assertTrue(report.solar_context.is_dark)
        self.assertEqual(report.timezone, "Asia/Kolkata (IST: UTC+5:30)")

        # 3. Scores updated based on nocturnal lighting
        self.assertIsNotNone(alt.safety_score)
        self.assertGreaterEqual(alt.safety_score, 15.0)
        self.assertLessEqual(alt.safety_score, 95.0)
        self.assertIsNotNone(alt.confidence_score)
        self.assertGreaterEqual(alt.confidence_score, 10.0)


if __name__ == "__main__":
    unittest.main()
