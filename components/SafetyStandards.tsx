
import React, { useState } from 'react';
import { searchSafetyStandards } from '../services/geminiService';
import { GroundingSource } from '../types';

const SafetyStandards: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ text: string, sources: GroundingSource[] } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await searchSafetyStandards(query);
      setResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xl text-center">
        <h2 className="text-3xl font-bold mb-4">Official Safety Search</h2>
        <p className="text-slate-500 mb-8 max-w-2xl mx-auto">
          Query OSHA standards, environmental regulations, and silent hazard definitions using Google Search-grounded AI.
        </p>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., forklift ergonomic standards 2024"
            className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner bg-slate-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500">Grounding results with Google Search...</p>
        </div>
      )}

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Safety Guidance</h3>
              {results.text}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Verified Sources</h3>
              <div className="space-y-3">
                {results.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-xl border border-slate-100 hover:border-amber-500 hover:bg-amber-50 transition-all group"
                  >
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 truncate">{source.title}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate">{source.uri}</p>
                  </a>
                ))}
                {results.sources.length === 0 && (
                  <p className="text-slate-400 text-sm italic">No external sources cited.</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl text-white">
              <h4 className="font-bold mb-2">Pro Tip</h4>
              <p className="text-sm text-slate-400">
                Always cross-reference AI-generated guidance with your local site supervisor and official printed manuals.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyStandards;
