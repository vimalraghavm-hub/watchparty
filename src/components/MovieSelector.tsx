import React, { useRef, useState } from 'react';
import { HardDrive, CheckCircle2, AlertCircle, RefreshCw, FolderOpen, ShieldCheck } from 'lucide-react';
import { validateMovieFile } from '../lib/security';
import type { Participant, MovieMatchStatus } from '../types';

interface MovieSelectorProps {
  participants: Participant[];
  currentUserId: string;
  matchStatus: MovieMatchStatus;
  isHashing: boolean;
  hashProgress: number;
  onSelectLocalMovie: (file: File) => void;
}

export const MovieSelector: React.FC<MovieSelectorProps> = ({
  participants,
  currentUserId,
  matchStatus,
  isHashing,
  hashProgress,
  onSelectLocalMovie,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const selfParticipant = participants.find((p) => p.id === currentUserId);
  const peerParticipant = participants.find((p) => p.id !== currentUserId);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleProcessFile = (file: File) => {
    setError(null);

    const validation = validateMovieFile(file);
    if (!validation.valid && validation.error) {
      setError(`${validation.error} ${validation.recommendedAction || ''}`);
      return;
    }

    onSelectLocalMovie(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
  };

  const handleOpenPicker = () => {
    if (fileInputRef.current) {
      // Reset input value so selecting the exact same file again fires onChange
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/mkv,video/mov,.mp4,.webm,.mkv,.mov"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm sm:text-base">Local Movie Selection</h3>
            <p className="text-xs text-slate-400">Select a local video file from this device</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenPicker}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition touch-control cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" />
          <span>{selfParticipant?.localFileName ? 'Change Movie' : 'Choose Movie'}</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl flex items-start space-x-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropzone & Status Card */}
      <div
        onClick={handleOpenPicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition select-none ${
          isDragging
            ? 'border-rose-500 bg-rose-950/20'
            : 'border-slate-700/80 hover:border-violet-500/60 bg-slate-950/60 hover:bg-slate-950'
        }`}
      >
        {isHashing ? (
          <div className="flex flex-col items-center space-y-2.5 w-full max-w-xs">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <span className="text-xs font-semibold text-slate-200">
              Verifying file integrity ({hashProgress}%)...
            </span>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-200"
                style={{ width: `${hashProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400">
              Generating full-file cryptographic SHA-256 signature
            </span>
          </div>
        ) : selfParticipant?.localFileName ? (
          <div className="flex flex-col items-center space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-100 max-w-md truncate">
              {selfParticipant.localFileName}
            </span>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>{formatFileSize(selfParticipant.localFileSize)}</span>
              {selfParticipant.localFileHash && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Hash: {selfParticipant.localFileHash.substring(0, 16)}...
                  </span>
                </>
              )}
            </div>
            <span className="text-[11px] text-violet-400 hover:underline pt-1">
              Click or drag another file to replace
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <HardDrive className="w-8 h-8 text-slate-500" />
            <span className="text-xs sm:text-sm font-medium text-slate-300">
              Click to choose or drag & drop movie file (.mp4, .webm, .mkv)
            </span>
            <span className="text-[11px] text-slate-500">
              Plays locally in your browser. No files or movie bytes are ever uploaded.
            </span>
          </div>
        )}
      </div>

      {/* Real-time Match Verification Indicator */}
      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Synchronization Match Status:</span>
          {matchStatus === 'movies_match' ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Movies Match — Ready to Sync!</span>
            </span>
          ) : matchStatus === 'movies_mismatch' ? (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Movies Do Not Match</span>
            </span>
          ) : matchStatus === 'checking_movie' ? (
            <span className="text-amber-400 font-medium flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Checking Movie...</span>
            </span>
          ) : (
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span>Waiting for movie...</span>
            </span>
          )}
        </div>

        {matchStatus === 'movies_mismatch' && (
          <div className="text-[11px] text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/50">
            <strong>Hash mismatch detected:</strong> Both participants must select the exact same movie file on their respective devices.
          </div>
        )}

        {matchStatus === 'waiting_for_movie' && (
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {selfParticipant?.localFileName
                ? 'Your file is ready. Waiting for your partner to choose matching movie...'
                : 'Select your local copy of the movie above to begin.'}
            </span>
            {peerParticipant && (
              <span className="text-violet-400 text-[11px]">
                {peerParticipant.isMediaReady ? 'Partner is ready' : 'Partner selecting file...'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Privacy Guarantee Note */}
      <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>
          Private local playback: Movie bytes are processed strictly on your device. Only playback timing commands are shared.
        </span>
      </div>
    </div>
  );
};
