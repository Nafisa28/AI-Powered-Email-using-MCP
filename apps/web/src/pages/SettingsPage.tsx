import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Settings, ShieldCheck, Mail, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [mockEmail, setMockEmail] = useState('');
  const [mockProvider, setMockProvider] = useState<'GMAIL' | 'OUTLOOK'>('GMAIL');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConnectGoogleOAuth = async () => {
    try {
      const res = await api.get('/oauth/google/url');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('[Google OAuth Error]', err);
      setMessage({ type: 'error', text: 'Failed to initiate Google OAuth flow' });
    }
  };

  const handleMockConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockEmail) return;
    setLoading(true);
    setMessage(null);

    try {
      await api.post('/oauth/connect-mock', {
        provider: mockProvider,
        providerEmail: mockEmail
      });
      await refreshUser();
      setMessage({ type: 'success', text: `Connected ${mockProvider} account (${mockEmail}) successfully!` });
      setMockEmail('');
    } catch (err) {
      console.error('[Connect Mock Error]', err);
      setMessage({ type: 'error', text: 'Failed to connect email account' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          Settings & Account Connections
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage linked email accounts. OAuth tokens are encrypted at rest with AES-256-GCM.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center gap-2.5 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Connected Accounts Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
        <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Connected Email Accounts (MCP Providers)
        </h2>

        {!user?.emailAccounts || user.emailAccounts.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400">
            <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium">No email provider accounts connected yet</p>
            <p className="text-xs text-slate-500 mt-1">Connect your Gmail or Outlook account below to enable email sending and reading via MCP.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {user.emailAccounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    acc.provider === 'GMAIL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  }`}>
                    {acc.provider === 'GMAIL' ? 'G' : 'MS'}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">{acc.providerEmail}</h4>
                    <span className="text-[11px] text-slate-500">
                      {acc.provider} • Connected {new Date(acc.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active via MCP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect New Account Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            Connect Email Account
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Choose real OAuth 2.0 or local development mock connection.</p>
        </div>

        {/* Real OAuth Button */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <button
            onClick={handleConnectGoogleOAuth}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-semibold text-slate-100 transition-all flex items-center justify-center gap-2"
          >
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-[10px]">G</span>
            Connect Google / Gmail OAuth 2.0
          </button>
        </div>

        {/* Development Mock Connect Form */}
        <form onSubmit={handleMockConnect} className="flex flex-col gap-4 p-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
          <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Quick Connect (Local / Demo Mode)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={mockProvider}
              onChange={(e) => setMockProvider(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="GMAIL">Gmail Provider</option>
              <option value="OUTLOOK">Microsoft Outlook</option>
            </select>

            <input
              type="email"
              required
              value={mockEmail}
              onChange={(e) => setMockEmail(e.target.value)}
              placeholder="user@domain.com"
              className="sm:col-span-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !mockEmail}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-40"
          >
            {loading ? 'Connecting...' : `Connect ${mockProvider} Account`}
          </button>
        </form>
      </div>
    </div>
  );
};
