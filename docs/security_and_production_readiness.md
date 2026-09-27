# Phase 17 — Security, Authentication, Privacy & Production Readiness

## 1. Executive Summary & Security Posture

Phase 17 audits, hardens, and verifies the **security, authentication, privacy, and deployment readiness** of Suraksha Path.

Suraksha Path operates on a privacy-by-design, evidence-based paradigm. Unlike conventional navigation services that demand persistent user tracking, Suraksha Path prioritizes commuter anonymity while enforcing strict administrative integrity for crowd-sourced safety intelligence and segment score reassessments.

```
+-----------------------------------------------------------------------------------+
|                        SECURITY & PRIVACY ARCHITECTURE                            |
+-----------------------------------------------------------------------------------+
        |                                   |                                   |
        v                                   v                                   v
+-------------------+             +-------------------+               +-------------------+
| Commuter Privacy  |             |  API & Network    |               | Administrative    |
| & Local Custody   |             |   Protections     |               |   Authentication  |
+-------------------+             +-------------------+               +-------------------+
  - Location sharing OFF by default  - Security Headers (CSP, nosniff)  - Constant-time secret check
  - Zero background telemetry       - Request size limit (1 MB)        - Bearer token / X-Admin-Key
  - Address door-number masking     - Sliding-window rate limiter      - Self-moderation prevention
  - One-click privacy history purge - Sanitized 500 error outputs      - Reporter pseudonym masking
  - LocalStorage data custody       - XSS/HTML tag input sanitization  - Trust-weight manipulation lock
```

---

## 2. Security Audit Findings & Implemented Mitigations

| Area | Observed Risk / Finding | Implemented Mitigation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Admin Authentication** | String comparison (`!=`) was susceptible to timing side-channel attacks on `MODERATOR_KEY`. | Implemented constant-time comparison via `secrets.compare_digest()`. Supported standard `Authorization: Bearer <token>` in addition to `X-Admin-Key`. | Verified by `test_constant_time_moderator_key_verification` & `test_bearer_token_moderation_authorization`. |
| **Self-Moderation** | Community report moderation allowed users to verify their own submissions if possessing the moderator key. | Added strict self-moderation check: `if report.reporter_id == moderator_id: raise PermissionError(...)`. | Verified by `test_self_moderation_prevention`. |
| **API Denial of Service** | Unrestricted payload sizes could allow large payloads to overwhelm server memory. | Added `RequestSizeLimitMiddleware` rejecting payloads $> 1\text{ MB}$ with `413 Payload Too Large`. | Verified by `test_request_size_limit_rejection`. |
| **Endpoint Flooding** | Abuse-prone endpoints (reports, feedback, moderation) lacked rate limiting. | Added thread-safe in-memory sliding-window `RateLimiter` returning `429 Too Many Requests` with `Retry-After` header. | Verified by `test_rate_limiter_logic`. |
| **Input Sanitization & XSS** | Text inputs in community observations and feedback could contain unescaped script or iframe tags. | Implemented `sanitize_user_text()` across Pydantic schemas, stripping dangerous HTML/scripts, event handlers, and null bytes. | Verified by `test_sanitize_user_text` & `test_input_sanitization_in_community_report_submission`. |
| **Unsafe URLs** | User-supplied evidence links could use `javascript:` or `data:` schemes. | Implemented `validate_safe_url()` enforcing `http://` or `https://` protocols strictly. | Verified by `test_validate_safe_url`. |
| **Security Headers** | API responses lacked defensive MIME sniffing, clickjacking, and referrer headers. | Added `SecurityHeadersMiddleware` setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection: 1; mode=block`, `Permissions-Policy`, and map-compatible `Content-Security-Policy`. | Verified by `test_security_headers_middleware`. |
| **Error Information Leaks** | Default exception handler reflected full `request.url` including query strings, potentially leaking sensitive parameters. | Sanitized global exception handler to only log and return `request.url.path`. Suppressed internal stack traces from client JSON responses. | Verified by `test_error_handler_protects_query_parameters`. |
| **Reporter Identity Privacy** | Contributor usernames could be profiled from public observation feeds. | Implemented pseudonymous masking (`che****_42` / `Community Contributor #77`). | Verified by `test_mask_reporter_id`. |
| **Frontend Render Safety** | `MapLegend.jsx` utilized `dangerouslySetInnerHTML` for tile attribution. | Replaced with standard text node rendering, eliminating the only instance of unescaped innerHTML in the application. | Verified by frontend production build and Vitest suite. |

---

## 3. Authentication & Authorisation Model

### 3.1 Commuter Privacy (Unauthenticated Navigation by Design)
- **Principle**: Suraksha Path treats personal commuter travel as sensitive. Safe route planning, time-of-day solar evaluation, route trade-offs, and journey insights do **not** require mandatory account registration or login.
- **Data Custody**: Journey sessions, check-in history, and routing preferences reside in local browser storage (`localStorage`). No GPS breadcrumbs or commuter movement traces are uploaded to a remote user database without explicit consent.

