import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Film,
} from 'lucide-react';
import {
  calculateTargetPosition,
  calculateDrift,
  shouldHardSeek,
  calculateRateCorrection,
  getEstimatedServerTime,
} from '../lib/syncEngine';
import type { PlaybackState, SyncStatus, MovieMatchStatus } from '../types';

interface VideoPlayerProps {
  src: string | null;
  playbackState: PlaybackState;
  syncStatus: SyncStatus;
  matchStatus: MovieMatchStatus;
  isMatched: boolean;
  onSendSyncCommand: (
    type: 'PLAY' | 'PAUSE' | 'SEEK' | 'PLAYBACK_RATE_CHANGE',
    targetPos: number,
    rate?: number
  ) => void;
  onSyncStatusChange: (status: SyncStatus) => void;
  onOpenPicker?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  playbackState,
  syncStatus,
  matchStatus,
  isMatched,
  onSendSyncCommand,
  onSyncStatusChange,
  onOpenPicker,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Suppress local event broadcasts when applying remote authoritative commands
  const isApplyingRemoteCommandRef = useRef<boolean>(false);
  const lastUserSeekTimestampRef = useRef<number>(0);

  // Sync ticker loop
  useEffect(() => {
    if (!videoRef.current || !src) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      // Only perform automatic authoritative drift correction if movies match
      if (isMatched) {
        const currentServerTime = getEstimatedServerTime();
        const targetPos = calculateTargetPosition(playbackState, currentServerTime);
        const localTime = video.currentTime;
        const drift = calculateDrift(localTime, targetPos);

        // Hard seek if drift exceeds threshold
        if (shouldHardSeek(drift, 1.5)) {
          if (Date.now() - lastUserSeekTimestampRef.current > 1200) {
            isApplyingRemoteCommandRef.current = true;
            video.currentTime = targetPos;
            onSyncStatusChange('correcting');
            setTimeout(() => {
              isApplyingRemoteCommandRef.current = false;
            }, 400);
          }
        } else {
          // Smooth micro-drift rate correction (0.9x to 1.1x)
          const rateCorrection = calculateRateCorrection(drift);
          if (Math.abs(video.playbackRate - rateCorrection) > 0.02) {
            video.playbackRate = rateCorrection;
          }
          if (syncStatus !== 'synced' && syncStatus !== 'buffering') {
            onSyncStatusChange('synced');
          }
        }

        // Synchronize remote play/pause state
        if (playbackState.isPlaying && video.paused) {
          isApplyingRemoteCommandRef.current = true;
          video.play().catch(() => {
            setAutoplayBlocked(true);
          });
          setTimeout(() => {
            isApplyingRemoteCommandRef.current = false;
          }, 400);
        } else if (!playbackState.isPlaying && !video.paused) {
          isApplyingRemoteCommandRef.current = true;
          video.pause();
          setTimeout(() => {
            isApplyingRemoteCommandRef.current = false;
          }, 400);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [playbackState, src, isMatched, syncStatus, onSyncStatusChange]);

  // Handle local user Play/Pause toggle
  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    const currentPos = video.currentTime;

    if (video.paused) {
      video
        .play()
        .then(() => {
          setAutoplayBlocked(false);
          if (isMatched) {
            onSendSyncCommand('PLAY', currentPos);
          }
        })
        .catch(() => {
          setAutoplayBlocked(true);
        });
    } else {
      video.pause();
      if (isMatched) {
        onSendSyncCommand('PAUSE', currentPos);
      }
    }
  }, [src, isMatched, onSendSyncCommand]);

  // Handle local Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !src) return;

    const targetPos = parseFloat(e.target.value);
    lastUserSeekTimestampRef.current = Date.now();
    videoRef.current.currentTime = targetPos;
    setCurrentTime(targetPos);

    if (isMatched) {
      onSendSyncCommand('SEEK', targetPos);
    }
  };

