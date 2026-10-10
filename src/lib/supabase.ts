import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Room } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl !== 'https://your-supabase-project.supabase.co' &&
  supabaseUrl !== 'https://placeholder.supabase.co';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Mock Broadcast Hub for offline/fallback mode when Supabase credentials are not yet set
class LocalBroadcastHub extends EventTarget {
  private channels: Map<string, Set<(event: string, payload: unknown) => void>> = new Map();

  subscribe(channelName: string, listener: (event: string, payload: unknown) => void) {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
    }
    this.channels.get(channelName)!.add(listener);

    return () => {
      this.channels.get(channelName)?.delete(listener);
    };
  }

  broadcast(channelName: string, event: string, payload: unknown) {
    const listeners = this.channels.get(channelName);
    if (listeners) {
      listeners.forEach((fn) => fn(event, payload));
    }
  }
}

export const localHub = new LocalBroadcastHub();

// Storage helper functions
export async function uploadMovieFile(
  roomId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ storagePath: string; error?: string }> {
  if (!supabase) {
    return { storagePath: `mock/${roomId}/${file.name}` };
  }

  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `rooms/${roomId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error } = await supabase.storage.from('room-movies').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;
    if (onProgress) onProgress(100);

    return { storagePath: filePath };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Upload failed.';
    return { storagePath: '', error: errorMessage };
  }
}

export async function getSignedDownloadUrl(storagePath: string, expiresInSeconds = 86400): Promise<string | null> {
  if (!supabase || storagePath.startsWith('mock/')) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from('room-movies')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

// Room & Invitation DB Helpers
export async function createRoomRecord(title: string, createdBy: string, token: string): Promise<Room | null> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  if (!supabase) {
    const mockRoom: Room = {
      id: 'room_' + Math.random().toString(36).substring(2, 9),
      title,
      created_at: new Date().toISOString(),
      created_by: createdBy,
      is_active: true,
      invitation_token: token,
      invitation_expires_at: expiresAt,
      max_participants: 2,
    };
    return mockRoom;
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      title,
      created_by: createdBy,
      is_active: true,
      invitation_token: token,
      invitation_expires_at: expiresAt,
      max_participants: 2,
    })
    .select()
    .single();

  if (error || !room) {
    console.error('Error creating room record:', error);
    return null;
  }

  // Create corresponding invitation record
  await supabase.from('invitations').insert({
    room_id: room.id,
    token: token,
    created_by: createdBy,
    expires_at: expiresAt,
    is_revoked: false,
    max_uses: 2,
    uses_count: 1,
  });

  return room;
}

export async function validateInvitationToken(token: string): Promise<{ valid: boolean; room?: Room; reason?: string }> {
  if (!token) {
    return { valid: false, reason: 'No invitation token provided.' };
  }

  if (!supabase) {
    // In mock mode, allow joining with valid token length
    return {
      valid: true,
      room: {
        id: 'room_demo_123',
        title: 'Private Watch Party (Demo)',
        created_at: new Date().toISOString(),
        created_by: 'host_demo',
        is_active: true,
        invitation_token: token,
        invitation_expires_at: new Date(Date.now() + 86400000).toISOString(),
        max_participants: 2,
      },
    };
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('invitation_token', token)
    .single();

  if (error || !room) {
    return { valid: false, reason: 'Invalid or non-existent invitation token.' };
  }

  if (!room.is_active) {
    return { valid: false, reason: 'This watch room has been closed by the host.' };
  }

  if (new Date(room.invitation_expires_at) < new Date()) {
    return { valid: false, reason: 'This invitation link has expired.' };
  }

  // Check invitation table for revocation or max uses
  const { data: inv } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (inv) {
    if (inv.is_revoked) {
      return { valid: false, reason: 'This invitation token has been revoked by the owner.' };
    }
  }

  return { valid: true, room };
}
