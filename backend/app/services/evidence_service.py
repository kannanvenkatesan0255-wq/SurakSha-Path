"""Evidence service boundary interface for Suraksha Path."""

from typing import List
from sqlalchemy.orm import Session
from ..models.domain import EvidenceItem
from ..schemas.risk import SegmentEvidenceDetail

class EvidenceService:
    """Service boundary for managing, querying, and verifying safety evidence."""

    def __init__(self, db: Session):
        self.db = db

    def get_segment_evidence(self, segment_id: int) -> List[SegmentEvidenceDetail]:
        """Fetch all evidence items attached to a road segment."""
        items = self.db.query(EvidenceItem).filter(EvidenceItem.segment_id == segment_id).all()
        return [
            SegmentEvidenceDetail(
                factor_name=item.factor_name,
                source_type=item.source_type,
                impact_score=item.impact_score,
                confidence_weight=item.confidence_weight,
                freshness=item.freshness_timestamp.isoformat() if item.freshness_timestamp else "recent",
                details=item.details,
                is_synthetic=item.is_synthetic,
            )
            for item in items
        ]
