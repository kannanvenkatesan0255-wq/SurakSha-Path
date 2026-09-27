"""
Core security, authentication, privacy, and middleware protections for Suraksha Path.

Implements:
1. Constant-time administrative credential verification (mitigates timing attacks).
2. Bearer token and custom header credential extraction.
3. Strict input sanitization and XSS prevention for user-submitted text and URLs.
4. Pseudonymous reporter ID masking.
5. In-memory sliding-window rate limiting to protect abuse-prone endpoints.
6. HTTP security headers middleware (CSP, HSTS-ready, X-Content-Type-Options, etc.).
7. Request entity size limiting middleware (DoS mitigation).
"""

import re
import html
import time
import secrets
import logging
from typing import Optional, Tuple
from collections import defaultdict
from threading import Lock

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from ..config import settings

logger = logging.getLogger("suraksha_path.security")

# Regex to detect malicious script, iframe, embed, object, or inline event handlers
DANGEROUS_HTML_PATTERN = re.compile(
    r"<\s*(script|iframe|object|embed|style|form|input|button|meta|link|svg|math)[^>]*>.*?</\s*\1\s*>|"
    r"<\s*(script|iframe|object|embed|style|form|input|button|meta|link|svg|math)[^>]*>|"
    r"javascript:|vbscript:|data:text/html|on\w+\s*=",
    re.IGNORECASE | re.DOTALL,
)


def verify_moderator_key(provided_key: Optional[str], expected_key: Optional[str]) -> bool:
    """
    Performs constant-time comparison of administrative credentials to prevent timing attacks.
    """
    if not provided_key or not expected_key:
        return False
    return secrets.compare_digest(provided_key.strip(), expected_key.strip())


def extract_admin_key(
    x_admin_key: Optional[str] = None,
    authorization: Optional[str] = None,
) -> Optional[str]:
    """
    Extracts administrative token from either custom X-Admin-Key header
    or standard Authorization: Bearer <token> header.
    """
    if x_admin_key and x_admin_key.strip():
        return x_admin_key.strip()
    if authorization and authorization.strip():
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
    return None


def sanitize_user_text(text: Optional[str], max_length: Optional[int] = None) -> Optional[str]:
    """
    Sanitizes user-supplied free text:
    - Strips dangerous HTML, script tags, event handlers, and control characters.
    - Escapes HTML special characters for defense-in-depth.
    - Enforces optional maximum length bounds.
    """
    if text is None:
        return None
    # Strip null bytes and non-printable control characters (preserving whitespace)
    cleaned = "".join(ch for ch in text if ch in ("\n", "\r", "\t") or ord(ch) >= 32)
    # Strip dangerous HTML and script tags
    cleaned = DANGEROUS_HTML_PATTERN.sub("", cleaned)
    # Escape HTML brackets
    cleaned = html.escape(cleaned, quote=False)
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned.strip()


def validate_safe_url(url: Optional[str]) -> Optional[str]:
    """
    Validates that a user-supplied URL uses safe HTTP/HTTPS protocols
    and contains no script execution patterns.
    """
    if not url:
        return None
    url_clean = url.strip()
    if not (url_clean.startswith("http://") or url_clean.startswith("https://")):
        raise ValueError("Supporting evidence URL must use standard http:// or https:// protocol.")
    if DANGEROUS_HTML_PATTERN.search(url_clean):
        raise ValueError("URL contains dangerous or disallowed script patterns.")
    return url_clean


def mask_reporter_id(reporter_id: Optional[str]) -> str:
    """
    Masks reporter identifier to prevent public identity profiling.
    e.g., 'chennai_commuter_42' -> 'che****_42', 'anon_user' -> 'ano****ser'
    """
    if not reporter_id:
        return "ano****ser"
    rid = str(reporter_id).strip()
    if len(rid) <= 4:
        return rid[:1] + "****" + rid[-1:] if len(rid) > 1 else "****"
    return f"{rid[:3]}****{rid[-3:]}"


class RateLimiter:
    """
    Thread-safe in-memory sliding-window rate limiter.
    Limits requests per client key over a configurable time window (default 60 seconds).
    """

    def __init__(self, requests_per_minute: int = 30, window_seconds: int = 60):
        self.rate_limit = requests_per_minute
        self.window = window_seconds
        self.hits = defaultdict(list)
        self.lock = Lock()

    def is_allowed(self, client_key: str) -> Tuple[bool, int]:
        if not getattr(settings, "ENABLE_RATE_LIMITING", True):
            return True, 0
        now = time.time()
        with self.lock:
            window_start = now - self.window
            recent = [t for t in self.hits[client_key] if t > window_start]
            if len(recent) >= self.rate_limit:
                retry_after = int(recent[0] + self.window - now) + 1
                self.hits[client_key] = recent
                return False, max(1, retry_after)

            recent.append(now)
            self.hits[client_key] = recent

            # Periodic sweep if map gets large
            if len(self.hits) > 5000:
                stale = [k for k, v in self.hits.items() if not v or v[-1] <= window_start]
                for k in stale:
                    del self.hits[k]

            return True, 0

    def reset(self):
        """Clears all tracking history (primarily for automated testing)."""
        with self.lock:
            self.hits.clear()


# Default rate limiter instances for different route sensitivity levels
report_rate_limiter = RateLimiter(requests_per_minute=20, window_seconds=60)
feedback_rate_limiter = RateLimiter(requests_per_minute=20, window_seconds=60)
moderation_rate_limiter = RateLimiter(requests_per_minute=30, window_seconds=60)
routing_rate_limiter = RateLimiter(requests_per_minute=120, window_seconds=60)


def get_client_ip(request: Request) -> str:
    """Extracts client IP address respecting X-Forwarded-For where available."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"


def create_rate_limit_dependency(limiter: RateLimiter):
    """Factory creating a FastAPI dependency that enforces the given rate limiter."""
    def dependency(request: Request):
        client_key = get_client_ip(request)
        allowed, retry_after = limiter.is_allowed(client_key)
        if not allowed:
            logger.warning(f"Rate limit exceeded for client {client_key} on {request.url.path}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {retry_after} seconds before retrying.",
                headers={"Retry-After": str(retry_after)},
            )
        return True
    return dependency


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies defensive HTTP security headers to all responses.
    Configured for compatibility with Leaflet cartography, Google Fonts, OpenStreetMap tiles, and OSRM.
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Defensive MIME and framing protections
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=(), payment=()"

        # Content Security Policy tailored for Suraksha Path map and font resources
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; "
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://router.project-osrm.org https://api.open-meteo.com; "
            "frame-ancestors 'self';"
        )
        response.headers["Content-Security-Policy"] = csp_policy

        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Rejects incoming HTTP requests with bodies exceeding a configured byte size limit.
    Mitigates large payload Denial-of-Service (DoS) attacks. Default: 1 MB.
    """

    def __init__(self, app, max_bytes: int = 1_048_576):  # 1 MB
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_bytes:
                    logger.warning(
                        f"Oversized payload rejected from {get_client_ip(request)}: {content_length} bytes (limit {self.max_bytes})"
                    )
                    return JSONResponse(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE if hasattr(status, "HTTP_413_CONTENT_TOO_LARGE") else 413,
                        content={
                            "error": "Payload Too Large",
                            "message": f"Request body exceeds maximum allowed size of {self.max_bytes // 1024} KB.",
                        },
                    )
            except ValueError:
                pass
        return await call_next(request)
