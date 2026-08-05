import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PillSelector } from '../components/PillSelector';
import { EmailPreviewCard } from '../components/EmailPreviewCard';
import { Wand2, Check, AlertCircle, Clock, X } from 'lucide-react';

export const ComposePage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [to, setTo] = useState('');
  const [recipientContext, setRecipientContext] = useState('');

  // Pill selector states
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Medium');
  const [style, setStyle] = useState('Professional');
  const [mood, setMood] = useState('Friendly');

  // Generated email output state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Loading & notification states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  const toneOptions = ['Professional', 'Casual', 'Urgent', 'Friendly', 'Direct', 'Empathetic'];
  const lengthOptions = ['Short', 'Medium', 'Detailed'];
  const styleOptions = ['Professional', 'Persuasive', 'Warm', 'Crisp', 'Executive'];
  const moodOptions = ['Friendly', 'Confident', 'Formal', 'Constructive', 'Enthusiastic'];

  // Debounced Auto-save draft (~10s)
  useEffect(() => {
    if (!subject && !body) return;
    setAutoSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/drafts', {
          id: currentDraftId || undefined,
          subject,
          body,
          tone
        });
        if (res.data?.id) {
          setCurrentDraftId(res.data.id);
          setAutoSaveStatus('saved');
        }
      } catch (err) {
        console.error('[Auto-save Error]', err);
        setAutoSaveStatus('idle');
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [subject, body, tone]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setNotification(null);

    try {
      const res = await api.post('/ai/generate', {
        prompt,
        tone,
        length,
        style,
        mood,
        recipientContext
      });

      setSubject(res.data.subject || '');
      setBody(res.data.body || '');
      setNotification({ type: 'success', message: 'Email generated successfully by Claude AI!' });
    } catch (err: any) {
      console.error('[Generate Error]', err);
      setNotification({ type: 'error', message: err?.response?.data?.error || 'Failed to generate email' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!to || !subject || !body) return;
    setIsSending(true);
    setNotification(null);

    try {
      const res = await api.post('/emails/send', {
        to,
        subject,
        body,
        draftId: currentDraftId || undefined
      });

      if (res.data.success) {
        setNotification({
          type: 'success',
          message: `Email sent via MCP (${res.data.messageId || 'Delivered'})!`
        });
        setPrompt('');
        setSubject('');
        setBody('');
        setTo('');
        setCurrentDraftId(null);
      }
    } catch (err: any) {
      console.error('[Send Error]', err);
      setNotification({ type: 'error', message: err?.response?.data?.error || 'Failed to send email' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const res = await api.post('/drafts', {
        id: currentDraftId || undefined,
        subject,
        body,
        tone
      });
      if (res.data?.id) {
        setCurrentDraftId(res.data.id);
        setNotification({ type: 'success', message: 'Draft saved successfully!' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to save draft' });
    }
  };

  const handleCreateSchedule = async () => {
    if (!currentDraftId) {
      // Save draft first
      const draftRes = await api.post('/drafts', { subject, body, tone });
      const newDraftId = draftRes.data.id;
      setCurrentDraftId(newDraftId);
      await api.post('/schedule', { draftId: newDraftId, sendAt: scheduleDateTime });
    } else {
      await api.post('/schedule', { draftId: currentDraftId, sendAt: scheduleDateTime });
    }

    setShowScheduleModal(false);
    setNotification({ type: 'success', message: `Email scheduled for ${new Date(scheduleDateTime).toLocaleString()}` });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Banner / Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            Compose with AI
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-400/20 text-ink-900 border border-accent-400/40">
              Flymail Executive UX
            </span>
          </h1>
          <p className="text-sm text-ink-700 mt-1">
            Describe your email objective, adjust parameters, and send seamlessly via MCP.
          </p>
        </div>

        {autoSaveStatus !== 'idle' && (
          <div className="text-xs text-ink-700 flex items-center gap-1.5 bg-paper-100 px-3 py-1.5 rounded-full border border-paper-200">
            {autoSaveStatus === 'saving' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Auto-saving draft...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Draft saved</span>
              </>
            )}
          </div>
        )}
      </div>

      {notification && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two-Column Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Left Column: Input & Selector Panel */}
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col gap-5">
            {/* Selector Pills Row */}
            <div>
              <label className="text-[11px] font-semibold uppercase text-ink-700 tracking-wider block mb-2">
                Style & Tone Adjusters
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <PillSelector label="Tone" value={tone} options={toneOptions} onChange={setTone} />
                <PillSelector label="Length" value={length} options={lengthOptions} onChange={setLength as any} />
                <PillSelector label="Style" value={style} options={styleOptions} onChange={setStyle} />
                <PillSelector label="Mood" value={mood} options={moodOptions} onChange={setMood} />
              </div>
            </div>

            {/* Recipient Context */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase text-ink-700 tracking-wider">
                Recipient / Audience Context (Optional)
              </label>
              <input
                type="text"
                value={recipientContext}
                onChange={(e) => setRecipientContext(e.target.value)}
                placeholder="e.g. VP of Product at Acme Corp, interested in API security"
                className="bg-paper-50 border border-paper-200 focus:border-accent-400 rounded-xl px-3.5 py-2 text-xs text-ink-900 placeholder-ink-700/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Main Prompt Input Area */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[11px] font-semibold uppercase text-ink-700 tracking-wider">
                What email do you want to write?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={10}
                placeholder="e.g. Write a friendly follow-up email to Sarah regarding the Q3 product strategy deck. Mention that our team reviewed the proposal and we have 2 minor feedback points regarding timeline..."
                className="w-full bg-paper-50 border border-paper-200 focus:border-accent-400 rounded-2xl p-4 text-sm text-ink-900 placeholder-ink-700/50 focus:outline-none leading-relaxed transition-all resize-none font-sans"
              />
            </div>
          </div>

          {/* Primary Generate Button */}
          <div className="mt-6 pt-4 border-t border-paper-200">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3.5 bg-accent-400 hover:bg-accent-500 text-ink-900 font-semibold rounded-xl shadow-lg shadow-accent-400/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <Wand2 className="w-4 h-4 text-ink-900" />
              <span>{isGenerating ? 'Generating Email...' : 'Generate Email'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Output & Preview Card */}
        <div>
          <EmailPreviewCard
            subject={subject}
            body={body}
            to={to}
            onSubjectChange={setSubject}
            onBodyChange={setBody}
            onToChange={setTo}
            onRegenerate={handleGenerate}
            onSend={handleSendEmail}
            onSaveDraft={handleSaveDraft}
            onSchedule={() => setShowScheduleModal(true)}
            isGenerating={isGenerating}
            isSending={isSending}
          />
        </div>
      </div>

      {/* Schedule Email Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-100 border border-paper-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-paper-200 mb-4">
              <h3 className="text-base font-semibold text-ink-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                Schedule Email Dispatch
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-ink-700 hover:text-ink-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <label className="text-xs font-semibold text-ink-700">Select Date and Time</label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="bg-paper-50 border border-paper-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-accent-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-xs font-medium text-ink-700 hover:text-ink-900 rounded-xl hover:bg-paper-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={!scheduleDateTime}
                className="px-5 py-2 text-xs font-semibold text-ink-900 bg-accent-400 hover:bg-accent-500 rounded-xl disabled:opacity-40 shadow-sm"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
