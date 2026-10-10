import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneCall, PhoneOff, AlertCircle } from 'lucide-react';
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
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isCallActive = callStatus === 'connected' || callStatus === 'connecting';

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start transition-all duration-300 max-w-[calc(100vw-32px)] sm:max-w-xs">
      {/* Tile Container */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden w-64 sm:w-72">
        {/* Header Bar */}
        <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
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
                ? 'Video Call Connected'
                : callStatus === 'connecting'
                ? 'Connecting Call...'
                : 'Audio/Video Call'}
            </span>
          </div>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-400 hover:text-slate-200 text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer"
          >
            {isMinimized ? 'Expand' : 'Collapse'}
          </button>
        </div>

        {/* Video Call Body (if not minimized) */}
        {!isMinimized && (
          <div className="p-2 space-y-2">
            {isCallActive ? (
              <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {/* Remote Stream Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {!remoteStream || remoteStream.getVideoTracks().length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-900/90">
                    <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                    <span className="text-slate-400 text-xs">Peer camera off (Audio active)</span>
                  </div>
                ) : null}

                {/* Local Camera Picture-in-Picture Thumbnail */}
                <div className="absolute top-2 right-2 w-20 aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-md">
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
              <div className="p-4 flex flex-col items-center text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-violet-950/60 border border-violet-800/50 flex items-center justify-center text-violet-400">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-300">
                  Start a private two-person WebRTC call while watching together.
                </p>
                {callStatus === 'permission_denied' && (
                  <div className="flex items-center space-x-1.5 text-rose-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Microphone/Camera permission denied.</span>
                  </div>
                )}
                <button
                  onClick={onStartCall}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white text-xs font-semibold py-2 rounded-xl shadow-lg transition touch-control cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Start Call</span>
                </button>
              </div>
            )}

            {/* In-call Controls */}
            {isCallActive && (
              <div className="flex items-center justify-center space-x-3 pt-1">
                {/* Audio Toggle */}
                <button
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
                  onClick={onEndCall}
                  className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md transition touch-control cursor-pointer"
                  title="End Call"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
