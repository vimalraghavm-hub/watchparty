# Two-Device Manual Testing Checklist

## Test Environment Setup
- **Device A**: Laptop (Chrome / Edge / Firefox)
- **Device B**: Tablet (iPad Safari / Android Tablet Chrome)
- **Connections**: Two separate internet connections (e.g. Home Wi-Fi + Mobile Hotspot)

| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 1 | **Create Room (Host)** | Click "Create Private Room", enter title, submit. | Redirected to `/room/:token`, waiting screen displayed. | Verified |
| 2 | **Copy & Join (Guest)** | Copy invitation link from Host screen, open on Tablet browser. | Guest joins room, participant list shows 2/2 connected. | Verified |
| 3 | **Local File Selection** | Host and Guest both pick matching MP4 movie file locally. | SHA-256 hash verified, "Movie Files Match Perfectly!" badge shown. | Verified |
| 4 | **Synchronized Play** | Host clicks Play button on video player. | Both Laptop and Tablet start video playback simultaneously. | Verified |
| 5 | **Synchronized Seek** | Guest drags timeline slider to 10:00. | Both players perform debounced seek to 10:00. | Verified |
| 6 | **Micro-Drift Correction** | Simulate minor network delay on one device. | Sync engine adjusts rate (0.95x–1.05x) and reconciles timing. | Verified |
| 7 | **WebRTC Video Call** | Click "Start Call", grant camera/mic permissions. | P2P call connects, local & remote video previews display. | Verified |
| 8 | **Mic & Camera Toggles** | Toggle Mute and Camera Off independently during call. | Track state updates without breaking call or movie playback. | Verified |
| 9 | **Real-Time Chat & Emojis** | Type message and send quick emoji reactions. | Message appears immediately on both devices with sanitized text. | Verified |
| 10 | **Tablet Touch & Rotation** | Rotate tablet between portrait and landscape modes. | Controls adjust responsively, touch targets remain >= 44px. | Verified |
| 11 | **Cloud Upload / Download** | Host uploads <500MB movie to private storage; Guest downloads. | Download progress bar reaches 100%, file loaded locally. | Verified |
| 12 | **Security & Revocation** | Host clicks "Revoke Invitation & Close Room". | Room status becomes inactive, third-party joins rejected. | Verified |
