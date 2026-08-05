import React from 'react';
import { Sparkles, X, CheckCircle2, ListChecks, FileText } from 'lucide-react';

interface SummarizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: {
    summary?: string;
    keyPoints?: string[];
    suggestedAction?: string;
  } | null;
  loading: boolean;
}

export const SummarizeModal: React.FC<SummarizeModalProps> = ({
  isOpen,
  onClose,
  summaryData,
  loading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">AI Thread Executive Summary</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Summarizing thread with Claude AI...</p>
          </div>
        ) : summaryData ? (
          <div className="py-4 flex flex-col gap-5">
            {/* Overview */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-indigo-400 tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                Executive Summary
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{summaryData.summary}</p>
            </div>

            {/* Key Points */}
            {summaryData.keyPoints && summaryData.keyPoints.length > 0 && (
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-purple-400 tracking-wider mb-2.5">
                  <ListChecks className="w-3.5 h-3.5" />
                  Key Takeaways
                </div>
                <ul className="flex flex-col gap-2">
                  {summaryData.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Action */}
            {summaryData.suggestedAction && (
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-400 tracking-wider mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Recommended Action
                </div>
                <p className="text-sm text-emerald-200 font-medium">{summaryData.suggestedAction}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
