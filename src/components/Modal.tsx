import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-sm space-y-4 relative">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div
            className={`p-2.5 rounded-xl ${
              isDestructive ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-100 text-base">{title}</h3>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition shadow-lg cursor-pointer ${
              isDestructive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-violet-600 hover:bg-violet-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
