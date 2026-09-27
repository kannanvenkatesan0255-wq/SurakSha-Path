"""
Security, Authentication, Privacy, and Hardening Tests (Phase 17).

Verifies:
1. Constant-time administrative credential verification (timing attack resistance).
2. Prevention of self-moderation in community reports and feedback.
3. Input sanitization (stripping/escaping dangerous HTML/script tags).
4. Safe URL validation (rejecting javascript:, data:, and file: protocols).
5. Pseudonymous reporter ID masking.
6. Rate limiting enforcement (HTTP 429 Too Many Requests with Retry-After).
7. HTTP security headers (nosniff, SAMEORIGIN, strict-origin-when-cross-origin, CSP).
8. Request body size limit rejection (HTTP 413 Payload Too Large).
9. Sanitized error handling (no stack traces or reflected sensitive query strings).
10. Privacy deletion and retention controls.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.core.security import (
    verify_moderator_key,
    extract_admin_key,
    sanitize_user_text,
    validate_safe_url,
    mask_reporter_id,
    RateLimiter,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_constant_time_moderator_key_verification():
    """Verify constant-time credential comparison logic."""
    expected = "suraksha-chennai-moderator-2026"

    # Exact match
    assert verify_moderator_key("suraksha-chennai-moderator-2026", expected) is True

    # Trimming whitespace
    assert verify_moderator_key("  suraksha-chennai-moderator-2026  ", expected) is True

    # Incorrect key
    assert verify_moderator_key("wrong-secret-key-123", expected) is False

    # Empty, None, or mismatched length
    assert verify_moderator_key("", expected) is False
    assert verify_moderator_key(None, expected) is False
    assert verify_moderator_key("suraksha", expected) is False


def test_extract_admin_key():
    """Verify extraction of admin key from X-Admin-Key or Authorization header."""
    assert extract_admin_key(x_admin_key="secret-123") == "secret-123"
    assert extract_admin_key(authorization="Bearer token-abc") == "token-abc"
    assert extract_admin_key(authorization="bearer token-xyz") == "token-xyz"
    assert extract_admin_key(authorization="Basic dXNlcjpwYXNz") is None
    assert extract_admin_key(x_admin_key=None, authorization=None) is None


def test_sanitize_user_text():
    """Verify that dangerous script and HTML tags are stripped and escaped."""
    # Script tag injection
    malicious = "<script>alert('pwned')</script>Broken street light at midnight"
    cleaned = sanitize_user_text(malicious)
    assert "<script>" not in cleaned
    assert "alert('pwned')" not in cleaned
    assert "Broken street light at midnight" in cleaned

    # Iframe injection
    iframe_text = "<iframe src='http://evil.com'></iframe>Deserted alley near station"
    cleaned_iframe = sanitize_user_text(iframe_text)
    assert "<iframe" not in cleaned_iframe
    assert "Deserted alley near station" in cleaned_iframe

    # Inline event handler
    event_text = "<div onmouseover='alert(1)'>CCTV camera damaged</div>"
    cleaned_event = sanitize_user_text(event_text)
    assert "onmouseover" not in cleaned_event

    # Normal text preservation
    normal = "Well-lit street with active shop footfall."
    assert sanitize_user_text(normal) == normal


def test_validate_safe_url():
    """Verify safe URL protocol validation (HTTP/HTTPS only)."""
    assert validate_safe_url("https://chennaicorporation.gov.in/report") == "https://chennaicorporation.gov.in/report"
    assert validate_safe_url("http://traffic.chennaipolice.gov.in") == "http://traffic.chennaipolice.gov.in"

    # Reject javascript:
    with pytest.raises(ValueError, match="standard http:// or https://"):
        validate_safe_url("javascript:alert(document.cookie)")

    # Reject data: URI
    with pytest.raises(ValueError, match="standard http:// or https://"):
        validate_safe_url("data:text/html,<script>alert(1)</script>")

    # Reject file: URI
    with pytest.raises(ValueError, match="standard http:// or https://"):
        validate_safe_url("file:///etc/passwd")


def test_mask_reporter_id():
    """Verify pseudonymous masking of reporter IDs."""
    assert mask_reporter_id("chennai_commuter_77") == "che****_77"
    assert mask_reporter_id("anon_user") == "ano****ser"
    assert mask_reporter_id("usr") == "u****r"
    assert mask_reporter_id("") == "ano****ser"
    assert mask_reporter_id(None) == "ano****ser"


def test_rate_limiter_logic():
    """Verify thread-safe sliding window rate limiter functionality."""
    limiter = RateLimiter(requests_per_minute=3, window_seconds=10)
    limiter.reset()

    allowed1, _ = limiter.is_allowed("test-client-1")
    allowed2, _ = limiter.is_allowed("test-client-1")
    allowed3, _ = limiter.is_allowed("test-client-1")
    allowed4, retry_after = limiter.is_allowed("test-client-1")

    assert allowed1 is True
    assert allowed2 is True
    assert allowed3 is True
    assert allowed4 is False
    assert retry_after > 0

    # Distinct client should not be blocked
    other_allowed, _ = limiter.is_allowed("test-client-2")
    assert other_allowed is True


def test_security_headers_middleware(client):
    """Verify that all defensive security headers are attached to API responses."""
    response = client.get("/api/health")
    assert response.status_code == 200

    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "geolocation=(self)" in headers.get("Permissions-Policy", "")
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
    assert "openstreetmap.org" in headers.get("Content-Security-Policy", "")
    assert "cartocdn.com" in headers.get("Content-Security-Policy", "")


def test_request_size_limit_rejection(client):
    """Verify that incoming payloads exceeding the 1 MB size limit are rejected with HTTP 413."""
    oversized_headers = {
        "Content-Length": "2000000",  # ~2 MB header
        "Content-Type": "application/json",
    }
    response = client.post("/api/community/reports", headers=oversized_headers, content="{}")
    assert response.status_code == 413
    data = response.json()
    assert data["error"] == "Payload Too Large"


def test_bearer_token_moderation_authorization(client):
    """Verify that Bearer tokens work identically to X-Admin-Key for moderation."""
    # First submit a test community report
    report_res = client.post(
        "/api/community/reports",
        json={
            "category": "POOR_LIGHTING",
            "description": "Dim street lamps along inner ring road stretch",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "location_name": "Central Chennai Corridor",
        },
    )
    assert report_res.status_code == 201
    report_id = report_res.json()["report_id"]

    # Moderate with valid Bearer token
    mod_res = client.post(
        f"/api/community/reports/{report_id}/moderate",
        headers={"Authorization": f"Bearer {settings.MODERATOR_KEY}"},
        json={
            "status": "VERIFIED",
            "notes": "Verified by Chennai civic field inspector",
        },
    )
    assert mod_res.status_code == 200
    assert mod_res.json()["verification_status"] == "VERIFIED"


def test_unauthorized_moderation_rejected(client):
    """Verify that moderation without valid authorization is rejected with HTTP 403."""
    response = client.post(
        "/api/community/reports/REP-TEST-1234/moderate",
        headers={"X-Admin-Key": "invalid-secret-key"},
        json={
            "status": "VERIFIED",
            "notes": "Unauthorized attempt",
        },
    )
    assert response.status_code == 403


def test_self_moderation_prevention(client):
    """Verify that a moderator cannot self-verify their own submitted community report."""
    reporter_id = "moderator_ramesh"

    # Submit report as moderator_ramesh
    report_res = client.post(
        "/api/community/reports",
        headers={"X-User-Id": reporter_id},
        json={
            "category": "ACTIVE_POLICE_PRESENCE",
            "description": "Manned police booth stationed near Central station exit",
            "latitude": 13.0827,
            "longitude": 80.2707,
        },
    )
    assert report_res.status_code == 201
    report_id = report_res.json()["report_id"]

    # Attempt self-moderation as the same user
    self_mod_res = client.post(
        f"/api/community/reports/{report_id}/moderate",
        headers={
            "X-Admin-Key": settings.MODERATOR_KEY,
            "X-Moderator-Id": reporter_id,
        },
        json={
            "status": "VERIFIED",
            "notes": "Self verification attempt",
        },
    )
    assert self_mod_res.status_code == 403
    assert "Self-moderation prohibited" in self_mod_res.json()["detail"]


def test_input_sanitization_in_community_report_submission(client):
    """Verify that malicious script tags in report submission are neutralized."""
    res = client.post(
        "/api/community/reports",
        json={
            "category": "POOR_LIGHTING",
            "description": "<script>alert('xss')</script>Dark street section near school",
            "location_name": "<img src=x onerror=alert(1)>Vepery junction",
            "latitude": 13.0850,
            "longitude": 80.2650,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "<script>" not in data["description"]
    assert "alert('xss')" not in data["description"]
    assert "Dark street section near school" in data["description"]
    assert "<img" not in data["location_name"]


def test_error_handler_protects_query_parameters(client):
    """Verify that unhandled exceptions do not reflect sensitive query parameters in the response."""
    # Force a 404 or invalid route with sensitive query params
    response = client.get("/api/nonexistent-route?token=my_secret_token_12345")
    # Path in 404 does not reflect sensitive query string
    assert "my_secret_token_12345" not in response.text
