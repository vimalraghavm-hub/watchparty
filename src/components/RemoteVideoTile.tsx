import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneCall,
  PhoneOff,
  AlertCircle,
  GripHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CallStatus } from '../types';

interface RemoteVideoTileProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: CallStatus;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onStartCall: () => void;
  onEndCall: () => void;
}

interface TilePosition {
  x: number;
  y: number;
}

export const RemoteVideoTile: React.FC<RemoteVideoTileProps> = ({
  localStream,
  remoteStream,
  callStatus,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onStartCall,
  onEndCall,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Position state with saved session position fallback
  const [position, setPosition] = useState<TilePosition>(() => {
    try {
      const saved = sessionStorage.getItem('watchtogether_call_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    // Sensible default: floating in upper-right below navbar
    const defaultX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 320) : 800;
    const defaultY = 76;
    return { x: defaultX, y: defaultY };
  });

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; tileX: number; tileY: number }>({
    mouseX: 0,
    mouseY: 0,
    tileX: 0,
    tileY: 0,
  });

  // Clamp position to visible viewport boundaries
  const clampPosition = useCallback((x: number, y: number): TilePosition => {
    if (typeof window === 'undefined') return { x, y };
    const cardWidth = cardRef.current?.offsetWidth || 280;
    const cardHeight = cardRef.current?.offsetHeight || 180;

    const minX = 12;
    const maxX = Math.max(minX, window.innerWidth - cardWidth - 12);
    const minY = 64; // below navbar
    const maxY = Math.max(minY, window.innerHeight - cardHeight - 12);

    return {
      x: Math.min(Math.max(minX, x), maxX),
      y: Math.min(Math.max(minY, y), maxY),
    };
  }, []);

  // Window resize handler: keep tile inside viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  // Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore drag start if clicking on interactive buttons or controls
    if ((e.target as HTMLElement).closest('button, input, select')) {
      return;
    }

    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      tileX: position.x,
      tileY: position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    const clamped = clampPosition(
      dragStartRef.current.tileX + dx,
      dragStartRef.current.tileY + dy
    );

    setPosition(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    try {
      sessionStorage.setItem('watchtogether_call_pos', JSON.stringify(position));
    } catch {}
  };

  // Attach local stream to video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isCallActive = callStatus === 'connected' || callStatus === 'connecting';

  return (
    <div
      ref={cardRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
      }}
      className={`z-50 w-64 sm:w-72 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden select-none transition-shadow ${
        isDragging ? 'shadow-violet-900/40 ring-2 ring-violet-500/50 cursor-grabbing' : 'shadow-2xl'
      }`}
    >
      {/* Draggable Header Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reposition call panel"
      >
        <div className="flex items-center space-x-2">
          <GripHorizontal className="w-4 h-4 text-slate-500" />
          <div
            className={`w-2 h-2 rounded-full ${
              callStatus === 'connected'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : callStatus === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-xs font-semibold text-slate-200">
            {callStatus === 'connected'
              ? 'Call Connected'
              : callStatus === 'connecting'
              ? 'Connecting...'
              : 'Video Call'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
          title={isMinimized ? 'Expand call tile' : 'Minimize call tile'}
        >
          {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Body (Kept in DOM to prevent video track remount or stream detachment) */}
      <div className={`p-2.5 space-y-2.5 ${isMinimized ? 'hidden' : 'block'}`}>
        {isCallActive ? (
          <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {/* Remote Peer Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-900/90">
                <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                <span className="text-slate-400 text-xs">Peer camera off (Audio active)</span>
              </div>
            )}

            {/* Local Picture-in-Picture Video Thumbnail */}
            <div className="absolute top-2 right-2 w-20 aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!videoEnabled && (
                <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center">
                  <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3.5 flex flex-col items-center text-center space-y-2.5">
            <div className="w-9 h-9 rounded-full bg-violet-950/60 border border-violet-800/50 flex items-center justify-center text-violet-400">
              <PhoneCall className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-300">
              Talk and see each other via peer-to-peer WebRTC while watching.
            </p>
            {callStatus === 'permission_denied' && (
              <div className="flex items-center space-x-1.5 text-rose-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Microphone/Camera permission denied.</span>
              </div>
            )}
            <button
              type="button"
              onClick={onStartCall}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white text-xs font-semibold py-2 rounded-xl shadow-lg transition touch-control cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Start WebRTC Call</span>
            </button>
          </div>
        )}

        {/* In-call Controls */}
        {isCallActive && (
          <div className="flex items-center justify-center space-x-3 pt-1">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={onToggleAudio}
              className={`p-2.5 rounded-full transition touch-control cursor-pointer ${
                audioEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-rose-900/80 text-rose-300 border border-rose-700'
              }`}
              title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            {/* Video Toggle */}
            <button
              type="button"
              onClick={onToggleVideo}
              className={`p-2.5 rounded-full transition touch-control cursor-pointer ${
                videoEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-rose-900/80 text-rose-300 border border-rose-700'
              }`}
              title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            {/* End Call */}
            <button
              type="button"
              onClick={onEndCall}
              className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md transition touch-control cursor-pointer"
              title="End Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
