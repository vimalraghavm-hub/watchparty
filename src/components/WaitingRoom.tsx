import React, { useState } from 'react';
import { Copy, Check, Users, ShieldAlert, Film, Loader2 } from 'lucide-react';

interface WaitingRoomProps {
  roomTitle: string;
  invitationToken: string;
  isHost: boolean;
  onRevokeRoom: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomTitle,
  invitationToken,
  isHost,
  onRevokeRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/join/${invitationToken}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
      {/* Icon Card */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-rose-950/40 mb-6 animate-pulse">
        <Film className="w-8 h-8" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
        {roomTitle || 'Private Watch Party'}
      </h2>
      <p className="text-slate-400 text-sm mb-6 max-w-md">
        Waiting for your partner to join the room. Share the private invitation link below to start watching together!
      </p>

      {/* Waiting Indicator Badge */}
      <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-2 text-xs font-semibold text-amber-300 mb-8">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        <span>Waiting for Participant 2 (1/2 Connected)</span>
      </div>

      {/* Invitation Link Box */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider">Private Invitation Link</span>
          <span className="text-emerald-400 font-mono text-[11px]">Expires in 7 days</span>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-300 font-mono focus:outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition touch-control cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Information Box */}
      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-left text-xs text-slate-400 space-y-2 mb-6">
        <div className="flex items-center space-x-2 font-semibold text-slate-300">
          <Users className="w-4 h-4 text-violet-400" />
          <span>How Private Watch Party Works:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
          <li>Both participants pick matching local movie files on their laptop or tablet.</li>
          <li>Playback is synchronized using lightweight authoritative commands.</li>
          <li>Talk via WebRTC video call and chat in real time.</li>
        </ul>
      </div>

      {/* Revoke Room Button for Host */}
      {isHost && (
        <button
          onClick={onRevokeRoom}
          className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-rose-400 transition cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Revoke invitation & cancel room</span>
        </button>
      )}
    </div>
  );
};
