"""Community intelligence service boundary interface with trust-weighting."""

from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session
from ..models.domain import CommunityReport
from ..schemas.community import CommunityReportCreate, CommunityReportResponse

class CommunityService:
    """Service boundary for trust-weighted crowd intelligence."""

    def __init__(self, db: Session):
        self.db = db

    def calculate_effective_trust(
        self,
        reporter_reliability: float,
        confirmation_count: int,
        reported_at: datetime,
    ) -> float:
        """
        Calculates trust weight based on:
        1. Reporter reliability track record (0.1 to 1.0)
        2. Confirmation / corroboration count
        3. Recency time-decay factor
        """
        # Recency decay (half-life principle: older reports have decaying influence)
        if reported_at.tzinfo is None:
            now = datetime.utcnow()
        else:
            now = datetime.now(timezone.utc)
        hours_old = max(0.0, (now - reported_at.replace(tzinfo=None)).total_seconds() / 3600.0)
        recency_factor = max(0.2, 1.0 - (hours_old / (24.0 * 7.0)))  # decays over 7 days to 0.2

        # Confirmation boost
        confirmation_factor = min(1.5, 1.0 + (confirmation_count - 1) * 0.1)

        effective_weight = reporter_reliability * confirmation_factor * recency_factor
        return round(min(1.0, max(0.1, effective_weight)), 2)

    def submit_report(self, report_in: CommunityReportCreate) -> CommunityReportResponse:
        """Submit a new community report."""
        report = CommunityReport(
            category=report_in.category,
            description=report_in.description,
            latitude=report_in.latitude,
            longitude=report_in.longitude,
            reporter_id=report_in.reporter_id or "anon_user",
            reporter_reliability=0.8,
            confirmation_count=1,
            verification_status="UNVERIFIED",
            is_synthetic=True,
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        trust = self.calculate_effective_trust(
            report.reporter_reliability,
            report.confirmation_count,
            report.reported_at,
        )

        return CommunityReportResponse(
            id=report.id,
            category=report.category,
            description=report.description,
            latitude=report.latitude,
            longitude=report.longitude,
            segment_code=report.segment_id and f"SEG-{report.segment_id}",
            reporter_reliability=report.reporter_reliability,
            confirmation_count=report.confirmation_count,
            verification_status=report.verification_status,
            reported_at=report.reported_at,
            effective_trust_weight=trust,
            is_synthetic=True,
        )
