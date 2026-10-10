# Troubleshooting Guide

## 1. WebRTC Audio & Video Call Issues

### Problem: Peer video or audio cannot connect (`CallStatus: disconnected` or `permission_denied`)
- **Root Cause**: Browser permission blocked or strict symmetric NAT firewall preventing P2P ICE candidate traversal.
- **Solution**:
  1. Verify browser permission bar has allowed Camera and Microphone access.
  2. Test connection over Wi-Fi. If using restricted mobile data networks, ensure TURN relay environment variables (`VITE_TURN_SERVERS`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`) are populated in `.env`.
  3. Click **End Call** and then **Start Call** to restart WebRTC negotiation.

## 2. Playback & Autoplay Restrictions

### Problem: Video pauses automatically or shows "Tap to Resume Playback" overlay
- **Root Cause**: Mobile/Tablet browsers (iOS Safari, Android Chrome) block unmuted programmatic video playback without explicit user interaction.
- **Solution**:
  - Click the **Tap to Resume Playback** button rendered on top of the player to grant user gesture approval to the HTML5 video element.

## 3. Movie File Upload & Download Issues

### Problem: Upload fails or displays "File size exceeds private storage quota"
- **Root Cause**: Free-tier storage bucket size cap (500 MB).
- **Solution**:
  - Select the local movie file directly on both laptop and tablet using the **Select Local Movie File** picker. Synchronized watching works locally without cloud upload!

## 4. Playback Synchronization Drift

### Problem: Video playback is slightly off by 1–2 seconds
- **Root Cause**: Browser frame decoding delays or network latency jitter.
- **Solution**:
  - WatchTogether automatically applies gradual micro-drift rate adjustments (0.9x to 1.1x speed) for small timing differences (< 1.5s).
  - For larger drift, click the **Force Re-sync with Host** button on the video player control bar.
