import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, MessageSquare, ChevronRight, Users } from 'lucide-react';
import { sanitizeText } from '../lib/security';
import type { ChatMessage, Participant } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  participants: Participant[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

const EMOJI_LIST = ['❤️', '😂', '😮', '👏', '🎉', '🍿', '🔥', '😍'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  participants,
  currentUserId,
  onSendMessage,
  isOpen,
  onToggleOpen,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleQuickEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div
      className={`fixed lg:relative top-16 bottom-0 right-0 z-30 bg-slate-950/95 border-l border-slate-800 flex flex-col transition-all duration-300 w-full sm:w-80 ${
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-violet-400" />
          <h2 className="font-semibold text-slate-200 text-sm">Room Chat</h2>
        </div>

        <button
          onClick={onToggleOpen}
          className="lg:hidden text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Participant Presence Mini Bar */}
      <div className="px-3.5 py-2 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Users className="w-3 h-3 text-slate-400" /> Participants
        </span>
        <div className="flex items-center space-x-2">
          {participants.map((p) => (
            <span
              key={p.id}
              className={`px-2 py-0.5 rounded-full font-medium ${
                p.isOnline
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {p.name.split(' ')[0]} ({p.role})
            </span>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No messages yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">Say hi to your watch partner!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="text-[11px] font-medium text-slate-400">{msg.sender_name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                      msg.sender_role === 'host' ? 'bg-rose-950 text-rose-300' : 'bg-violet-950 text-violet-300'
                    }`}
                  >
                    {msg.sender_role}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm break-words ${
                    isSelf
                      ? 'bg-gradient-to-r from-rose-600 to-violet-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {sanitizeText(msg.content)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-around">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleQuickEmoji(emoji)}
              className="text-base hover:scale-125 transition transform p-1 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950 flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-slate-400 hover:text-rose-400 p-2 rounded-xl hover:bg-slate-900 transition cursor-pointer"
          title="Add Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-xl shadow-md transition touch-control cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
