export type UserRole = 'host' | 'guest';

export interface Participant {
  id: string; // Supabase user ID or guest UUID
  name: string;
  role: UserRole;
  joinedAt: string;
  isOnline: boolean;
  isMediaReady: boolean;
  localFileHash?: string;
  localFileName?: string;
  localFileSize?: number;
}

export interface Room {
  id: string;
  title: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
  invitation_token: string;
  invitation_expires_at: string;
  max_participants: number;
  current_media_id?: string | null;
}

export interface RoomInvitation {
  id: string;
  room_id: string;
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  is_revoked: boolean;
  max_uses: number;
  uses_count: number;
}

export interface RoomMedia {
  id: string;
  room_id: string;
  file_name: string;
  file_size: number;
  file_hash?: string;
  mime_type: string;
  storage_path?: string;
  upload_status: 'uploading' | 'completed' | 'failed' | 'none';
  download_url?: string;
  created_at: string;
  created_by: string;
}

// Playback Sync Command Types
export type SyncCommandType =
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'PLAYBACK_RATE_CHANGE'
  | 'MEDIA_READY'
  | 'MEDIA_ERROR'
  | 'BUFFERING'
  | 'RESYNC_REQUEST'
  | 'ROOM_STATE_SNAPSHOT';

export interface PlaybackState {
  roomId: string;
  mediaId: string | null;
  isPlaying: boolean;
  basePositionSeconds: number;
  updatedAtServerTime: number; // ms timestamp
  playbackRate: number;
  revision: number;
  lastCommandId: string;
  controllerId: string;
}

export interface PlaybackCommandPayload {
  commandId: string;
  commandType: SyncCommandType;
  senderId: string;
  roomId: string;
  mediaId?: string | null;
  targetPosition: number;
  playbackRate?: number;
  revision: number;
  clientTimestamp: number;
  serverTimestamp?: number;
  mediaHash?: string;
  mediaFileName?: string;
}

export type SyncStatus = 'synced' | 'correcting' | 'buffering' | 'reconnecting' | 'desynced' | 'waiting_for_file';

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  content: string;
  created_at: string;
  reactions?: Record<string, string[]>; // emoji -> array of user IDs
}

// WebRTC Signaling Types
export type WebRTCSignalType = 'offer' | 'answer' | 'ice-candidate' | 'call-ended' | 'peer-status';

export interface WebRTCSignalingMessage {
  type: WebRTCSignalType;
  senderId: string;
  recipientId?: string;
  roomId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export type CallStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'permission_denied';

export interface MediaDeviceState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  hasAudioPermission: boolean;
  hasVideoPermission: boolean;
}
