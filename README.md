# WatchTogether — Private Synchronized Movie Room

WatchTogether is a responsive, dark-themed web application enabling two authorized participants to watch movies together in sync, communicate via WebRTC audio/video call, and chat in real time across laptop and tablet browsers.

---

## 1. Architectural Workflows & Key Concepts

Understanding how WatchTogether manages video playback and WebRTC calls:

1. **Uploading a Movie to Private Storage**:
   - The room owner can upload an MP4/WebM movie (< 500 MB free quota limit) to a private Supabase Storage bucket (`room-movies`).
   - Movie bytes are uploaded using authenticated permissions; raw movie files are **never** made public.

2. **Downloading a Movie to Each Device**:
   - Participant 2 generates a short-lived signed download URL to download the cloud-stored movie directly to their device.
   - Show progress bar, cancellation, and download completion.

3. **Playing a Local Movie**:
   - Movie playback uses HTML5 `<video>` powered by local `Blob` / `ObjectURL` references (`URL.createObjectURL(file)`).
   - Movie frames are played locally on your device's GPU/CPU. **Movie bytes are never continuously streamed through application servers.**

4. **Synchronizing Movie Playback**:
   - The **Synchronization Engine** broadcasts compact event-driven commands (PLAY, PAUSE, SEEK) and timestamps through Supabase Realtime channels.
   - Micro-drift (sub-second timing differences) is corrected automatically using browser-supported rate adjustments (0.9x to 1.1x). Hard seeks are triggered only when drift exceeds 1.5 seconds.

5. **Establishing a Separate WebRTC Call**:
   - Camera and microphone media streams are transmitted directly **Peer-to-Peer (P2P)** using standard WebRTC with the **Perfect Negotiation** pattern.
   - Signaling (SDP offers, answers, ICE candidates) is exchanged over Supabase Realtime. Call media is completely independent from movie playback.

---

## 2. Project Technology Stack

- **Frontend**: React 19, TypeScript (Strict Mode), Vite, Tailwind CSS v4, React Router v7, Lucide Icons.
- **Backend Services**: Supabase PostgreSQL (Room metadata & permissions), Supabase Realtime (Signaling, presence & sync commands), Supabase Storage (Private `room-movies` bucket).
- **Audio/Video Calling**: Native WebRTC `RTCPeerConnection` with Perfect Negotiation pattern, STUN, and configurable TURN relay.
- **Testing**: Vitest + Testing Library.

---

## 3. Local Setup Instructions (Windows PowerShell)

### Prerequisites
- Node.js v18+ (Verified on v24.18.0)
- npm v9+

### Step 1: Install Dependencies
Open PowerShell in the project directory (`d:\watchparty`):
```powershell
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Open `.env` and fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
VITE_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
```
*Note: If Supabase credentials are left as placeholders, WatchTogether automatically runs in local dev mode using an internal local broadcast hub for testing!*

### Step 3: Run Unit & Integration Tests
```powershell
npm test
```

### Step 4: Run Type Check & Linting
```powershell
npm run lint
```

### Step 5: Start Local Development Server
```powershell
npm run dev
```
Open your browser at `http://localhost:5173`.

### Step 6: Build for Production
```powershell
npm run build
```

---

## 4. Supabase Database & Storage Setup

1. Log into [Supabase Console](https://supabase.com) and create a new project.
2. Open the **SQL Editor** in Supabase Console.
3. Copy and run the contents of [`supabase/migrations/20261010000000_initial_schema.sql`](file:///d:/watchparty/supabase/migrations/20261010000000_initial_schema.sql).
   This script automatically creates:
   - `rooms`, `room_members`, `invitations`, `room_media`, `chat_messages` tables.
   - Row Level Security (RLS) policies for private room access.
   - Storage bucket `room-movies` (private, 500MB size limit).
4. Copy your **Project URL** and **Anon API Key** from **Project Settings -> API** into `.env`.

---

## 5. Deployment Instructions (Cloudflare Pages or Vercel)

### Cloudflare Pages (Free Tier)
1. Push your repository to GitHub.
2. Go to Cloudflare Dashboard -> **Workers & Pages** -> **Create Application** -> **Pages**.
3. Connect your GitHub repository.
4. Set Build Settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Add Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STUN_SERVERS`).
6. Click **Save and Deploy**.

---

## 6. Project Structure

```
watchparty/
├── .env.example                      # Environment variable template
├── supabase/
│   └── migrations/
│       └── 20261010000000_initial_schema.sql  # SQL Schema & RLS policies
├── docs/
│   ├── SECURITY_AND_LIMITATIONS.md   # Security architecture & free-tier limits
│   ├── TROUBLESHOOTING.md            # WebRTC, upload & sync troubleshooting
│   └── MANUAL_TESTING_CHECKLIST.md   # 12-step manual testing guide
├── src/
│   ├── components/                   # UI Components (Navbar, VideoPlayer, Chat, etc.)
│   ├── hooks/                        # Custom hooks (useWatchRoom)
│   ├── lib/                          # Sync Engine, WebRTC, Security & Supabase client
│   ├── pages/                        # Landing, CreateRoom, WatchRoom & Expired pages
│   ├── test/                         # Vitest unit test suites
│   ├── types/                        # TypeScript interfaces & types
│   ├── App.tsx                       # Main Router component
│   └── index.css                     # Tailwind CSS & custom dark aesthetic
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 7. Documentation Links

- [Security & Free-Tier Limitations](file:///d:/watchparty/docs/SECURITY_AND_LIMITATIONS.md)
- [Troubleshooting Guide](file:///d:/watchparty/docs/TROUBLESHOOTING.md)
- [Manual Testing Checklist](file:///d:/watchparty/docs/MANUAL_TESTING_CHECKLIST.md)
