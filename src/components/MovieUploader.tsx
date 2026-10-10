import React, { useState } from 'react';
import { UploadCloud, Download, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { uploadMovieFile, getSignedDownloadUrl } from '../lib/supabase';
import { validateMovieFile, calculateFileHash } from '../lib/security';
import type { RoomMedia } from '../types';

interface MovieUploaderProps {
  roomId: string;
  isHost: boolean;
  roomMedia: RoomMedia | null;
  onClose: () => void;
  onMediaUploaded?: (media: RoomMedia) => void;
  onDownloadCompleted?: (file: File, fileHash: string) => void;
}

export const MovieUploader: React.FC<MovieUploaderProps> = ({
  roomId,
  isHost,
  roomMedia,
  onClose,
  onDownloadCompleted,
}) => {
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const val = validateMovieFile(file, 500);
    if (!val.valid) {
      setError(val.error || 'Invalid file size or format.');
      return;
    }

    setFileToUpload(file);
  };

  const handleUpload = async () => {
    if (!fileToUpload || !isHost) return;

    setIsUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      setUploadProgress(30);

      const result = await uploadMovieFile(roomId, fileToUpload, (progress) => {
        setUploadProgress(30 + Math.floor(progress * 0.7));
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setUploadProgress(100);
      alert('Movie successfully uploaded to private room storage!');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!roomMedia || !roomMedia.storage_path) return;

    setIsDownloading(true);
    setDownloadProgress(10);
    setError(null);

    try {
      const signedUrl = await getSignedDownloadUrl(roomMedia.storage_path);
      if (!signedUrl) {
        throw new Error('Could not generate secure signed download URL.');
      }

      setDownloadProgress(30);
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Download request failed.');

      setDownloadProgress(70);
      const blob = await response.blob();
      const downloadedFile = new File([blob], roomMedia.file_name, { type: roomMedia.mime_type });

      setDownloadProgress(90);
      const fileHash = roomMedia.file_hash || (await calculateFileHash(downloadedFile));
      setDownloadProgress(100);

      if (onDownloadCompleted) {
        onDownloadCompleted(downloadedFile, fileHash);
      }

      alert('Movie downloaded successfully! Prepared for local playback.');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-md space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-rose-400" />
            <h2 className="font-semibold text-slate-100 text-base">Private Storage Movie Sync</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl flex items-start space-x-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Host Upload Section */}
        {isHost && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Host Upload</h3>
            <label className="border border-dashed border-slate-700 hover:border-rose-500/50 bg-slate-950 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition">
              <input type="file" accept="video/mp4,video/webm" onChange={handleFileSelect} className="hidden" />
              <UploadCloud className="w-6 h-6 text-slate-500 mb-1" />
              <span className="text-xs text-slate-300 font-medium">
                {fileToUpload ? fileToUpload.name : 'Select file to upload (Max 500 MB)'}
              </span>
              {fileToUpload && (
                <span className="text-[11px] text-slate-500">{(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB</span>
              )}
            </label>

            {isUploading ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Uploading to private cloud...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <button
                onClick={handleUpload}
                disabled={!fileToUpload}
                className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold py-2.5 rounded-xl shadow-lg transition touch-control cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Start Upload</span>
              </button>
            )}
          </div>
        )}

        {/* Guest Download Section */}
        {roomMedia && roomMedia.storage_path && (
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Available Cloud Movie</h3>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">{roomMedia.file_name}</p>
                <p className="text-slate-500 font-mono text-[11px]">{(roomMedia.file_size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>

            {isDownloading ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Downloading movie file...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                </div>
              </div>
            ) : (
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2.5 rounded-xl shadow-lg transition touch-control cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Movie to Device</span>
              </button>
            )}
          </div>
        )}

        {/* Free Quota Notice */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Notice on Storage Quotas:</p>
          <p>
            Private uploads are capped at 500 MB to stay within free-tier limits. For movies larger than 500 MB, both users should select their local copy directly using the local file picker.
          </p>
        </div>
      </div>
    </div>
  );
};
