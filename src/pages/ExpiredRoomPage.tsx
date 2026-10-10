import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ExpiredRoomPageProps {
  reason?: string;
}

export const ExpiredRoomPage: React.FC<ExpiredRoomPageProps> = ({ reason }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 text-center">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl max-w-md w-full space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-bold text-slate-100">Unable to Join Watch Room</h2>

        <p className="text-slate-400 text-sm leading-relaxed">
          {reason || 'This invitation token is invalid, expired, revoked, or the watch room has reached its 2-participant limit.'}
        </p>

        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm py-3 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </button>
      </div>
    </div>
  );
};
