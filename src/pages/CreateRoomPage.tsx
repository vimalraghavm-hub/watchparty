import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Shield, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { generateInvitationToken, getOrCreateGuestId } from '../lib/security';
import { createRoomRecord } from '../lib/supabase';

export const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState<string>('Cozy Movie Night');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userId = getOrCreateGuestId();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const token = generateInvitationToken();
      const room = await createRoomRecord(title.trim(), userId, token);

      if (!room) {
        throw new Error('Could not create room in database.');
      }

      navigate(`/room/${token}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room.');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md mx-auto my-auto w-full space-y-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Create Private Room</h2>
              <p className="text-xs text-slate-400">Generate a private invitation link for 2 participants</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Watch Room Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Friday Movie Night"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Private Access Control:</span>
              </div>
              <p>
                Rooms are limited to 2 participants. An unguessable invitation token valid for 7 days will be created.
              </p>
            </div>

            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white font-semibold text-sm py-3 rounded-xl shadow-lg transition touch-control cursor-pointer disabled:opacity-40"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Watch Room...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Watch Room & Copy Link</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
