"""Trust-Weighted Community Intelligence and Report Verification Service (Phase 9).

Implements calibrated community observation ingestion, recency decay,
independent confirmation tallies, dispute handling, duplicate detection,
moderation boundaries, and dynamic road-segment reassessment.
"""

import math
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import text

from ..models.domain import CommunityReport, ReportInteraction, RoadSegment, EvidenceItem
from ..schemas.community import (
    CommunityReportCreate,
    CommunityReportResponse,
    ReportInteractionCreate,
    ReportModerationAction,
)
from ..config import settings
from .road_network_service import RoadNetworkService
from .risk_service import RiskService

logger = logging.getLogger(__name__)

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

# Controlled category configuration with empirical urban transport safety heuristics
COMMUNITY_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "POOR_LIGHTING": {
        "label": "Poor or Broken Street Lighting",
        "base_impact": -6.0,
        "half_life_hours": 72.0,  # 3 days
        "validity_hours": 168.0,  # 7 days max
        "evidence_category": "LIGHTING",
        "description": "Non-functional, broken, or heavily flickering luminaires resulting in pitch dark roadway stretch.",
    },
    "DESERTED_STRETCH": {
        "label": "Deserted or Isolated Roadway",
        "base_impact": -8.0,
        "half_life_hours": 24.0,  # 1 day
        "validity_hours": 72.0,
        "evidence_category": "COMMUNITY_REPORT",
        "description": "Noticeable absence of pedestrian footfall, open commercial storefronts, or nocturnal activity.",
    },
    "OBSTRUCTED_FOOTPATH": {
        "label": "Obstructed or Missing Footpath",
        "base_impact": -4.0,
        "half_life_hours": 48.0,
        "validity_hours": 168.0,
        "evidence_category": "PEDESTRIAN_INFRASTRUCTURE",
        "description": "Footpath completely blocked by construction debris, illegal parking, or open trenches.",
    },
    "ISOLATED_UNDERPASS": {
        "label": "Isolated Underpass / Blindspot",
        "base_impact": -10.0,
        "half_life_hours": 48.0,
        "validity_hours": 168.0,
        "evidence_category": "COMMUNITY_REPORT",
        "description": "Pedestrian blindspot beneath flyover or rail underbridge with restricted visibility.",
    },
    "SUSPICIOUS_LOITERING": {
        "label": "Threatening Loitering / Harassment Observed",
        "base_impact": -7.0,
        "half_life_hours": 12.0,  # Rapid decay
        "validity_hours": 48.0,
        "evidence_category": "COMMUNITY_REPORT",
        "description": "Groups aggressively loitering or reported catcalling/harassment incidents.",
    },
    "ROAD_HAZARD": {
        "label": "Water-logging, Debris, or Construction Obstruction",
        "base_impact": -5.0,
        "half_life_hours": 48.0,
        "validity_hours": 168.0,
        "evidence_category": "ROAD_CHARACTERISTIC",
        "description": "Physical roadway hazards such as monsoon waterlogging or unmarked road dug-outs.",
    },
    "ACTIVE_POLICE_PRESENCE": {
        "label": "Active Police Patrol / Sighting",
        "base_impact": 7.0,
        "half_life_hours": 24.0,
        "validity_hours": 48.0,
        "evidence_category": "POLICE_PRESENCE",
        "description": "Stationary police vehicle, manned beat patrol booth, or checkpoint actively deployed.",
    },
    "HIGH_PEDESTRIAN_FOOTFALL": {
        "label": "Active Nocturnal Commercial Footfall",
        "base_impact": 5.0,
        "half_life_hours": 24.0,
        "validity_hours": 48.0,
        "evidence_category": "COMMUNITY_REPORT",
        "description": "Active nighttime storefronts, tea stalls, and steady transit commuter movement.",
    },
    "INFRASTRUCTURE_DAMAGE": {
        "label": "Damaged Roadway Infrastructure",
        "base_impact": -6.0,
        "half_life_hours": 168.0,  # 7 days
        "validity_hours": 720.0,  # 30 days
        "evidence_category": "ROAD_CHARACTERISTIC",
        "description": "Broken guardrails, missing manhole covers, or cave-in along the roadway.",
    },
}

