import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Play, Shield, Video, MessageSquare, ArrowRight, Lock } from 'lucide-react';
import { setGuestName } from '../lib/security';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [joinToken, setJoinToken] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setGuestName(nameInput);
    }
    navigate('/create');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinToken.trim()) return;

    if (nameInput.trim()) {
      setGuestName(nameInput);
    }

    // Extract token if user pasted full URL
    let token = joinToken.trim();
    if (token.includes('/join/')) {
      token = token.split('/join/').pop() || token;
    }

    navigate(`/join/${token}`);
  };

  return (
    <div className="min-h-full flex flex-col justify-between bg-slate-950 text-slate-100 selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
            <Film className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-100">WatchTogether</span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 border border-slate-800 bg-slate-900/60 px-3 py-1.5 rounded-full">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Private 2-Person Synchronized Watch Room</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto my-8 space-y-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Private Local & Cloud Movie Synchronization</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-rose-100 to-violet-200 leading-tight">
          Watch Movies Together, <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-violet-400">
            Synchronized in Real Time.
          </span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
          Watch matching local movie files on laptop or tablet with zero backend media streaming. Includes synchronized playback, real-time WebRTC audio/video call, and private chat.
        </p>

        {/* User Name & Action Forms */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 backdrop-blur-md">
          {/* Display Name Input */}
          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Display Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleCreateRoom}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-lg shadow-rose-950/30 transition transform hover:-translate-y-0.5 touch-control cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Create Private Room</span>
            </button>

            <form onSubmit={handleJoinRoom} className="flex flex-col space-y-2">
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={joinToken}
                  onChange={(e) => setJoinToken(e.target.value)}
                  placeholder="Paste Invite Code / URL"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  type="submit"
                  disabled={!joinToken.trim()}
                  className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl shadow transition touch-control cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-8 text-left">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-200 text-xs sm:text-sm">Local Playback</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Play matching local files on both devices. No bandwidth streaming or cloud lag.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-200 text-xs sm:text-sm">WebRTC Video Call</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Talk and see each other via low-latency peer-to-peer WebRTC video with independent camera & mic controls.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-200 text-xs sm:text-sm">Realtime Chat</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Share reactions, emojis, and messages in a private room scoped only to you and your partner.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        WatchTogether &copy; {new Date().getFullYear()} — Private 2-Person Synchronized Watch Room.
      </footer>
    </div>
  );
};
