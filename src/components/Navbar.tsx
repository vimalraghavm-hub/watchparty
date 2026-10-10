import React, { useState } from 'react';
import { Film, Copy, Check, Users, LogOut, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import type { Participant } from '../types';

interface NavbarProps {
  roomTitle: string;
  invitationToken?: string;
  participants: Participant[];
  currentUserId?: string;
  isHost: boolean;
  isOnline: boolean;
  onLeaveRoom: () => void;
  onRevokeRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomTitle,
  invitationToken,
  participants,
  currentUserId,
  isHost,
  isOnline,
  onLeaveRoom,
  onRevokeRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    if (!invitationToken) return;
    const url = `${window.location.origin}/join/${invitationToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const activeCount = participants.filter((p) => p.isOnline).length;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
      {/* Brand & Room Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/30">
          <Film className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-100 text-sm sm:text-base leading-tight truncate max-w-[150px] sm:max-w-xs">
            {roomTitle || 'WatchTogether'}
          </h1>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-rose-400 animate-pulse" />
              )}
              {isOnline ? 'Connected' : 'Offline'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-violet-400" />
              {activeCount}/2 Connected
            </span>
          </div>
        </div>
      </div>

      {/* Participants & Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Participant Avatars */}
        <div className="hidden sm:flex items-center space-x-1 bg-slate-900/80 border border-slate-800 rounded-full px-2.5 py-1 text-xs">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center space-x-1.5"
              title={`${p.name} (${p.role}) ${p.isOnline ? '- Online' : '- Offline'}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  p.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
                }`}
              />
              <span className={`font-medium ${p.id === currentUserId ? 'text-rose-300' : 'text-slate-300'}`}>
                {p.name} {p.id === currentUserId && '(You)'}
              </span>
            </div>
          ))}
        </div>

        {/* Copy Invite Link Button */}
        {invitationToken && (
          <button
            onClick={handleCopyInvite}
            className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition touch-control cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-rose-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden xs:inline">{copied ? 'Link Copied!' : 'Copy Invite'}</span>
          </button>
        )}

        {/* Host Revoke Room Button */}
        {isHost && onRevokeRoom && (
          <button
            onClick={onRevokeRoom}
            title="End Watch Party & Revoke Room"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition border border-transparent hover:border-rose-900/40 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        )}

        {/* Leave Room Button */}
        <button
          onClick={onLeaveRoom}
          className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition touch-control cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
};