  // Handle Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  // HTML5 Media Event Handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setPlaybackError(null);
    }
  };

  const handleWaiting = () => {
    onSyncStatusChange('buffering');
  };

  const handlePlaying = () => {
    setIsPlaying(true);
    setAutoplayBlocked(false);
    onSyncStatusChange('synced');
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleError = () => {
    const video = videoRef.current;
    let message = 'Unable to decode this video file in browser.';
    if (video?.error) {
      switch (video.error.code) {
        case 1:
          message = 'Video playback aborted.';
          break;
        case 2:
          message = 'Network error while loading video.';
          break;
        case 3:
          message = 'Video decoding failed or codec unsupported.';
          break;
        case 4:
          message = 'Format or codec not supported. MP4 with H.264 video and AAC audio is recommended.';
          break;
      }
    }
    setPlaybackError(message);
    onSyncStatusChange('desynced');
  };

  const handleRetryPlayback = () => {
    setPlaybackError(null);
    if (videoRef.current && src) {
      videoRef.current.load();
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);

    if (hrs > 0) {
      const remMins = mins % 60;
      return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col justify-center items-center group select-none"
    >
      {/* Video Element */}
      {src ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain cursor-pointer"
          onClick={handleTogglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onPause={handlePause}
          onError={handleError}
          playsInline
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500">
            <Film className="w-8 h-8" />
          </div>
          <p className="text-slate-200 text-sm sm:text-base font-semibold">No Local Movie Selected</p>
          <p className="text-slate-400 text-xs max-w-sm">
            Select a movie file from your laptop or tablet below to begin.
          </p>
          {onOpenPicker && (
            <button
              onClick={onOpenPicker}
              className="mt-2 bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg transition cursor-pointer"
            >
              Choose Movie File
            </button>
          )}
        </div>
      )}

      {/* Sync Status Badge Overlay (Top Left) */}
      <div className="absolute top-3 left-3 z-20 flex items-center space-x-2">
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
            isMatched && syncStatus === 'synced'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
              : syncStatus === 'correcting' || syncStatus === 'buffering'
              ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
              : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
          }`}
        >
          {isMatched && syncStatus === 'synced' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {(syncStatus === 'correcting' || syncStatus === 'buffering') && (
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          )}
          {matchStatus === 'movies_mismatch' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
          <span>
            {matchStatus === 'movies_mismatch'
              ? 'Files Mismatched'
              : isMatched
              ? 'Synced & Ready'
              : 'Waiting for Matching Movie'}
          </span>
        </div>
      </div>

      {/* Autoplay Blocked User Interaction Overlay */}
      {autoplayBlocked && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4">
          <p className="text-slate-200 text-sm font-semibold mb-3">Browser prevented automatic playback</p>
          <button
            onClick={handleTogglePlay}
            className="flex items-center space-x-2 bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white px-6 py-3 rounded-xl font-semibold shadow-xl transition touch-control cursor-pointer transform hover:scale-105"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Tap to Start Watching</span>
          </button>
        </div>
      )}

      {/* Playback Error Overlay */}
      {playbackError && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <div>
            <p className="text-slate-100 font-semibold text-sm sm:text-base">Playback Error</p>
            <p className="text-rose-300 text-xs sm:text-sm max-w-md mt-1">{playbackError}</p>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={handleRetryPlayback}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Retry
            </button>
            {onOpenPicker && (
              <button
                onClick={onOpenPicker}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Choose Another Video
              </button>
            )}
          </div>
        </div>
      )}

      {/* Custom Control Bar Overlay (Bottom) */}
      {src && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-3 sm:p-4 z-20 opacity-90 group-hover:opacity-100 transition duration-300">
          {/* Progress Timeline Slider */}
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-xs font-mono text-slate-300 w-12">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer appearance-none focus:outline-none"
            />
            <span className="text-xs font-mono text-slate-400 w-12 text-right">{formatTime(duration)}</span>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            {/* Play/Pause + Re-sync */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTogglePlay}
                className="p-2 text-slate-100 hover:text-rose-400 hover:bg-slate-800/60 rounded-xl transition touch-control cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              {isMatched && (
                <button
                  onClick={() => {
                    const targetPos = calculateTargetPosition(playbackState, getEstimatedServerTime());
                    if (videoRef.current) videoRef.current.currentTime = targetPos;
                  }}
                  className="p-2 text-slate-400 hover:text-violet-300 hover:bg-slate-800/60 rounded-xl transition touch-control cursor-pointer"
                  title="Force Re-sync with Partner"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Volume & Fullscreen */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2">
                <button onClick={toggleMute} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 accent-rose-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-xl transition touch-control cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
