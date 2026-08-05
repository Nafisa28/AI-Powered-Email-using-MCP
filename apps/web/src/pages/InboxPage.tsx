import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SummarizeModal } from '../components/SummarizeModal';
import { Inbox, Search, Sparkles, RefreshCw, Mail, Calendar, User } from 'lucide-react';

export const InboxPage: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Summarizer modal states
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any | null>(null);
  const [showSummarizeModal, setShowSummarizeModal] = useState(false);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await api.get('/emails/inbox');
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error('[Fetch Inbox Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchInbox();
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(`/emails/search?q=${encodeURIComponent(searchQuery)}`);
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error('[Search Error]', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSummarize = async (msg: any) => {
    setSelectedMessage(msg);
    setShowSummarizeModal(true);
    setIsSummarizing(true);
    setSummaryResult(null);

    try {
      const res = await api.post('/ai/summarize', {
        emails: [
          {
            from: msg.from,
            subject: msg.subject,
            body: msg.body || msg.snippet,
            date: msg.date
          }
        ]
      });
      setSummaryResult(res.data);
    } catch (err) {
      console.error('[Summarize Error]', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-accent-500" />
            Connected Inbox
          </h1>
          <p className="text-sm text-ink-700 mt-1">
            Real-time messages fetched through your MCP Gmail/Outlook tool server.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-ink-700 absolute left-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails via MCP..."
              className="bg-paper-50 border border-paper-200 focus:border-accent-400 rounded-xl pl-10 pr-4 py-2 text-xs text-ink-900 placeholder-ink-700/50 focus:outline-none w-64 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={fetchInbox}
            className="p-2 bg-paper-100 hover:bg-paper-200 border border-paper-200 text-ink-700 rounded-xl transition-colors"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {loading || isSearching ? (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-12 text-center text-ink-700 flex flex-col items-center">
          <RefreshCw className="w-8 h-8 text-accent-500 animate-spin mb-3" />
          <p className="text-sm">Fetching inbox messages via MCP Server...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-12 text-center text-ink-700">
          <Mail className="w-10 h-10 text-ink-700/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-ink-900">No emails found</h3>
          <p className="text-xs text-ink-700 mt-1">Connect your Gmail or Outlook account in Settings to sync live emails.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-paper-100 hover:bg-paper-200/70 border border-paper-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-ink-900 bg-accent-400/20 px-2.5 py-0.5 rounded-md border border-accent-400/40 flex items-center gap-1">
                    <User className="w-3 h-3 text-accent-500" />
                    {msg.from || 'Unknown Sender'}
                  </span>
                  <span className="text-[11px] text-ink-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(msg.date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-ink-900 group-hover:text-accent-500 transition-colors">
                  {msg.subject || '(No Subject)'}
                </h3>
                <p className="text-xs text-ink-700 line-clamp-2 leading-relaxed">
                  {msg.snippet || msg.body}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => handleSummarize(msg)}
                  className="px-3.5 py-2 text-xs font-semibold bg-accent-400 hover:bg-accent-500 text-ink-900 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Summarize
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SummarizeModal
        isOpen={showSummarizeModal}
        onClose={() => setShowSummarizeModal(false)}
        summaryData={summaryResult}
        loading={isSummarizing}
      />
    </div>
  );
};
