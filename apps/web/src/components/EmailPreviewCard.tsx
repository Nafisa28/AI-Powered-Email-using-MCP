import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCw,
  Send,
  Save,
  Clock,
  Edit2,
  Sparkles,
  User,
  Mail
} from 'lucide-react';

interface EmailPreviewCardProps {
  subject: string;
  body: string;
  to: string;
  onSubjectChange: (val: string) => void;
  onBodyChange: (val: string) => void;
  onToChange: (val: string) => void;
  onRegenerate: () => void;
  onSend: () => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
  isGenerating: boolean;
  isSending: boolean;
}

export const EmailPreviewCard: React.FC<EmailPreviewCardProps> = ({
  subject,
  body,
  to,
  onSubjectChange,
  onBodyChange,
  onToChange,
  onRegenerate,
  onSend,
  onSaveDraft,
  onSchedule,
  isGenerating,
  isSending
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = () => {
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden transition-all">
      {/* Subtle shine / reveal accent header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Generated Email Preview
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
              isEditing
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isEditing ? 'Done Editing' : 'Edit Mode'}
          </button>
          <button
            onClick={handleCopy}
            disabled={!subject && !body}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-bounce">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-slate-200">Crafting your email with AI...</h4>
          <p className="text-xs text-slate-400 mt-1">Applying tone, length, and structured rules</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Recipient Input */}
          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">To:</span>
            <input
              type="email"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm text-slate-100 focus:outline-none placeholder-slate-500"
            />
          </div>

          {/* Subject Field */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Subject Line</label>
            {isEditing ? (
              <input
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                className="bg-slate-950 border border-indigo-500/40 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none font-medium"
              />
            ) : (
              <h3 className="text-base font-semibold text-slate-100 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                {subject || <span className="text-slate-500 italic">No subject generated yet...</span>}
              </h3>
            )}
          </div>

          {/* Body Field */}
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Email Body</label>
            {isEditing ? (
              <textarea
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                rows={12}
                className="w-full flex-1 bg-slate-950 border border-indigo-500/40 rounded-xl p-3.5 text-sm text-slate-100 focus:outline-none leading-relaxed font-sans"
              />
            ) : (
              <div
                className="flex-1 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: body || '<span class="text-slate-500 italic">Generate an email using the prompt panel on the left...</span>' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-2 border border-slate-700/80 disabled:opacity-50"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Regenerate
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onSaveDraft}
            disabled={!subject && !body}
            className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-2 border border-slate-700/80 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            Save Draft
          </button>

          <button
            onClick={onSchedule}
            disabled={!subject || !body}
            className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center gap-2 border border-slate-700/80 disabled:opacity-40"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Schedule
          </button>

          <button
            onClick={onSend}
            disabled={isSending || isGenerating || !to || !subject || !body}
            className="text-xs px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Sending via MCP...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};
