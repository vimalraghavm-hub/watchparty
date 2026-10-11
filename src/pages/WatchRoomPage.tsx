import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare, Copy, Check, Users } from 'lucide-react';
import { useWatchRoom } from '../hooks/useWatchRoom';
import { WebRTCManager } from '../lib/webrtc';
import { Navbar } from '../components/Navbar';
import { VideoPlayer } from '../components/VideoPlayer';
import { MovieSelector } from '../components/MovieSelector';
import { RemoteVideoTile } from '../components/RemoteVideoTile';
import { ChatPanel } from '../components/ChatPanel';
import { ExpiredRoomPage } from './ExpiredRoomPage';
import { Modal } from '../components/Modal';
import type { CallStatus, MediaDeviceState } from '../types';

export const WatchRoomPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const {
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
    localObjectUrl,
    isHashingLocalFile,
    hashProgress,
    matchStatus,
    isMatched,
    setLocalMovie,
    sendSyncCommand,
    sendWebRTCSignal,
    sendChatMessage,
    onWebRTCSignalRef,
    revokeRoom,
  } = useWatchRoom(token);

  // WebRTC Call State
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [deviceState, setDeviceState] = useState<MediaDeviceState>({
    audioEnabled: true,
    videoEnabled: false,
    hasAudioPermission: false,
    hasVideoPermission: false,
  });

  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // UI state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  // Remove raw token from visible URL after validation for security
  useEffect(() => {
    if (room && token) {
      window.history.replaceState(null, '', `/room/${room.id.substring(0, 8)}`);
    }
  }, [room, token]);

  // Setup WebRTC Signal Handlers
  useEffect(() => {
    onWebRTCSignalRef.current = (signal) => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.handleSignalingMessage(signal);
      }
    };
  }, [onWebRTCSignalRef]);

  // Start WebRTC Call
  const handleStartCall = async () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.close();
    }

    const manager = new WebRTCManager({
      isPolite: !isHost, // Host is impolite, Guest is polite
      onRemoteStream: (stream) => setRemoteStream(stream),
      onStatusChange: (status) => setCallStatus(status),
      sendSignal: sendWebRTCSignal,
    });

    webrtcManagerRef.current = manager;

    const stream = await manager.initLocalStream(false); // Audio default enabled, video off
    setLocalStream(stream);
    setDeviceState(manager.getDeviceState());

    await manager.connect();
  };

  const handleEndCall = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.close();
      webrtcManagerRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
  };

  const handleToggleAudio = () => {
    if (webrtcManagerRef.current) {
      const active = webrtcManagerRef.current.toggleMicrophone();
      setDeviceState((prev) => ({ ...prev, audioEnabled: active }));
    }
  };

  const handleToggleVideo = async () => {
    if (webrtcManagerRef.current) {
      const active = await webrtcManagerRef.current.toggleCamera();
      setDeviceState((prev) => ({ ...prev, videoEnabled: active }));
    }
  };

  const handleCopyInvite = () => {
    if (!room?.invitation_token) return;
    const url = `${window.location.origin}/join/${room.invitation_token}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  // Cleanup WebRTC call on unmount
  useEffect(() => {
    return () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.close();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-3" />
        <p className="text-slate-300 text-sm font-medium">Validating room authorization & joining...</p>
      </div>
    );
  }

  if (error || !room) {
    return <ExpiredRoomPage reason={error || 'Room not found.'} />;
  }

  const peer = participants.find((p) => p.id !== currentUser?.id);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sleek Top Navbar */}
      <Navbar
        roomTitle={room.title}
        invitationToken={room.invitation_token}
        participants={participants}
        currentUserId={currentUser?.id}
        isHost={isHost}
        isOnline={true}
        onLeaveRoom={() => setShowLeaveModal(true)}
        onRevokeRoom={() => setShowRevokeModal(true)}
      />

      {/* Main Watch Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Primary Video Player Column */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {/* Waiting for Partner Banner (Host only when peer not yet joined) */}
          {!peer && isHost && (
            <div className="bg-gradient-to-r from-slate-900 via-violet-950/40 to-slate-900 border border-violet-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <div>
                  <span className="font-semibold text-slate-100 text-sm">
                    Waiting for partner to join (1/2 connected)
                  </span>
                  <p className="text-slate-400 text-xs">
                    You can pick your local movie file right now. Playback will synchronize once your partner joins and picks the matching file.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyInvite}
                className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl font-semibold shadow transition cursor-pointer shrink-0"
              >
                {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedInvite ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          )}

          {/* Main Video Player */}
          <VideoPlayer
            src={localObjectUrl}
            playbackState={playbackState}
            syncStatus={syncStatus}
            matchStatus={matchStatus}
            isMatched={isMatched}
            onSendSyncCommand={sendSyncCommand}
            onSyncStatusChange={setSyncStatus}
            onOpenPicker={() => {
              const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
              if (fileInput) {
                fileInput.value = '';
                fileInput.click();
              }
            }}
          />

          {/* Local Movie File Picker & Match Status */}
          <MovieSelector
            participants={participants}
            currentUserId={currentUser?.id || ''}
            matchStatus={matchStatus}
            isHashing={isHashingLocalFile}
            hashProgress={hashProgress}
            onSelectLocalMovie={setLocalMovie}
          />

          {/* Quick Action Bar for Tablet & Mobile */}
          <div className="flex items-center justify-between lg:hidden pt-2">
            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex items-center space-x-2 bg-slate-900 border border-slate-800 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold"
            >
              <MessageSquare className="w-4 h-4 text-violet-400" />
              <span>Toggle Chat ({chatMessages.length})</span>
            </button>

            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-400" />
              <span>{participants.filter((p) => p.isOnline).length}/2 Connected</span>
            </span>
          </div>
        </main>

        {/* Floating Draggable WebRTC Video Call Tile */}
        <RemoteVideoTile
          localStream={localStream}
          remoteStream={remoteStream}
          callStatus={callStatus}
          audioEnabled={deviceState.audioEnabled}
          videoEnabled={deviceState.videoEnabled}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
        />

        {/* Collapsible Chat Panel */}
        <ChatPanel
          messages={chatMessages}
          participants={participants}
          currentUserId={currentUser?.id || ''}
          onSendMessage={sendChatMessage}
          isOpen={isChatOpen}
          onToggleOpen={() => setIsChatOpen(false)}
        />
      </div>

      {/* Modals for Leave / Revoke */}
      <Modal
        isOpen={showLeaveModal}
        title="Leave Watch Room"
        message="Are you sure you want to leave this watch party?"
        confirmText="Leave Room"
        onConfirm={() => navigate('/')}
        onCancel={() => setShowLeaveModal(false)}
      />

      <Modal
        isOpen={showRevokeModal}
        title="Revoke & Close Room"
        message="Are you sure you want to end this watch party and revoke the invitation link?"
        isDestructive={true}
        confirmText="End Party"
        onConfirm={async () => {
          await revokeRoom();
          navigate('/');
        }}
        onCancel={() => setShowRevokeModal(false)}
      />
    </div>
  );
};
