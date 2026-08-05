import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Clock, Trash2, Calendar, RefreshCw } from 'lucide-react';

export const ScheduledPage: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedule');
      setSchedules(res.data || []);
    } catch (err) {
      console.error('[Fetch Schedules Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCancelSchedule = async (id: string) => {
    try {
      await api.delete(`/schedule/${id}`);
      setSchedules(schedules.filter((s) => s.id !== id));
    } catch (err) {
      console.error('[Cancel Schedule Error]', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-sky-600" />
            Scheduled Queue
          </h1>
          <p className="text-sm text-ink-700 mt-1">
            Automated emails queued for delivery via background cron runner.
          </p>
        </div>

        <button
          onClick={fetchSchedules}
          className="p-2 bg-paper-100 hover:bg-paper-200 border border-paper-200 text-ink-700 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-12 text-center text-ink-700">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading scheduled queue...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-paper-100 border border-paper-200 rounded-2xl p-12 text-center text-ink-700">
          <Clock className="w-10 h-10 text-ink-700/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-ink-900">No scheduled emails</h3>
          <p className="text-xs text-ink-700 mt-1">Schedule drafts from the Compose screen to send later.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="bg-paper-100 border border-paper-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      s.status === 'PENDING'
                        ? 'bg-sky-500/10 text-sky-800 border-sky-500/30'
                        : s.status === 'EXECUTED'
                        ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-800 border-rose-500/30'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-xs text-ink-700 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    Scheduled for: {new Date(s.sendAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-ink-900 mt-1">
                  {s.draft?.subject || '(No Subject)'}
                </h3>
                <p className="text-xs text-ink-700 line-clamp-1">{s.draft?.body}</p>
              </div>

              {s.status === 'PENDING' && (
                <button
                  onClick={() => handleCancelSchedule(s.id)}
                  className="px-3 py-1.5 text-xs text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all flex items-center gap-1.5 shrink-0 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel Schedule
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
