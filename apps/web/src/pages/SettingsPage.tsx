import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Settings, ShieldCheck, Mail, Plus, CheckCircle2, AlertCircle, Trash2, Sliders } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic configuration states
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleRedirectUri, setGoogleRedirectUri] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');

  // Fetch current configs on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/oauth/config');
        setGoogleClientId(res.data.googleClientId || '');
        setGoogleClientSecret(res.data.googleClientSecret || '');
        setGoogleRedirectUri(res.data.googleRedirectUri || '');
        setAnthropicApiKey(res.data.anthropicApiKey || '');
      } catch (err) {
        console.error('[Fetch Config Error]', err);
      }
    };
    fetchConfig();
  }, []);

  const handleConnectGoogleOAuth = async () => {
    try {
      const res = await api.get('/oauth/google/url');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      console.error('[Google OAuth Error]', err);
      setMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to generate authorization URL. Please ensure your Google App details are configured below.'
      });
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!window.confirm('Are you sure you want to disconnect this email account? This will remove all linked logs and configuration.')) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await api.delete(`/oauth/accounts/${id}`);
      await refreshUser();
      setMessage({ type: 'success', text: 'Email account disconnected successfully.' });
    } catch (err: any) {
      console.error('[Disconnect Error]', err);
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to disconnect account' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/oauth/config', {
        googleClientId,
        googleClientSecret,
        googleRedirectUri,
        anthropicApiKey
      });
      setMessage({ type: 'success', text: 'System configuration updated successfully.' });
    } catch (err: any) {
      console.error('[Save Config Error]', err);
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to update system credentials.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-accent-500" />
          Settings & Credentials
        </h1>
        <p className="text-sm text-ink-700 mt-1">
          Configure app client credentials and linked email accounts. OAuth tokens are encrypted at rest with AES-256-GCM.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center gap-2.5 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Connected Accounts Section */}
      <div className="bg-paper-100 border border-paper-200 rounded-2xl p-6 shadow-xl mb-8">
        <h2 className="text-base font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Connected Email Accounts (MCP Providers)
        </h2>

        {!user?.emailAccounts || user.emailAccounts.length === 0 ? (
          <div className="bg-paper-50 border border-paper-200 rounded-xl p-6 text-center text-ink-700">
            <Mail className="w-8 h-8 text-ink-700/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-ink-900">No email provider accounts connected yet</p>
            <p className="text-xs text-ink-700 mt-1">Connect your Gmail account below. Requires configuring Google Developer OAuth parameters first.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {user.emailAccounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-paper-50 p-4 rounded-xl border border-paper-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    acc.provider === 'GMAIL' ? 'bg-rose-500/10 text-rose-700 border border-rose-500/20' : 'bg-sky-500/10 text-sky-700 border border-sky-500/20'
                  }`}>
                    {acc.provider === 'GMAIL' ? 'G' : 'MS'}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink-900">{acc.providerEmail}</h4>
                    <span className="text-[11px] text-ink-700">
                      {acc.provider} • Connected {new Date(acc.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Active via MCP
                  </span>
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    disabled={loading}
                    className="p-1.5 text-ink-700 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="Disconnect Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect New Account Section */}
      <div className="bg-paper-100 border border-paper-200 rounded-2xl p-6 shadow-xl mb-8 flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold text-ink-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent-500" />
            Connect Email Account
          </h2>
          <p className="text-xs text-ink-700 mt-0.5">Authorize real OAuth 2.0 access to connect your account to Flymail.</p>
        </div>

        {/* Real OAuth Button */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-paper-50 rounded-xl border border-paper-200">
          <button
            onClick={handleConnectGoogleOAuth}
            className="flex-1 py-3 px-4 bg-paper-100 hover:bg-paper-200 border border-paper-200 rounded-xl text-xs font-semibold text-ink-900 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-[10px]">G</span>
            Connect Google / Gmail OAuth 2.0
          </button>
        </div>
      </div>

      {/* Dynamic API & Credentials Configurations Form */}
      <form onSubmit={handleSaveConfig} className="bg-paper-100 border border-paper-200 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
        <div className="flex items-center gap-2 pb-2 border-b border-paper-200">
          <Sliders className="w-5 h-5 text-accent-500" />
          <div>
            <h2 className="text-base font-semibold text-ink-900">App Credentials Configuration</h2>
            <p className="text-xs text-ink-700 mt-0.5">Configure Client IDs and API keys. Changes save directly to root <code>.env</code> file.</p>
          </div>
        </div>

        {/* Google OAuth client credentials */}
        <div className="flex flex-col gap-4 bg-paper-50 p-4 rounded-xl border border-paper-200">
          <h3 className="text-xs font-semibold text-accent-500 uppercase tracking-wider">Google Developer Console Settings</h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-700">Google Client ID</label>
            <input
              type="text"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              placeholder="e.g. xxxxxxxx.apps.googleusercontent.com"
              className="bg-paper-100 border border-paper-200 focus:border-accent-400 rounded-xl px-3.5 py-2 text-xs text-ink-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-700">Google Client Secret</label>
            <input
              type="password"
              value={googleClientSecret}
              onChange={(e) => setGoogleClientSecret(e.target.value)}
              placeholder="Google Client Secret Key"
              className="bg-paper-100 border border-paper-200 focus:border-accent-400 rounded-xl px-3.5 py-2 text-xs text-ink-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-700">Authorized Redirect URI</label>
            <input
              type="text"
              value={googleRedirectUri}
              onChange={(e) => setGoogleRedirectUri(e.target.value)}
              placeholder="e.g. http://localhost:5000/api/oauth/google/callback"
              className="bg-paper-100 border border-paper-200 focus:border-accent-400 rounded-xl px-3.5 py-2 text-xs text-ink-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Anthropic Claude API configuration */}
        <div className="flex flex-col gap-4 bg-paper-50 p-4 rounded-xl border border-paper-200">
          <h3 className="text-xs font-semibold text-accent-500 uppercase tracking-wider">AI Layer configuration</h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-700">Anthropic Claude API Key</label>
            <input
              type="password"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="bg-paper-100 border border-paper-200 focus:border-accent-400 rounded-xl px-3.5 py-2 text-xs text-ink-900 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-accent-400 hover:bg-accent-500 text-ink-900 text-xs font-semibold rounded-xl shadow-lg shadow-accent-400/20 transition-all"
        >
          {loading ? 'Saving Configurations...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
};
