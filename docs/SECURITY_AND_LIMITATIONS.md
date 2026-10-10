# Security Architecture & Free-Tier Limitations

## 1. Security Architecture

### Cryptographic Bearer Tokens
- Every private room generates a 48-character hexadecimal token using `window.crypto.getRandomValues()`.
- Tokens are bearer credentials valid for 7 days (configurable).
- Tokens are removed from the browser address bar (`window.history.replaceState`) after room validation to avoid leaking credentials in analytics, server access logs, or screenshots.

### Authorization & Access Control
- Server-side validation checks token validity, expiration, revocation status, and maximum 2-participant room limits.
- Supabase Row Level Security (RLS) policies enforce room-scoped access for messages, room media metadata, and member status.
- Storage RLS policies ensure private bucket access (`room-movies` bucket is strictly non-public).

### Input Sanitization & Content Security
- All user-submitted chat messages and room titles are HTML-entity sanitized (`sanitizeText()`) before rendering to prevent Cross-Site Scripting (XSS).
- Camera/Microphone media streams are strictly transmitted P2P over WebRTC; media frames are never sent through Supabase Realtime or application servers.

## 2. Free-Tier Limitations & Operational Cost Guidelines

### Storage Bucket Limits
- **Quota Limit**: Default 500 MB maximum per file upload on Supabase free tier.
- **Local Fallback**: For movie files exceeding 500 MB (e.g. 2 GB - 10 GB 1080p/4K movie files), both participants select their local copy directly via the local file picker. The synchronization engine verifies SHA-256 signatures to ensure both users have matching media without transferring gigabytes over cloud storage.

### WebRTC Relay (STUN vs TURN)
- **STUN (Free)**: Uses Google STUN servers (`stun:stun.l.google.com:19302`) for P2P connection establishment across standard NATs.
- **TURN Relay**: Symmetric NATs (e.g., certain strict cellular networks or enterprise firewalls) require a TURN relay server. Free-tier TURN relay services (such as Coturn self-hosted or Twilio Network Traversal free tier) should be configured in `.env` (`VITE_TURN_SERVERS`).

### Realtime Database & Signaling Payloads
- Playback sync signals use compact JSON payloads (< 200 bytes) sent only on events (play, pause, seek) or periodic 500ms sync checks. Movie frames are NEVER transmitted over WebSockets.