# Status verification weights (V)
STATUS_MULTIPLIERS: Dict[str, float] = {
    "VERIFIED": 1.25,
    "SUBMITTED": 0.85,
    "UNDER_REVIEW": 0.50,
    "DISPUTED": 0.20,
    "REJECTED": 0.0,
    "EXPIRED": 0.0,
}

class CommunityService:
    """Service handling trust-weighted community reporting and dynamic reassessment."""

    def __init__(self, db: Session):
        self.db = db
        self.road_service = RoadNetworkService(db)
        self.risk_service = RiskService(db)

    @staticmethod
    def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculates distance between two coordinate pairs in meters."""
        r = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)
        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    def get_categories(self) -> List[Dict[str, Any]]:
        """Returns the list of supported controlled categories with metadata."""
        return [
            {
                "category": key,
                "label": cfg["label"],
                "base_impact": cfg["base_impact"],
                "half_life_hours": cfg["half_life_hours"],
                "validity_hours": cfg["validity_hours"],
                "evidence_category": cfg["evidence_category"],
                "description": cfg["description"],
            }
            for key, cfg in COMMUNITY_CATEGORIES.items()
        ]

    def calculate_trust_weight(
        self,
        report: CommunityReport,
        as_of_time: Optional[datetime] = None,
    ) -> Tuple[float, float, Dict[str, Any]]:
        """
        Calculates the calibrated Trust Weight (W) and Signed Safety Impact:
        W = round(R * C * T * V * D, 3) clamped to [0.0, 1.0]
        Impact = round(base_impact * W, 2)
        """
        now = as_of_time or utc_now()
        cat_cfg = COMMUNITY_CATEGORIES.get(report.category, {
            "label": report.category,
            "base_impact": -5.0,
            "half_life_hours": 48.0,
            "validity_hours": 168.0,
            "evidence_category": "COMMUNITY_REPORT",
        })

        # 1. Verification status multiplier (V)
        status = report.verification_status or "SUBMITTED"
        v_mult = STATUS_MULTIPLIERS.get(status, 0.85)

        # 2. Recency Time-Decay (T)
        obs_time = report.observed_at or report.reported_at or now
        if obs_time.tzinfo is None:
            obs_time = obs_time.replace(tzinfo=timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        delta_seconds = max(0.0, (now - obs_time).total_seconds())
        hours_old = delta_seconds / 3600.0

        validity_hours = cat_cfg.get("validity_hours", 168.0)
        half_life = cat_cfg.get("half_life_hours", 48.0)

        is_expired = hours_old > validity_hours
        if is_expired and status not in ("REJECTED", "EXPIRED"):
            report.verification_status = "EXPIRED"
            status = "EXPIRED"
            v_mult = 0.0

        if status in ("REJECTED", "EXPIRED"):
            t_decay = 0.0
        else:
            t_decay = 0.5 ** (hours_old / half_life)
            t_decay = max(0.05, min(1.0, t_decay))

        # 3. Independent Corroboration Tally (C)
        # Each distinct confirming user adds 15% confidence, capped at 1.50 (+60%)
        confirmations = report.confirmation_count or 0
        c_factor = min(1.5, 1.0 + 0.15 * min(confirmations, 4))

        # 4. Dispute Penalty (D)
        disputes = report.dispute_count or 0
        if disputes > 0:
            d_factor = max(0.1, 1.0 - 0.35 * disputes)
        else:
            d_factor = 1.0

        # Auto-shift to DISPUTED if disputes outpace confirmations by >= 2
        if disputes >= confirmations + 2 and status in ("SUBMITTED", "UNDER_REVIEW"):
            report.verification_status = "DISPUTED"
            status = "DISPUTED"
            v_mult = STATUS_MULTIPLIERS["DISPUTED"]

        # 5. Reporter Reliability (R)
        r_rel = report.reporter_reliability or 0.75
        r_rel = max(0.2, min(1.0, r_rel))

        # 6. Composite Trust Weight (W)
        if status in ("REJECTED", "EXPIRED"):
            w = 0.0
        else:
            raw_w = r_rel * c_factor * t_decay * v_mult * d_factor
            w = round(max(0.0, min(1.0, raw_w)), 3)

        # 7. Signed Safety Impact
        base_impact = cat_cfg.get("base_impact", -5.0)
        impact = round(base_impact * w, 2)
        # Bounded between -10.0 and +8.0
        impact = max(-10.0, min(8.0, impact))

        explanation = {
            "summary": (
                f"Report contributes {impact:+0.1f} points to segment assessment based on {status} status "
                f"and {confirmations} independent corroborations."
            ),
            "factors": {
                "reporter_reliability": round(r_rel, 2),
                "corroboration_factor": round(c_factor, 2),
                "confirmations_count": confirmations,
                "disputes_count": disputes,
                "flags_count": report.flag_count or 0,
                "recency_decay": round(t_decay, 3),
                "hours_since_observation": round(hours_old, 1),
                "verification_multiplier": v_mult,
                "dispute_penalty": round(d_factor, 2),
                "effective_trust_weight": w,
            },
            "status": status,
            "segment_associated": report.segment_code or "UNASSOCIATED",
            "is_expired": status == "EXPIRED",
            "caution_note": (
                "Community observations are trust-weighted heuristics and do not represent "
                "empirically verified crime statistics or safety guarantees."
            ),
        }

        return w, impact, explanation

    def check_duplicate_report(
        self,
        category: str,
        lat: float,
        lng: float,
        radius_meters: float = 120.0,
        time_window_hours: float = 24.0,
    ) -> Optional[CommunityReport]:
        """
        Checks if an active report of the same category exists nearby within the time window.
        Prevents redundant duplicates and provides a target for corroboration instead.
        """
        since_time = utc_now() - timedelta(hours=time_window_hours)
        candidates = (
            self.db.query(CommunityReport)
            .filter(
                CommunityReport.category == category,
                CommunityReport.is_active == True,
                CommunityReport.verification_status.notin_(["REJECTED", "EXPIRED"]),
                CommunityReport.reported_at >= since_time,
            )
            .all()
        )

        for cand in candidates:
            dist = self.haversine_distance_meters(lat, lng, cand.latitude, cand.longitude)
            if dist <= radius_meters:
                return cand
        return None

    def check_rate_limit(self, user_id: str, limit: int = 5, window_hours: float = 1.0) -> bool:
        """Enforces rate limiting on report submissions to prevent spam bursts."""
        since_time = utc_now() - timedelta(hours=window_hours)
        count = (
            self.db.query(CommunityReport)
            .filter(
                CommunityReport.reporter_id == user_id,
                CommunityReport.reported_at >= since_time,
            )
            .count()
        )
        return count < limit

    def check_interaction_rate_limit(self, user_id: str, limit: int = 25, window_hours: float = 1.0) -> bool:
        """Enforces rate limiting on confirmations/disputes."""
        since_time = utc_now() - timedelta(hours=window_hours)
        count = (
            self.db.query(ReportInteraction)
            .filter(
                ReportInteraction.user_id == user_id,
                ReportInteraction.created_at >= since_time,
            )
            .count()
        )
        return count < limit

    def submit_report(
        self,
        data: CommunityReportCreate,
        reporter_id: str = "anon_user",
        is_synthetic: bool = False,
    ) -> CommunityReport:
        """
        Creates a new community safety report, links it to road segment foundation,
        calculates initial trust weighting, creates corresponding EvidenceItem,
        and dynamically triggers segment reassessment.
        """
        if not self.check_rate_limit(reporter_id):
            raise ValueError("Submission rate limit exceeded (maximum 5 reports per hour).")

        category = data.category.upper()
        if category not in COMMUNITY_CATEGORIES:
            raise ValueError(f"Unsupported observation category '{data.category}'. Must be one of: {list(COMMUNITY_CATEGORIES.keys())}")

        # Check for existing duplicate report
        existing_dup = self.check_duplicate_report(category, data.latitude, data.longitude)
        if existing_dup:
            logger.info(f"Potential duplicate observation detected near existing report {existing_dup.report_id}")

        report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
        observed_at = data.observed_at or utc_now()

        # Check road segment association
        segment_code = data.segment_code
        segment_id = None

        if segment_code:
            seg = self.db.query(RoadSegment).filter(RoadSegment.segment_code == segment_code).first()
            if seg:
                segment_id = seg.id
        else:
            # Spatial matching to nearest segment within 120m
            nearby = self.road_service.query_segments_near(data.latitude, data.longitude, radius_meters=120.0, limit=1)
            if nearby:
                seg, dist = nearby[0]
                segment_id = seg.id
                segment_code = seg.segment_code

        # Calculate initial expiry
        cat_cfg = COMMUNITY_CATEGORIES[category]
        validity = cat_cfg.get("validity_hours", 168.0)
        expires_at = observed_at + timedelta(hours=validity)

        report = CommunityReport(
            report_id=report_id,
            segment_id=segment_id,
            segment_code=segment_code,
            category=category,
            title=cat_cfg["label"],
            description=data.description,
            location_name=data.location_name or f"Near {data.latitude:.4f}, {data.longitude:.4f}",
            latitude=data.latitude,
            longitude=data.longitude,
            reporter_id=reporter_id,
            reporter_reliability=0.75,
            confirmation_count=0,
            dispute_count=0,
            flag_count=0,
            verification_status="SUBMITTED",
            observed_at=observed_at,
            reported_at=utc_now(),
            expires_at=expires_at,
            is_active=True,
            is_synthetic=is_synthetic,
        )

        # Calculate weight & impact
        w, impact, _ = self.calculate_trust_weight(report)
        report.effective_trust_weight = w
        report.safety_score_impact = impact

        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        # Synchronize with EvidenceItem and reassess segment
        self._sync_evidence_and_reassess_segment(report)

        return report

    def interact_with_report(
        self,
        report_id: str,
        user_id: str,
        interaction_type: str,
        comments: Optional[str] = None,
    ) -> CommunityReport:
        """
        Records an interaction (CONFIRM, DISPUTE, FLAG) strictly enforcing:
        - At most one active interaction of each permitted type per user per report.
        - Reporter cannot confirm their own report.
        - Triggers recalculation and segment reassessment.
        """
        interaction_type = interaction_type.upper()
        if interaction_type not in ("CONFIRM", "DISPUTE", "FLAG"):
            raise ValueError(f"Invalid interaction type '{interaction_type}'. Must be CONFIRM, DISPUTE, or FLAG.")

        if not self.check_interaction_rate_limit(user_id):
            raise ValueError("Interaction rate limit exceeded. Please wait before submitting more feedback.")

        report = self.db.query(CommunityReport).filter(CommunityReport.report_id == report_id).first()
        if not report:
            raise ValueError(f"Community report with ID '{report_id}' not found.")

        if report.verification_status in ("REJECTED", "EXPIRED"):
            raise ValueError(f"Cannot interact with a report that is currently {report.verification_status}.")

        # Prevent reporter from confirming their own report
        if interaction_type == "CONFIRM" and report.reporter_id == user_id:
            raise ValueError("You cannot confirm your own reported observation.")

        # Check existing interaction
        existing = (
            self.db.query(ReportInteraction)
            .filter(
                ReportInteraction.report_id == report.id,
                ReportInteraction.user_id == user_id,
                ReportInteraction.interaction_type == interaction_type,
            )
            .first()
        )
        if existing:
            raise ValueError(f"You have already submitted a '{interaction_type}' for this report.")

        # Record interaction
        interaction = ReportInteraction(
            report_id=report.id,
            user_id=user_id,
            interaction_type=interaction_type,
            comments=comments,
            created_at=utc_now(),
        )
        self.db.add(interaction)

        # Update tallies
        if interaction_type == "CONFIRM":
            report.confirmation_count = (report.confirmation_count or 0) + 1
        elif interaction_type == "DISPUTE":
            report.dispute_count = (report.dispute_count or 0) + 1
        elif interaction_type == "FLAG":
            report.flag_count = (report.flag_count or 0) + 1
            if report.flag_count >= 3 and report.verification_status != "UNDER_REVIEW":
                report.verification_status = "UNDER_REVIEW"
                report.status_notes = f"Flagged by {report.flag_count} users for moderator review."

        # Recalculate trust weight and impact
        w, impact, _ = self.calculate_trust_weight(report)
        report.effective_trust_weight = w
        report.safety_score_impact = impact

        self.db.commit()
        self.db.refresh(report)

        # Sync evidence and reassess
        self._sync_evidence_and_reassess_segment(report)

        return report

    def moderate_report(
        self,
        report_id: str,
        target_status: str,
        moderator_id: str,
        moderator_key: str,
        notes: Optional[str] = None,
    ) -> CommunityReport:
        """
        Executes an administrative moderation transition (VERIFIED, REJECTED, UNDER_REVIEW).
        Validates moderator authorization key.
        """
        if moderator_key != settings.MODERATOR_KEY:
            raise PermissionError("Invalid moderator authorization credentials.")

        target_status = target_status.upper()
        if target_status not in ("VERIFIED", "REJECTED", "UNDER_REVIEW"):
            raise ValueError(f"Invalid target moderation status '{target_status}'. Must be VERIFIED, REJECTED, or UNDER_REVIEW.")

        report = self.db.query(CommunityReport).filter(CommunityReport.report_id == report_id).first()
        if not report:
            raise ValueError(f"Community report with ID '{report_id}' not found.")

        report.verification_status = target_status
        report.moderated_at = utc_now()
        report.moderated_by = moderator_id
        if notes:
            report.status_notes = notes

        if target_status == "REJECTED":
            report.is_active = False

        w, impact, _ = self.calculate_trust_weight(report)
        report.effective_trust_weight = w
        report.safety_score_impact = impact

        self.db.commit()
        self.db.refresh(report)

        self._sync_evidence_and_reassess_segment(report)

        return report

    def _sync_evidence_and_reassess_segment(self, report: CommunityReport) -> None:
        """
        Bridges the community report to the Phase 8 evidence store and triggers
        deterministic reassessment of the affected road segment.
        """
        if not report.segment_code:
            return

        evidence_code = f"EVD-{report.report_id}"
        evd = self.db.query(EvidenceItem).filter(EvidenceItem.evidence_id == evidence_code).first()

        cat_cfg = COMMUNITY_CATEGORIES.get(report.category, {
            "label": report.category,
            "evidence_category": "COMMUNITY_REPORT",
        })

        if not evd:
            evd = EvidenceItem(
                evidence_id=evidence_code,
                segment_id=report.segment_id,
                segment_code=report.segment_code,
                category=cat_cfg["evidence_category"],
                source_type="COMMUNITY_OBSERVATION",
                source_name="Community Safety Telemetry",
                source_reference=f"Report {report.report_id}",
                factor_name=f"{cat_cfg['label']} ({report.verification_status})",
                impact_score=report.safety_score_impact,
                confidence_weight=report.effective_trust_weight,
                latitude=report.latitude,
                longitude=report.longitude,
                observed_at=report.observed_at,
                ingested_at=utc_now(),
                verification_status=report.verification_status,
                details=report.description,
                is_synthetic=report.is_synthetic,
            )
            self.db.add(evd)
        else:
            evd.impact_score = report.safety_score_impact
            evd.confidence_weight = report.effective_trust_weight
            evd.verification_status = report.verification_status
            evd.factor_name = f"{cat_cfg['label']} ({report.verification_status})"

        self.db.commit()

        # Trigger dynamic segment reassessment via Phase 8 RiskService
        try:
            assessment = self.risk_service.evaluate_segment_safety(report.segment_code)
            seg = self.db.query(RoadSegment).filter(RoadSegment.segment_code == report.segment_code).first()
            if seg:
                seg.current_safety_score = assessment.safety_score if assessment.safety_score is not None else 70.0
                seg.confidence_score = assessment.confidence_score
                seg.assessment_status = assessment.status
                seg.evidence_count = len(assessment.contributing_factors)
                self.db.commit()
                logger.info(f"Segment {report.segment_code} reassessed: score={seg.current_safety_score}, status={seg.assessment_status}")
        except Exception as ex:
            logger.warning(f"Failed to reassess segment {report.segment_code} after report update: {ex}")

    def get_report_by_id(self, report_id: str) -> Optional[CommunityReport]:
        """Retrieves a single community report by its unique ID."""
        return self.db.query(CommunityReport).filter(CommunityReport.report_id == report_id).first()

    def list_reports(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        segment_code: Optional[str] = None,
        is_active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CommunityReport], int]:
        """Queries community reports with optional filtering."""
        q = self.db.query(CommunityReport)

        if category:
            q = q.filter(CommunityReport.category == category.upper())
        if status:
            q = q.filter(CommunityReport.verification_status == status.upper())
        if segment_code:
            q = q.filter(CommunityReport.segment_code == segment_code)
        if is_active is not None:
            q = q.filter(CommunityReport.is_active == is_active)

        total = q.count()
        items = q.order_by(CommunityReport.reported_at.desc()).offset(offset).limit(limit).all()

        # Recalculate freshness and weights dynamically
        now = utc_now()
        for item in items:
            w, impact, _ = self.calculate_trust_weight(item, now)
            item.effective_trust_weight = w
            item.safety_score_impact = impact

        return items, total

    def format_report_response(self, report: CommunityReport) -> CommunityReportResponse:
        """Formats report into privacy-safe response object."""
        cat_cfg = COMMUNITY_CATEGORIES.get(report.category, {"label": report.category})
        _, _, explanation = self.calculate_trust_weight(report)

        # Anonymize reporter ID to protect privacy
        reporter_suffix = report.reporter_id[-4:] if len(report.reporter_id) >= 4 else "USER"
        reporter_display = f"Community Contributor #{reporter_suffix.upper()}"

        return CommunityReportResponse(
            report_id=report.report_id,
            segment_code=report.segment_code,
            category=report.category,
            category_label=cat_cfg.get("label", report.category),
            title=report.title or cat_cfg.get("label", report.category),
            description=report.description,
            location_name=report.location_name,
            latitude=report.latitude,
            longitude=report.longitude,
            reporter_display=reporter_display,
            reporter_reliability=report.reporter_reliability or 0.75,
            confirmation_count=report.confirmation_count or 0,
            dispute_count=report.dispute_count or 0,
            flag_count=report.flag_count or 0,
            verification_status=report.verification_status or "SUBMITTED",
            status_notes=report.status_notes,
            observed_at=report.observed_at or report.reported_at,
            reported_at=report.reported_at,
            expires_at=report.expires_at,
            effective_trust_weight=report.effective_trust_weight,
            safety_score_impact=report.safety_score_impact,
            is_active=report.is_active,
            is_synthetic=report.is_synthetic,
            how_this_contributes=explanation,
        )

    def seed_demo_reports(self) -> int:
        """
        Seeds authentic demonstration observations along key Chennai corridors
        with is_synthetic=True so users can immediately test reporting and verification.
        """
        existing_count = self.db.query(CommunityReport).count()
        if existing_count > 0:
            return 0

        demo_records = [
            {
                "report_id": "REP-DEMO-401",
                "segment_code": "SEG-ANNA-001",
                "category": "POOR_LIGHTING",
                "title": "Poor or Broken Street Lighting",
                "description": "Flickering streetlamps near Thousand Lights mosque underpass stretch. Visibility reduced.",
                "location_name": "Anna Salai near Thousand Lights",
                "latitude": 13.0560,
                "longitude": 80.2530,
                "reporter_id": "user_demo_101",
                "reporter_reliability": 0.85,
                "confirmation_count": 3,
                "dispute_count": 0,
                "flag_count": 0,
                "verification_status": "SUBMITTED",
                "hours_ago": 4,
            },
            {
                "report_id": "REP-DEMO-402",
                "segment_code": "SEG-SPRD-001",
                "category": "ACTIVE_POLICE_PRESENCE",
                "title": "Active Police Patrol / Sighting",
                "description": "Stationary Chennai City Police patrol vehicle with active strobe light near Guindy Metro entrance.",
                "location_name": "Sardar Patel Road near Guindy Metro",
                "latitude": 13.0080,
                "longitude": 80.2140,
                "reporter_id": "user_demo_102",
                "reporter_reliability": 0.92,
                "confirmation_count": 5,
                "dispute_count": 0,
                "flag_count": 0,
                "verification_status": "VERIFIED",
                "hours_ago": 1,
            },
            {
                "report_id": "REP-DEMO-403",
                "segment_code": "SEG-OMR-001",
                "category": "HIGH_PEDESTRIAN_FOOTFALL",
                "title": "Active Nocturnal Commercial Footfall",
                "description": "Active food kiosks and IT park commuters walking towards TIDEL Park bus terminus.",
                "location_name": "OMR near TIDEL Park",
                "latitude": 12.9890,
                "longitude": 80.2490,
                "reporter_id": "user_demo_103",
                "reporter_reliability": 0.80,
                "confirmation_count": 2,
                "dispute_count": 0,
                "flag_count": 0,
                "verification_status": "SUBMITTED",
                "hours_ago": 2,
            },
            {
                "report_id": "REP-DEMO-404",
                "segment_code": "SEG-TNAGAR-001",
                "category": "OBSTRUCTED_FOOTPATH",
                "title": "Obstructed or Missing Footpath",
                "description": "Temporary road construction gravel spilled over pedestrian walkway along South Usman Road.",
                "location_name": "South Usman Road, T. Nagar",
                "latitude": 13.0380,
                "longitude": 80.2330,
                "reporter_id": "user_demo_104",
                "reporter_reliability": 0.78,
                "confirmation_count": 1,
                "dispute_count": 0,
                "flag_count": 0,
                "verification_status": "SUBMITTED",
                "hours_ago": 6,
            },
        ]

        now = utc_now()
        count = 0
        for r_data in demo_records:
            obs_time = now - timedelta(hours=r_data["hours_ago"])
            cat_cfg = COMMUNITY_CATEGORIES[r_data["category"]]
            validity = cat_cfg.get("validity_hours", 168.0)
            expires_at = obs_time + timedelta(hours=validity)

            report = CommunityReport(
                report_id=r_data["report_id"],
                segment_code=r_data["segment_code"],
                category=r_data["category"],
                title=r_data["title"],
                description=r_data["description"],
                location_name=r_data["location_name"],
                latitude=r_data["latitude"],
                longitude=r_data["longitude"],
                reporter_id=r_data["reporter_id"],
                reporter_reliability=r_data["reporter_reliability"],
                confirmation_count=r_data["confirmation_count"],
                dispute_count=r_data["dispute_count"],
                flag_count=r_data["flag_count"],
                verification_status=r_data["verification_status"],
                observed_at=obs_time,
                reported_at=obs_time,
                expires_at=expires_at,
                is_active=True,
                is_synthetic=True,
            )

            # Link segment_id if segment exists
            seg = self.db.query(RoadSegment).filter(RoadSegment.segment_code == r_data["segment_code"]).first()
            if seg:
                report.segment_id = seg.id

            w, impact, _ = self.calculate_trust_weight(report, now)
            report.effective_trust_weight = w
            report.safety_score_impact = impact

            self.db.add(report)
            self.db.commit()
            self.db.refresh(report)

            self._sync_evidence_and_reassess_segment(report)
            count += 1

        logger.info(f"Seeded {count} synthetic demonstration community reports.")
        return count
