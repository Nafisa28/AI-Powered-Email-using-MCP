import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Send, RefreshCw, Mail, Calendar, User } from 'lucide-react';

export const SentPage: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSent = async () => {
    setLoading(true);
    try {
      const res = await api.get('/emails/sent');
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error('[Fetch Sent Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSent();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            <Send className="w-6 h-6 text-accent-500" />
            Sent Messages
          </h1>
          <p className="text-sm text-ink-700 mt-1">
            Outbound email log dispatched through MCP tools.
          </p>
        </div>

        <button
          onClick={fetchSent}
          className="p-2 bg-paper-100 hover:bg-paper-200 border border-paper-200 text-ink-700 rounded-xl transition-colors"
          title="Refresh Sent"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-12 text-center text-ink-700 flex flex-col items-center">
          <RefreshCw className="w-8 h-8 text-accent-500 animate-spin mb-3" />
          <p className="text-sm">Fetching sent emails via MCP Server...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-12 text-center text-ink-700">
          <Mail className="w-10 h-10 text-ink-700/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-ink-900">No sent messages yet</h3>
          <p className="text-xs text-ink-700 mt-1">Sent emails will appear here after being dispatched via MCP.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-paper-100 border border-paper-200 rounded-2xl p-5 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-ink-900 bg-accent-400/20 px-2.5 py-0.5 rounded-md border border-accent-400/40 flex items-center gap-1">
                    <User className="w-3 h-3 text-accent-500" />
                    To: {msg.to || 'Recipient'}
                  </span>
                  <span className="text-[11px] text-ink-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(msg.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <h3 className="text-base font-semibold text-ink-900">
                {msg.subject || '(No Subject)'}
              </h3>
              <p className="text-xs text-ink-700 line-clamp-2 leading-relaxed">
                {msg.snippet || msg.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
