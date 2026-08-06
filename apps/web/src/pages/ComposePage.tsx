import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { PillSelector } from '../components/PillSelector';
import { EmailPreviewCard } from '../components/EmailPreviewCard';
import { Wand2, Check, AlertCircle, Clock, X, RefreshCw, Lightbulb } from 'lucide-react';

export const ComposePage: React.FC = () => {
  const location = useLocation();

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

  // Load existing draft if navigated from DraftsPage
  useEffect(() => {
    if (location.state && (location.state as any).draft) {
      const draft = (location.state as any).draft;
      setCurrentDraftId(draft.id);
      setSubject(draft.subject || '');
      setBody(draft.body || '');
      setPrompt(draft.body || draft.subject || '');
      if (draft.tone) setTone(draft.tone);
      setNotification({
        type: 'success',
        message: `Loaded saved draft: "${draft.subject || 'Untitled Draft'}" ready for editing.`
      });
    }
  }, [location.state]);

  const openScheduleModal = () => {
    const defaultTime = new Date(Date.now() + 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduleDateTime(defaultTime);
    setShowScheduleModal(true);
  };

  const setPresetTime = (minutesFromNow: number) => {
    const preset = new Date(Date.now() + minutesFromNow * 60 * 1000 - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduleDateTime(preset);
  };

  const setTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const preset = new Date(tomorrow.getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduleDateTime(preset);
  };

  const getSchedulePreview = () => {
    if (!scheduleDateTime) return null;
    const scheduledDate = new Date(scheduleDateTime);
    const diffMs = scheduledDate.getTime() - Date.now();
    if (diffMs <= 0) return { isValid: false, text: 'Selected time must be in the future.' };

    const totalMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const timeStr = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

    return {
      isValid: true,
      text: `Scheduled for ${scheduledDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (in ${timeStr})`
    };
  };

  const toneOptions = ['Professional', 'Casual', 'Urgent', 'Friendly', 'Direct', 'Empathetic'];
  const lengthOptions = ['Short', 'Medium', 'Detailed'];
  const styleOptions = ['Professional', 'Persuasive', 'Warm', 'Crisp', 'Executive'];
  const moodOptions = ['Friendly', 'Confident', 'Formal', 'Constructive', 'Enthusiastic'];

  const suggestionChips = [
    { label: '🌴 Leave Request', text: 'I am requesting a leave of absence for personal reasons from next Monday to Wednesday.' },
    { label: '🤒 Sick Day', text: 'I am feeling unwell today and will be taking a sick day to recover.' },
    { label: '📅 Project Sync', text: 'I would like to schedule a 30-minute meeting next week to align on Q3 project deliverables.' },
    { label: '🤝 Client Follow-up', text: 'Following up on our recent proposal to see if you have any questions or feedback.' },
    { label: '💼 Resignation Notice', text: 'Formal notification of my resignation, with my last day being two weeks from today.' },
    { label: '🙏 Thank You Note', text: 'Expressing sincere thanks for your guidance and support during our recent launch.' },
    { label: '⏰ Payment Reminder', text: 'A friendly reminder regarding outstanding invoice #1042 due this week.' }
  ];

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

  /**
   * Generates email ONLY when user explicitly clicks Generate Email or Regenerate.
   * Sends exact prompt text currently in textarea.
   */
  const handleGenerate = async () => {
    const currentPromptText = prompt.trim();
    if (!currentPromptText) return;

    setIsGenerating(true);
    setNotification(null);

    try {
      const res = await api.post('/ai/generate', {
        prompt: currentPromptText,
        tone,
        length,
        style,
        mood,
        recipientContext
      });

      setSubject(res.data.subject || '');
      setBody(res.data.body || '');
      setNotification({ type: 'success', message: 'Email generated successfully!' });
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
    if (!scheduleDateTime) return;

    const scheduledDate = new Date(scheduleDateTime);

    if (scheduledDate.getTime() <= Date.now()) {
      setNotification({ type: 'error', message: 'Scheduled time must be in the future.' });
      return;
    }

    const isoString = scheduledDate.toISOString();
    const finalSubject = to && !subject.includes('(to:') ? `${subject} (to: ${to})` : subject;

    try {
      let draftIdToSchedule = currentDraftId;
      if (!draftIdToSchedule) {
        const draftRes = await api.post('/drafts', { subject: finalSubject, body, tone });
        draftIdToSchedule = draftRes.data.id;
        setCurrentDraftId(draftIdToSchedule);
      } else {
        await api.post('/drafts', { id: draftIdToSchedule, subject: finalSubject, body, tone });
      }

      await api.post('/schedule', { draftId: draftIdToSchedule, sendAt: isoString });

      setShowScheduleModal(false);
      setNotification({
        type: 'success',
        message: `Email scheduled for ${scheduledDate.toLocaleDateString()} ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Check the Scheduled Queue page!`
      });
    } catch (err: any) {
      console.error('[Schedule Error]', err);
      setNotification({ type: 'error', message: err?.response?.data?.error || 'Failed to schedule email' });
    }
  };

  const schedulePreview = getSchedulePreview();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            Compose with AI
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-400/20 text-ink-900 border border-accent-400/40">
              Flymail Executive UX
            </span>
          </h1>
          <p className="text-sm text-ink-700 mt-1">
            Describe your situation, narrative, or objective below, then click <span className="font-semibold text-accent-500">Generate Email</span>.
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
        {/* Left Column: Prompt Input & Adjusters Panel */}
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col gap-5">
            {/* Style & Tone Adjusters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase text-ink-700 tracking-wider block">
                  Style & Tone Adjusters
                </label>
                {(subject || body) && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="text-[11px] font-semibold text-accent-500 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-apply Adjusters
                  </button>
                )}
              </div>
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
                placeholder="e.g. Manager, HR, Client at Acme Corp"
                className="bg-paper-50 border border-paper-200 focus:border-accent-400 rounded-xl px-3.5 py-2 text-xs text-ink-900 placeholder-ink-700/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Prompt Textarea */}
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[11px] font-semibold uppercase text-ink-700 tracking-wider">
                What email do you want to write? (Short keyword or full narrative)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                placeholder="Type any word or full narrative story (e.g. 'I am going to Paris for my brother's wedding next week and need to request leave from Aug 10-15...')"
                className="w-full bg-paper-50 border border-paper-200 focus:border-accent-400 rounded-2xl p-4 text-sm text-ink-900 placeholder-ink-700/50 focus:outline-none leading-relaxed transition-all resize-none font-sans"
              />

              {/* Prompt Suggestion Chips (ONLY populates textarea when clicked!) */}
              <div>
                <span className="text-[10px] font-semibold uppercase text-ink-700 tracking-wider flex items-center gap-1 mb-1.5">
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  Sample Prompt Ideas (Click to populate textarea):
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {suggestionChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setPrompt(chip.text)}
                      className="px-2.5 py-1 text-xs bg-paper-50 hover:bg-paper-200 text-ink-900 border border-paper-200 rounded-lg transition-all flex items-center gap-1"
                    >
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Explicit Generate Button */}
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

        {/* Right Column: Interactive Directly Editable Output Preview Card */}
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
            onSchedule={openScheduleModal}
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

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold uppercase text-ink-700 tracking-wider block mb-2">
                Quick Shortcuts
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPresetTime(15)}
                  className="px-3 py-1.5 text-xs font-medium bg-paper-50 hover:bg-paper-200 border border-paper-200 text-ink-900 rounded-lg transition-colors"
                >
                  +15 Mins
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTime(60)}
                  className="px-3 py-1.5 text-xs font-medium bg-paper-50 hover:bg-paper-200 border border-paper-200 text-ink-900 rounded-lg transition-colors"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTime(180)}
                  className="px-3 py-1.5 text-xs font-medium bg-paper-50 hover:bg-paper-200 border border-paper-200 text-ink-900 rounded-lg transition-colors"
                >
                  +3 Hours
                </button>
                <button
                  type="button"
                  onClick={setTomorrowMorning}
                  className="px-3 py-1.5 text-xs font-medium bg-paper-50 hover:bg-paper-200 border border-paper-200 text-ink-900 rounded-lg transition-colors"
                >
                  Tomorrow 9:00 AM
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <label className="text-xs font-semibold text-ink-700">Custom Date and Time</label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                className="bg-paper-50 border border-paper-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-accent-400"
              />
            </div>

            {/* Live Preview Card */}
            {schedulePreview && (
              <div
                className={`p-3 rounded-xl border text-xs mb-6 ${
                  schedulePreview.isValid
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-900 font-medium'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-900 font-medium'
                }`}
              >
                {schedulePreview.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-xs font-medium text-ink-700 hover:text-ink-900 rounded-xl hover:bg-paper-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={!scheduleDateTime || !schedulePreview?.isValid}
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
