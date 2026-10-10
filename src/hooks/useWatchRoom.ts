import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured, localHub, validateInvitationToken } from '../lib/supabase';
import { getOrCreateGuestId, getOrCreateGuestName } from '../lib/security';
import { applyCommandToState, isCommandValidAndNew } from '../lib/syncEngine';
import type {
  Room,
  Participant,
  PlaybackState,
  PlaybackCommandPayload,
  ChatMessage,
  WebRTCSignalingMessage,
  SyncStatus,
  RoomMedia,
} from '../types';

export function useWatchRoom(invitationOrRoomToken?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    roomId: '',
    mediaId: null,
    isPlaying: false,
    basePositionSeconds: 0,
    updatedAtServerTime: Date.now(),
    playbackRate: 1.0,
    revision: 0,
    lastCommandId: '',
    controllerId: '',
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('waiting_for_file');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roomMedia, setRoomMedia] = useState<RoomMedia | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

  // Local media state
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const [localFileHash, setLocalFileHash] = useState<string | null>(null);

  // WebRTC signaling handler reference
  const onWebRTCSignalRef = useRef<((msg: WebRTCSignalingMessage) => void) | null>(null);

  const userId = getOrCreateGuestId();
  const userName = getOrCreateGuestName();

  // Initialize Room & Authorization with Session Persistence
  useEffect(() => {
    let isMounted = true;

    async function initRoom() {
      if (!invitationOrRoomToken) {
        setIsLoading(false);
        setError('No invitation token or room ID provided.');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Check session storage first for saved token mapping (if raw token was removed from address bar on F5 refresh)
      let activeToken = invitationOrRoomToken;
      const savedSession = sessionStorage.getItem(`watchtogether_room_session_${invitationOrRoomToken}`);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.token) activeToken = parsed.token;
        } catch {
          // ignore parse error
        }
      }

      const valResult = await validateInvitationToken(activeToken);

      if (!isMounted) return;

      if (!valResult.valid || !valResult.room) {
        setIsLoading(false);
        setError(valResult.reason || 'Failed to join room.');
        return;
      }

      const currentRoom = valResult.room;
      setRoom(currentRoom);

      // Save session in sessionStorage so page refreshes retain access even when raw token is removed from address bar
      sessionStorage.setItem(
        `watchtogether_room_session_${currentRoom.id.substring(0, 8)}`,
        JSON.stringify({ roomId: currentRoom.id, token: activeToken, joinedAt: Date.now() })
      );
      sessionStorage.setItem(
        `watchtogether_room_session_${activeToken}`,
        JSON.stringify({ roomId: currentRoom.id, token: activeToken, joinedAt: Date.now() })
      );

      const userIsHost = currentRoom.created_by === userId;
      setIsHost(userIsHost);

      const selfParticipant: Participant = {
        id: userId,
        name: userName,
        role: userIsHost ? 'host' : 'guest',
        joinedAt: new Date().toISOString(),
        isOnline: true,
        isMediaReady: false,
      };

      setCurrentUser(selfParticipant);
      setPlaybackState((prev) => ({ ...prev, roomId: currentRoom.id }));

      // Register / update room member in DB if Supabase is active
      if (supabase && isSupabaseConfigured) {
        const { data: existingMembers } = await supabase
          .from('room_members')
          .select('*')
          .eq('room_id', currentRoom.id);

        if (existingMembers) {
          const isAlreadyMember = existingMembers.some((m) => m.user_id === userId);
          if (!isAlreadyMember && existingMembers.length >= currentRoom.max_participants) {
            setIsLoading(false);
            setError('This watch room is full (maximum 2 participants reached).');
            return;
          }

          await supabase.from('room_members').upsert({
            room_id: currentRoom.id,
            user_id: userId,
            user_name: userName,
            role: userIsHost ? 'host' : 'guest',
            is_online: true,
          });

          const { data: updatedMembers } = await supabase
            .from('room_members')
            .select('*')
            .eq('room_id', currentRoom.id);

          if (updatedMembers) {
            setParticipants(
              updatedMembers.map((m) => ({
                id: m.user_id,
                name: m.user_name,
                role: m.role as 'host' | 'guest',
                joinedAt: m.joined_at,
                isOnline: m.is_online,
                isMediaReady: Boolean(m.local_file_hash),
                localFileHash: m.local_file_hash,
                localFileName: m.local_file_name,
              }))
            );
          }
        }

        // Fetch room media
        const { data: mediaData } = await supabase
          .from('room_media')
          .select('*')
          .eq('room_id', currentRoom.id)
          .single();

        if (mediaData) {
          setRoomMedia(mediaData);
        }

        // Fetch recent chat messages
        const { data: chatData } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', currentRoom.id)
          .order('created_at', { ascending: true });

        if (chatData) {
          setChatMessages(chatData);
        }
      } else {
        // Fallback local mock mode
        setParticipants([selfParticipant]);
      }

      setIsLoading(false);
    }

    initRoom();

    return () => {
      isMounted = false;
    };
  }, [invitationOrRoomToken, userId, userName]);

  // Realtime & Local Hub Event Subscriptions
  useEffect(() => {
    if (!room?.id) return;

    const channelName = `room_${room.id}`;

    if (supabase && isSupabaseConfigured) {
      const channel = supabase.channel(channelName, {
        config: { presence: { key: userId } },
      });

      channel
        .on('broadcast', { event: 'sync-command' }, ({ payload }) => {
          const cmd = payload as PlaybackCommandPayload;
          setPlaybackState((prev) => {
            if (isCommandValidAndNew(cmd, prev)) {
              return applyCommandToState(cmd, prev);
            }
            return prev;
          });
        })
        .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
          const signal = payload as WebRTCSignalingMessage;
          if (signal.recipientId && signal.recipientId !== userId) return;
          if (onWebRTCSignalRef.current) {
            onWebRTCSignalRef.current(signal);
          }
        })
        .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
          const msg = payload as ChatMessage;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        })
        .on('broadcast', { event: 'media-updated' }, ({ payload }) => {
          setRoomMedia(payload as RoomMedia);
        })
        .on('broadcast', { event: 'participant-ready' }, ({ payload }) => {
          const { participantId, fileHash, fileName } = payload as { participantId: string; fileHash: string; fileName: string };
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === participantId
                ? { ...p, isMediaReady: true, localFileHash: fileHash, localFileName: fileName }
                : p
            )
          );
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const activeUserIds = new Set(Object.keys(state));
          setParticipants((prev) =>
            prev.map((p) => ({
              ...p,
              isOnline: activeUserIds.has(p.id),
            }))
          );
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              userId,
              userName,
              onlineAt: new Date().toISOString(),
            });
          }
        });

      return () => {
        supabase?.removeChannel(channel);
      };
    } else {
      const unsubscribe = localHub.subscribe(channelName, (event, payload) => {
        if (event === 'sync-command') {
          const cmd = payload as PlaybackCommandPayload;
          setPlaybackState((prev) => {
            if (isCommandValidAndNew(cmd, prev)) {
              return applyCommandToState(cmd, prev);
            }
            return prev;
          });
        } else if (event === 'webrtc-signal') {
          const signal = payload as WebRTCSignalingMessage;
          if (signal.recipientId && signal.recipientId !== userId) return;
          if (onWebRTCSignalRef.current) {
            onWebRTCSignalRef.current(signal);
          }
        } else if (event === 'chat-message') {
          const msg = payload as ChatMessage;
          setChatMessages((prev) => [...prev, msg]);
        } else if (event === 'media-updated') {
          setRoomMedia(payload as RoomMedia);
        } else if (event === 'participant-ready') {
          const { participantId, fileHash, fileName } = payload as { participantId: string; fileHash: string; fileName: string };
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === participantId
                ? { ...p, isMediaReady: true, localFileHash: fileHash, localFileName: fileName }
                : p
            )
          );
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [room?.id, userId, userName]);

  // Broadcast sync command
  const sendSyncCommand = useCallback(
    async (
      type: PlaybackCommandPayload['commandType'],
      targetPosition: number,
      playbackRate = 1.0
    ) => {
      if (!room) return;

      const nextRevision = playbackState.revision + 1;
      const cmdPayload: PlaybackCommandPayload = {
        commandId: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        commandType: type,
        senderId: userId,
        roomId: room.id,
        mediaId: playbackState.mediaId,
        targetPosition,
        playbackRate,
        revision: nextRevision,
        clientTimestamp: Date.now(),
        serverTimestamp: Date.now(),
      };

      setPlaybackState((prev) => applyCommandToState(cmdPayload, prev));

      if (supabase && isSupabaseConfigured) {
        await supabase.channel(`room_${room.id}`).send({
          type: 'broadcast',
          event: 'sync-command',
          payload: cmdPayload,
        });
      } else {
        localHub.broadcast(`room_${room.id}`, 'sync-command', cmdPayload);
      }
    },
    [room, userId, playbackState.mediaId, playbackState.revision]
  );

  // Broadcast WebRTC Signal
  const sendWebRTCSignal = useCallback(
    async (signal: Omit<WebRTCSignalingMessage, 'senderId' | 'roomId' | 'timestamp'>) => {
      if (!room) return;

      const fullSignal: WebRTCSignalingMessage = {
        ...signal,
        senderId: userId,
        roomId: room.id,
        timestamp: Date.now(),
      };

      if (supabase && isSupabaseConfigured) {
        await supabase.channel(`room_${room.id}`).send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: fullSignal,
        });
      } else {
        localHub.broadcast(`room_${room.id}`, 'webrtc-signal', fullSignal);
      }
    },
    [room, userId]
  );

  // Broadcast Chat Message
  const sendChatMessage = useCallback(
    async (content: string) => {
      if (!room || !content.trim()) return;

      const chatMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        room_id: room.id,
        sender_id: userId,
        sender_name: userName,
        sender_role: isHost ? 'host' : 'guest',
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, chatMsg]);

      try {
        if (supabase && isSupabaseConfigured) {
          await supabase.from('chat_messages').insert(chatMsg);
          await supabase.channel(`room_${room.id}`).send({
            type: 'broadcast',
            event: 'chat-message',
            payload: chatMsg,
          });
        } else {
          localHub.broadcast(`room_${room.id}`, 'chat-message', chatMsg);
        }
      } catch (err) {
        console.warn('Chat broadcast error (non-fatal):', err);
      }
    },
    [room, userId, userName, isHost]
  );

  // Set local movie & calculate hash
  const setLocalMovie = useCallback(
    async (file: File, fileHash: string) => {
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }

      const objUrl = URL.createObjectURL(file);
      setLocalFile(file);
      setLocalObjectUrl(objUrl);
      setLocalFileHash(fileHash);

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === userId
            ? { ...p, isMediaReady: true, localFileHash: fileHash, localFileName: file.name }
            : p
        )
      );

      if (room) {
        const payload = {
          participantId: userId,
          fileHash,
          fileName: file.name,
        };

        if (supabase && isSupabaseConfigured) {
          await supabase.from('room_members').update({
            local_file_hash: fileHash,
            local_file_name: file.name,
          }).eq('room_id', room.id).eq('user_id', userId);

          await supabase.channel(`room_${room.id}`).send({
            type: 'broadcast',
            event: 'participant-ready',
            payload,
          });
        } else {
          localHub.broadcast(`room_${room.id}`, 'participant-ready', payload);
        }
      }
    },
    [localObjectUrl, room, userId]
  );

  // Revoke room invitation / Close room (host only)
  const revokeRoom = useCallback(async () => {
    if (!room || !isHost) return;

    if (supabase && isSupabaseConfigured) {
      await supabase.from('rooms').update({ is_active: false }).eq('id', room.id);
      await supabase.from('invitations').update({ is_revoked: true }).eq('room_id', room.id);
    }
    setRoom((prev) => (prev ? { ...prev, is_active: false } : null));
  }, [room, isHost]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [localObjectUrl]);

  return {
    room,
    participants,
    currentUser,
    isHost,
    isLoading,
    error,
    playbackState,
    syncStatus,
    setSyncStatus,
    chatMessages,
    roomMedia,
    localFile,
    localObjectUrl,
    localFileHash,
    setLocalMovie,
    sendSyncCommand,
    sendWebRTCSignal,
    sendChatMessage,
    onWebRTCSignalRef,
    revokeRoom,
  };
}
