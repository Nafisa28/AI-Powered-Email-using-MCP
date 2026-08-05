import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { History, ShieldCheck, Mail, RefreshCw, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

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
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-400" />
            Email Audit History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutably recorded audit logs of all outgoing email transactions via MCP.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No audit logs recorded yet</h3>
          <p className="text-xs text-slate-500 mt-1">Logs are automatically written whenever emails are dispatched through MCP tools.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Recipient</th>
                <th className="py-3.5 px-6">Subject</th>
                <th className="py-3.5 px-6">Provider Account</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-slate-200 font-medium">{log.recipient}</td>
                  <td className="py-4 px-6 text-slate-100 font-semibold">{log.subject}</td>
                  <td className="py-4 px-6 text-slate-400">
                    {log.emailAccount?.providerEmail || log.emailAccountId}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-[10px] uppercase border ${
                        log.status === 'SENT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {log.status === 'SENT' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
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
