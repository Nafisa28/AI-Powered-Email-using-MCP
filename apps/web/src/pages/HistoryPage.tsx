import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { History, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/emails/logs');
      setLogs(res.data || []);
    } catch (err) {
      console.error('[Fetch Logs Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-accent-500" />
            Email Audit History
          </h1>
          <p className="text-sm text-ink-700 mt-1">
            Immutably recorded audit logs of all outgoing email transactions via MCP.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-paper-100 hover:bg-paper-200 border border-paper-200 text-ink-700 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-12 text-center text-ink-700">
          <RefreshCw className="w-8 h-8 text-accent-500 animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-12 text-center text-ink-700">
          <ShieldCheck className="w-10 h-10 text-ink-700/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-ink-900">No audit logs recorded yet</h3>
          <p className="text-xs text-ink-700 mt-1">Logs are automatically written whenever emails are dispatched through MCP tools.</p>
        </div>
      ) : (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-paper-50 border-b border-paper-200 text-[11px] font-semibold uppercase text-ink-700 tracking-wider">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Recipient</th>
                <th className="py-3.5 px-6">Subject</th>
                <th className="py-3.5 px-6">Provider Account</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200 text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-paper-200/50 transition-colors">
                  <td className="py-4 px-6 text-ink-700 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-ink-900 font-medium">{log.recipient}</td>
                  <td className="py-4 px-6 text-ink-900 font-semibold">{log.subject}</td>
                  <td className="py-4 px-6 text-ink-700">
                    {log.emailAccount?.providerEmail || log.emailAccountId}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-[10px] uppercase border ${
                        log.status === 'SENT'
                          ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-800 border-rose-500/30'
                      }`}
                    >
                      {log.status === 'SENT' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-rose-600" />}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