### 3.2 Administrative & Moderation Authentication
- **Protected Actions**:
  - `POST /api/community/reports/{id}/moderate` (Transition status to `VERIFIED`, `REJECTED`, `UNDER_REVIEW`).
  - `POST /api/feedback/{id}/review` (Moderate disputed feedback and trigger segment reassessment).
- **Credential Handling**:
  - Requires `MODERATOR_KEY` transmitted via `Authorization: Bearer <key>` or `X-Admin-Key`.
  - Constant-time validation prevents timing-based credential recovery.
  - Startup check warns if default development key is active in a `production` environment.
- **Anti-Self-Moderation Rule**:
  - A reviewer identifier (`moderator_id`) cannot match the original `reporter_id` of the submission under review. Violations result in `403 Forbidden`.

---

## 4. Input Validation & Defense-in-Depth

### 4.1 Coordinate Bounds Checking
All geospatial inputs are validated strictly against the Chennai Metropolitan Area:
- Latitude: $12.80^\circ\text{ N} \le \text{lat} \le 13.30^\circ\text{ N}$
- Longitude: $80.00^\circ\text{ E} \le \text{lng} \le 80.35^\circ\text{ E}$
- Non-numeric (`NaN`, `Infinity`) or out-of-bounds coordinates are rejected immediately with `422 Unprocessable Entity`.

### 4.2 Cross-Site Scripting (XSS) Neutralization
- `sanitize_user_text()` strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, `<form>`, `<input>`, `<button>`, `<meta>`, `<link>`, `<svg>`, `<math>`, inline event handlers (`onload=`, `onerror=`), and `javascript:` URIs.
- Preserves genuine multilingual descriptions (Tamil, English, Hindi) while escaping HTML brackets.

---

## 5. Network Protections & Security Headers

The backend automatically injects defensive headers on all HTTP responses:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://router.project-osrm.org https://api.open-meteo.com; frame-ancestors 'self';
```

---

## 6. Pre-Deployment Readiness Checklist

Before deploying Suraksha Path to a staging or production server, verify each item:

### 6.1 Server & Environment
- [ ] **HTTPS / TLS**: Terminate TLS at the reverse proxy (Nginx, Caddy, or Cloudflare) with valid certificates.
- [ ] **Production Environment Variables**:
  - `ENVIRONMENT=production`
  - `DEBUG=false`
  - `MODERATOR_KEY=<generate-strong-random-key>` (e.g., `openssl rand -hex 32`)
  - `BACKEND_HOST=0.0.0.0` or internal socket.
- [ ] **CORS Origins**: Restrict `CORS_ORIGINS` to the exact production domain (e.g., `https://surakshapath.chennai.gov.in`).

### 6.2 Database & Data Security
- [ ] **File Permissions**: Restrict read/write permissions on the SQLite data directory (`data/`) to the application user (`chmod 700 data`).
- [ ] **Backups**: Configure periodic snapshots or SQLite WAL mode backups.
- [ ] **No Secrets in Repositories**: Ensure `.env` is absent from git tracking (`.gitignore` verified).

### 6.3 Rate Limiting & Proxy Headers
- [ ] **Reverse Proxy IP Forwarding**: Ensure reverse proxy sets `X-Forwarded-For` correctly so rate limiting keys on genuine client IPs rather than proxy internal IPs.
- [ ] **Request Body Limits**: Reverse proxy (`client_max_body_size 1M;`) aligned with application limit.

### 6.4 Dependency Auditing
- [ ] Frontend: `npm audit` reports **0 vulnerabilities**.
- [ ] Backend: Dependencies pinned in `requirements.txt` with standard secure releases.

---

## 7. Verification & Automated Test Matrix

| Test Suite | File | Tests Run | Result | Coverage Area |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Security** | `backend/tests/test_security_hardening.py` | 13 | **13 / 13 Passed** | Constant-time key verification, self-moderation prevention, rate limiter, security headers, 413 size limits, input sanitization, error query parameter masking. |
| **Frontend Security** | `frontend/src/tests/security.test.js` | 6 | **6 / 6 Passed** | Location sharing default OFF, localStorage complete privacy purge, address masking, corrupted JSON resilience, XSS avoidance. |
| **Full Backend Suite** | `backend/tests/` | 124 | **124 / 124 Passed** | All 124 unit and integration tests passing without regressions. |
| **Full Frontend Suite**| `frontend/src/tests/` | 87 | **87 / 87 Passed** | All 87 unit and integration tests passing without regressions. |
| **Production Build** | `frontend/` (`npm run build`) | 1 | **Clean Build (0 errors)** | Vite production bundle created in 371ms. |

**Total Automated Tests**: **211 / 211 Passed (100%)**.
