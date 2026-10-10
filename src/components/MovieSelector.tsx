import React, { useState } from 'react';
import { HardDrive, UploadCloud, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { calculateFileHash, validateMovieFile } from '../lib/security';
import type { Participant } from '../types';

interface MovieSelectorProps {
  participants: Participant[];
  currentUserId: string;
  onSelectLocalMovie: (file: File, fileHash: string) => void;
  onShowUploader?: () => void;
}

export const MovieSelector: React.FC<MovieSelectorProps> = ({
  participants,
  currentUserId,
  onSelectLocalMovie,
  onShowUploader,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const selfParticipant = participants.find((p) => p.id === currentUserId);
  const peerParticipant = participants.find((p) => p.id !== currentUserId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setWarning(null);

    const validation = validateMovieFile(file, 500);
    if (!validation.valid && validation.error) {
      if (validation.recommendedAction) {
        setWarning(`${validation.error} ${validation.recommendedAction}`);
      } else {
        setError(validation.error);
        return;
      }
    }

    setIsProcessing(true);
    setProcessProgress(20);

    try {
      const hash = await calculateFileHash(file, (p) => setProcessProgress(p));
      setProcessProgress(100);
      onSelectLocalMovie(file, hash);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process video file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isMatched =
    selfParticipant?.isMediaReady &&
    peerParticipant?.isMediaReady &&
    selfParticipant?.localFileHash === peerParticipant?.localFileHash;

  const isMismatch =
    selfParticipant?.isMediaReady &&
    peerParticipant?.isMediaReady &&
    selfParticipant?.localFileHash !== peerParticipant?.localFileHash;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200 text-sm sm:text-base">Select Local Movie File</h3>
            <p className="text-xs text-slate-400">Pick the movie on your device to play locally</p>
          </div>
        </div>

        {onShowUploader && (
          <button
            onClick={onShowUploader}
            className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload / Download Cloud File</span>
          </button>
        )}
      </div>

      {/* Warning or Error Messages */}
      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl flex items-start space-x-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {warning && (
        <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-xl flex items-start space-x-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      {/* File Picker Dropzone */}
      <label className="relative border-2 border-dashed border-slate-700 hover:border-violet-500/50 bg-slate-950/60 hover:bg-slate-950 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition">
        <input type="file" accept="video/mp4,video/webm,video/mkv,video/mov" onChange={handleFileChange} className="hidden" />

        {isProcessing ? (
          <div className="flex flex-col items-center space-y-2">
            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
            <span className="text-xs font-semibold text-slate-300">Generating movie cryptographic hash ({processProgress}%)...</span>
          </div>
        ) : selfParticipant?.isMediaReady ? (
          <div className="flex flex-col items-center space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">{selfParticipant.localFileName}</span>
            <span className="text-[11px] font-mono text-slate-500">Hash: {selfParticipant.localFileHash?.substring(0, 18)}...</span>
            <span className="text-[11px] text-violet-400 hover:underline mt-1">Click to change selected file</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <HardDrive className="w-8 h-8 text-slate-500" />
            <span className="text-xs font-medium text-slate-300">Click to browse or drag & drop movie file</span>
            <span className="text-[11px] text-slate-500">Supported formats: .mp4, .webm, .mkv (H.264 / AAC recommended)</span>
          </div>
        )}
      </label>

      {/* File Matching Status Indicator */}
      {selfParticipant?.isMediaReady && (
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Media Matching Verification:</span>
            {isMatched ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Movie Files Match Perfectly!
              </span>
            ) : isMismatch ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> File Mismatch Warning
              </span>
            ) : (
              <span className="text-amber-400 font-medium">Waiting for peer to select file...</span>
            )}
          </div>

          {isMismatch && (
            <p className="text-[11px] text-rose-300">
              Your selected movie hash does not match your peer&apos;s file. Please make sure both devices have selected the exact same movie file.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
