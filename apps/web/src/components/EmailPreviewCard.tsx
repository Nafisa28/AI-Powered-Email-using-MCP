import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCw,
  Send,
  Save,
  Clock,
  Sparkles,
  User,
  Edit3
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

  const handleCopy = () => {
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-paper-100 border border-paper-200 rounded-2xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-paper-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-700">
            Generated Email Preview
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-paper-50 border border-paper-200 text-ink-700 flex items-center gap-1">
            <Edit3 className="w-3 h-3 text-amber-600" />
            Directly Editable
          </span>
        </div>

        <button
          onClick={handleCopy}
          disabled={!subject && !body}
          className="text-xs px-3 py-1.5 rounded-lg bg-paper-50 border border-paper-200 text-ink-700 hover:text-ink-900 transition-colors flex items-center gap-1.5 disabled:opacity-40"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent-400/20 border border-accent-400/40 flex items-center justify-center text-accent-500 mb-4 animate-bounce">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-ink-900">Synthesizing narrative email with AI...</h4>
          <p className="text-xs text-ink-700 mt-1">Grounded in your exact prompt details</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Recipient Input */}
          <div className="flex items-center gap-3 bg-paper-50/80 p-3 rounded-xl border border-paper-200 focus-within:border-accent-400">
            <User className="w-4 h-4 text-ink-700" />
            <span className="text-xs text-ink-700 font-semibold">To:</span>
            <input
              type="email"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm text-ink-900 focus:outline-none placeholder-ink-700/50"
            />
          </div>

          {/* Subject Field - Directly Editable */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase text-ink-700 tracking-wider">
                Subject Line
              </label>
              <span className="text-[10px] text-ink-700/60 font-mono">
                {subject.length} chars
              </span>
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Email subject line will appear here..."
              className="w-full bg-paper-50 border border-paper-200 focus:border-accent-400 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-900 focus:outline-none leading-relaxed transition-all"
            />
          </div>

          {/* Body Field - Directly Editable */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase text-ink-700 tracking-wider">
                Email Body
              </label>
              <span className="text-[10px] text-ink-700/60 font-mono">
                {body.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={12}
              placeholder="Your generated email body will appear here. You can click anywhere to edit directly..."
              className="w-full flex-1 bg-paper-50 border border-paper-200 focus:border-accent-400 rounded-xl p-4 text-sm text-ink-900 focus:outline-none leading-relaxed font-sans transition-all resize-none"
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-paper-200 flex items-center justify-between gap-3">
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="text-xs px-3.5 py-2 rounded-xl bg-paper-50 hover:bg-paper-200 text-ink-700 font-medium transition-colors flex items-center gap-2 border border-paper-200 disabled:opacity-50"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Regenerate
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onSaveDraft}
            disabled={!subject && !body}
            className="text-xs px-3.5 py-2 rounded-xl bg-paper-50 hover:bg-paper-200 text-ink-700 font-medium transition-colors flex items-center gap-2 border border-paper-200 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5 text-amber-600" />
            Save Draft
          </button>

          <button
            onClick={onSchedule}
            disabled={!subject || !body}
            className="text-xs px-3.5 py-2 rounded-xl bg-paper-50 hover:bg-paper-200 text-ink-700 font-medium transition-colors flex items-center gap-2 border border-paper-200 disabled:opacity-40"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Schedule
          </button>

          <button
            onClick={onSend}
            disabled={isSending || isGenerating || !to || !subject || !body}
            className="text-xs px-5 py-2 rounded-xl bg-accent-400 hover:bg-accent-500 text-ink-900 font-semibold shadow-lg shadow-accent-400/20 transition-all flex items-center gap-2 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Sending via MCP...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};
