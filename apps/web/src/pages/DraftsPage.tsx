import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, Edit, RefreshCw } from 'lucide-react';

export const DraftsPage: React.FC = () => {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/drafts');
      setDrafts(res.data || []);
    } catch (err) {
      console.error('[Fetch Drafts Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/drafts/${id}`);
      setDrafts(drafts.filter((d) => d.id !== id));
    } catch (err) {
      console.error('[Delete Draft Error]', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-400" />
            Saved Drafts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Auto-saved and manually saved email drafts ready for refinement.
          </p>
        </div>

        <button
          onClick={fetchDrafts}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading drafts...</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No saved drafts</h3>
          <p className="text-xs text-slate-500 mt-1">Drafts automatically save every ~10 seconds while composing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {d.status}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Updated {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 line-clamp-1">
                  {d.subject || '(No Subject)'}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {d.body}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => navigate('/', { state: { draft: d } })}
                  className="text-xs text-indigo-400 font-medium hover:text-indigo-300 flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Draft
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete Draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
