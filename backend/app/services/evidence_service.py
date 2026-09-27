"""Evidence service for managing, querying, associating, and evaluating safety evidence."""

import json
import logging
import math
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models.domain import EvidenceItem, RoadSegment
from ..schemas.evidence import (
    EvidenceCreate,
    EvidenceResponse,
    EvidenceFilterParams,
    EvidenceProvenanceReport,
)

logger = logging.getLogger(__name__)

# Category-specific half-life periods (in days)
CATEGORY_HALF_LIFE_DAYS = {
    "INFRASTRUCTURE": 365.0,
    "ROAD_CHARACTERISTIC": 365.0,
    "POLICE_PRESENCE": 180.0,
    "PEDESTRIAN_INFRASTRUCTURE": 180.0,
    "LIGHTING": 90.0,
    "ENVIRONMENTAL": 60.0,
    "INCIDENT": 30.0,
    "COMMUNITY_REPORT": 14.0,
}

DEFAULT_HALF_LIFE_DAYS = 90.0


class EvidenceService:
    """Service boundary for managing, querying, and verifying safety evidence."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def calculate_freshness(
        observed_at: Optional[datetime],
        category: str,
        reference_time: Optional[datetime] = None,
    ) -> Tuple[float, bool, Optional[float]]:
        """
        Calculates the freshness decay factor (0.1 to 1.0) and whether the record is stale.
        Returns:
            (decay_factor, is_stale, days_old)
        """
        if reference_time is None:
            reference_time = datetime.now(timezone.utc)
        elif reference_time.tzinfo is None:
            reference_time = reference_time.replace(tzinfo=timezone.utc)

        if observed_at is None:
            # Undated records receive an unknown-recency discount
            return 0.70, False, None

        if observed_at.tzinfo is None:
            obs = observed_at.replace(tzinfo=timezone.utc)
        else:
            obs = observed_at

        diff_seconds = (reference_time - obs).total_seconds()
        days_old = max(0.0, diff_seconds / 86400.0)

        half_life = CATEGORY_HALF_LIFE_DAYS.get(category, DEFAULT_HALF_LIFE_DAYS)

        # Exponential decay: w = 0.5 ^ (days_old / half_life)
        decay = math.pow(0.5, days_old / half_life)
        clamped_decay = max(0.15, min(1.0, decay))

        # Stale threshold: older than 2 half-lives
        is_stale = days_old > (half_life * 2.0)

        return round(clamped_decay, 3), is_stale, round(days_old, 1)

    def associate_evidence_to_segment(
        self,
        item: EvidenceItem,
        tolerance_meters: float = 150.0,
    ) -> Optional[str]:
        """
        Links an evidence item to a RoadSegment in the database.
        Prefers direct segment_code; falls back to spatial proximity within tolerance_meters.
        Returns the matched segment_code, or None if unassociated.
        """
        # 1. Direct segment_code match
        if item.segment_code:
            segment = self.db.query(RoadSegment).filter(RoadSegment.segment_code == item.segment_code).first()
            if segment:
                item.segment_id = segment.id
                return segment.segment_code

        # 2. Spatial proximity fallback if coordinates are present
        if item.latitude is not None and item.longitude is not None:
            from .road_network_service import RoadNetworkService
            network_service = RoadNetworkService(self.db)
            nearby = network_service.query_segments_near(
                lat=item.latitude,
                lng=item.longitude,
                radius_meters=tolerance_meters,
                limit=1,
            )
            if nearby:
                segment, _ = nearby[0]
                item.segment_id = segment.id
                item.segment_code = segment.segment_code
                return segment.segment_code

        return None

    def create_evidence(self, evidence_in: EvidenceCreate) -> EvidenceResponse:
        """Create and persist a single validated evidence record."""
        # Quality check: ensure unique evidence_id
        evd_id = evidence_in.evidence_id or f"EVD-{evidence_in.category[:3]}-{uuid.uuid4().hex[:8].upper()}"
        existing = self.db.query(EvidenceItem).filter(EvidenceItem.evidence_id == evd_id).first()
        if existing:
            raise ValueError(f"Evidence record with ID '{evd_id}' already exists.")

        item = EvidenceItem(
            evidence_id=evd_id,
            category=evidence_in.category,
            source_type=evidence_in.source_type,
            source_name=evidence_in.source_name,
            source_reference=evidence_in.source_reference,
            factor_name=evidence_in.factor_name,
            impact_score=evidence_in.impact_score,
            confidence_weight=evidence_in.confidence_weight,
            latitude=evidence_in.latitude,
            longitude=evidence_in.longitude,
            segment_code=evidence_in.segment_code,
            observed_at=evidence_in.observed_at,
            ingested_at=datetime.now(timezone.utc),
            freshness_timestamp=evidence_in.observed_at or datetime.now(timezone.utc),
            details=evidence_in.details,
            attributes_json=json.dumps(evidence_in.attributes) if evidence_in.attributes else None,
            verification_status=evidence_in.verification_status,
            is_synthetic=evidence_in.is_synthetic,
        )

        # Associate to segment
        matched_code = self.associate_evidence_to_segment(item)
        self.db.add(item)

        # Update segment evidence_count if associated
        if item.segment_id:
            segment = self.db.query(RoadSegment).filter(RoadSegment.id == item.segment_id).first()
            if segment:
                segment.evidence_count = (segment.evidence_count or 0) + 1

        self.db.commit()
        self.db.refresh(item)
        return self._to_response(item)

    def ingest_evidence_dataset(self, dataset_path: str) -> Dict[str, Any]:
        """
        Idempotent bulk ingestion of a safety evidence dataset.
        Validates records, associates segments, skips duplicates, and returns import summary.
        """
        if not os.path.exists(dataset_path):
            raise FileNotFoundError(f"Evidence dataset file not found at: {dataset_path}")

        with open(dataset_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        evidence_list = data.get("evidence_items", [])
        provenance = data.get("provenance", {})

        total_examined = len(evidence_list)
        imported_count = 0
        skipped_duplicates = 0
        rejected_count = 0
        rejection_reasons = []

        existing_ids = {
            row[0] for row in self.db.query(EvidenceItem.evidence_id).all()
        }

        for idx, raw in enumerate(evidence_list):
            evd_id = raw.get("evidence_id")
            if not evd_id:
                evd_id = f"EVD-{raw.get('category', 'GEN')[:3]}-{uuid.uuid4().hex[:8].upper()}"

            if evd_id in existing_ids:
                skipped_duplicates += 1
                continue

            # Quality validation
            category = raw.get("category")
            if not category or category not in CATEGORY_HALF_LIFE_DAYS:
                rejected_count += 1
                rejection_reasons.append(f"Item #{idx}: Invalid or unsupported category '{category}'")
                continue

            lat = raw.get("latitude")
            lng = raw.get("longitude")
            if (lat is not None and lng is None) or (lat is None and lng is not None):
                rejected_count += 1
                rejection_reasons.append(f"Item #{idx} ({evd_id}): Coordinates must include both lat and lng")
                continue

            if lat is not None and not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
                rejected_count += 1
                rejection_reasons.append(f"Item #{idx} ({evd_id}): Coordinates out of bounds ({lat}, {lng})")
                continue

            observed_at = None
            if raw.get("observed_at"):
                try:
                    observed_at = datetime.fromisoformat(raw["observed_at"].replace("Z", "+00:00"))
                except Exception:
                    observed_at = None

            item = EvidenceItem(
                evidence_id=evd_id,
                category=category,
                source_type=raw.get("source_type", "SOURCED_PUBLIC_DATA"),
                source_name=raw.get("source_name", "OpenStreetMap Contributors"),
                source_reference=raw.get("source_reference"),
                factor_name=raw.get("factor_name", "General Safety Indicator"),
                impact_score=float(raw.get("impact_score", 0.0)),
                confidence_weight=float(raw.get("confidence_weight", 0.8)),
                latitude=lat,
                longitude=lng,
                segment_code=raw.get("segment_code"),
                observed_at=observed_at,
                ingested_at=datetime.now(timezone.utc),
                freshness_timestamp=observed_at or datetime.now(timezone.utc),
                details=raw.get("details"),
                attributes_json=json.dumps(raw.get("attributes", {})) if raw.get("attributes") else None,
                verification_status=raw.get("verification_status", "UNVERIFIED"),
                is_synthetic=bool(raw.get("is_synthetic", False)),
            )

            # Associate with road segment
            self.associate_evidence_to_segment(item)
            self.db.add(item)
            existing_ids.add(evd_id)
            imported_count += 1

            if item.segment_id:
                segment = self.db.query(RoadSegment).filter(RoadSegment.id == item.segment_id).first()
                if segment:
                    segment.evidence_count = (segment.evidence_count or 0) + 1

        self.db.commit()

        summary = {
            "dataset_name": provenance.get("dataset_name", "Chennai Safety Evidence"),
            "version": provenance.get("version", "1.0.0"),
            "total_features_examined": total_examined,
            "imported_count": imported_count,
            "skipped_duplicates": skipped_duplicates,
            "rejected_count": rejected_count,
            "rejection_reasons": rejection_reasons,
            "import_timestamp": datetime.now(timezone.utc).isoformat(),
        }
        logger.info(f"Evidence ingestion summary: {summary}")
        return summary

    def get_evidence_by_id(self, evidence_id: str) -> Optional[EvidenceResponse]:
        """Fetch single evidence item by evidence_id."""
        item = self.db.query(EvidenceItem).filter(EvidenceItem.evidence_id == evidence_id).first()
        return self._to_response(item) if item else None

    def query_evidence(self, params: EvidenceFilterParams) -> Dict[str, Any]:
        """Query evidence items with filters and pagination."""
        q = self.db.query(EvidenceItem)

        if params.segment_code:
            q = q.filter(EvidenceItem.segment_code == params.segment_code)
        if params.category:
            q = q.filter(EvidenceItem.category == params.category)
        if params.source_type:
            q = q.filter(EvidenceItem.source_type == params.source_type)
        if params.verification_status:
            q = q.filter(EvidenceItem.verification_status == params.verification_status)
        if params.is_synthetic is not None:
            q = q.filter(EvidenceItem.is_synthetic == params.is_synthetic)

        total_count = q.count()
        items = q.order_by(desc(EvidenceItem.ingested_at)).offset(params.offset).limit(params.limit).all()

        return {
            "total": total_count,
            "limit": params.limit,
            "offset": params.offset,
            "items": [self._to_response(item) for item in items],
        }

    def get_provenance_reports(self) -> List[EvidenceProvenanceReport]:
        """Returns provenance and licensing reports for active evidence datasets."""
        # Query distinct sources
        sources = (
            self.db.query(EvidenceItem.source_name, EvidenceItem.source_type, EvidenceItem.is_synthetic)
            .distinct()
            .all()
        )
        reports = []
        for src_name, src_type, is_synth in sources:
            count = self.db.query(EvidenceItem).filter(EvidenceItem.source_name == src_name).count()
            reports.append(
                EvidenceProvenanceReport(
                    source_name=src_name,
                    source_type=src_type,
                    source_url_or_ref="OpenStreetMap / Government of Tamil Nadu / GCC Municipal Disclosures",
                    geographic_coverage="Chennai Metropolitan Area (CMA)",
                    license_and_attribution="Open Database License (ODbL) 1.0 / Open Government Data (OGD) India",
                    observation_period="2026-06 to 2026-09",
                    update_frequency="Quarterly audits / real-time user contributions",
                    known_limitations=[
                        "Evidence reflects infrastructure audits and verified crowd reports; not a prediction of crime.",
                        "Absence of evidence does not indicate absence of risk.",
                    ],
                    records_count=count,
                    is_synthetic=is_synth,
                )
            )
        return reports

    def _to_response(self, item: EvidenceItem) -> EvidenceResponse:
        decay_factor, is_stale, days_old = self.calculate_freshness(item.observed_at, item.category)
        attrs = {}
        if item.attributes_json:
            try:
                attrs = json.loads(item.attributes_json)
            except Exception:
                attrs = {}

        return EvidenceResponse(
            id=item.id,
            evidence_id=item.evidence_id,
            segment_code=item.segment_code,
            category=item.category,
            source_type=item.source_type,
            source_name=item.source_name,
            source_reference=item.source_reference,
            factor_name=item.factor_name,
            impact_score=item.impact_score,
            confidence_weight=item.confidence_weight,
            latitude=item.latitude,
            longitude=item.longitude,
            observed_at=item.observed_at,
            ingested_at=item.ingested_at or datetime.now(timezone.utc),
            freshness_days=days_old,
            is_stale=is_stale,
            details=item.details,
            attributes=attrs,
            verification_status=item.verification_status,
            is_synthetic=item.is_synthetic,
        )
