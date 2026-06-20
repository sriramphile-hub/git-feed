'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { PencilSimple, Trash, Sparkle, Globe, Star, CheckCircle, Warning } from '@phosphor-icons/react';

interface RepoSummary {
  hook_title: string;
  short_summary: string;
  difficulty_level: string | null;
}

interface Repository {
  id: number;
  repo_name: string;
  description: string | null;
  primary_language: string;
  stars: number;
  thumbnail_url: string | null;
  is_featured: boolean;
  ai_summaries: RepoSummary[] | RepoSummary | null;
}

export default function RepositoriesManager() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  
  // Edit Form Fields
  const [editHookTitle, setEditHookTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('repositories')
        .select(`
          *,
          ai_summaries (
            hook_title,
            short_summary,
            difficulty_level
          )
        `)
        .order('stars', { ascending: false });

      if (error) throw error;
      setRepos(data || []);
    } catch (err) {
      console.error('Error fetching repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleEditClick = (repo: Repository) => {
    setSelectedRepo(repo);
    
    const summary = Array.isArray(repo.ai_summaries)
      ? repo.ai_summaries[0]
      : repo.ai_summaries;
      
    setEditHookTitle(summary?.hook_title || '');
    setEditSummary(summary?.short_summary || '');
    setEditThumbnailUrl(repo.thumbnail_url || '');
    setEditIsFeatured(repo.is_featured);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;

    setSaving(true);
    try {
      // 1. Update repo table (thumbnail, is_featured)
      const { error: repoErr } = await supabase
        .from('repositories')
        .update({
          thumbnail_url: editThumbnailUrl.trim() || null,
          is_featured: editIsFeatured,
        })
        .eq('id', selectedRepo.id);

      if (repoErr) throw repoErr;

      // 2. Update summaries table
      const summary = Array.isArray(selectedRepo.ai_summaries)
        ? selectedRepo.ai_summaries[0]
        : selectedRepo.ai_summaries;

      if (summary) {
        const { error: sumErr } = await supabase
          .from('ai_summaries')
          .update({
            hook_title: editHookTitle.trim(),
            short_summary: editSummary.trim(),
            is_edited: true,
          })
          .eq('repository_id', selectedRepo.id);

        if (sumErr) throw sumErr;
      } else {
        // If no summary exists, insert a default one
        const { error: insErr } = await supabase
          .from('ai_summaries')
          .insert({
            repository_id: selectedRepo.id,
            hook_title: editHookTitle.trim(),
            short_summary: editSummary.trim(),
            is_edited: true,
          });

        if (insErr) throw insErr;
      }

      setSelectedRepo(null);
      fetchRepos();
    } catch (err) {
      console.error('Failed to save repository updates:', err);
      alert('Error saving updates.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (repoId: number) => {
    setRegeneratingId(repoId);
    try {
      const response = await fetch('/api/admin/regenerate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate');
      alert('Summary regenerated successfully!');
      fetchRepos();
    } catch (err: any) {
      alert(err.message || 'Error occurred during summary regeneration.');
    } finally {
      setRegeneratingId(null);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.repo_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-widest font-mono text-white">REPOSITORIES MANAGER</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">EDIT METADATA, FEATURE SETS, AND AI SUMMARIES</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="SEARCH REPOSITORY BY NAME..."
          className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Table Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></span>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 font-mono">NO REPOSITORIES RECORDED</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 tracking-wider font-mono bg-slate-900/50">
                <th className="p-4">REPOSITORY</th>
                <th className="p-4">STATS</th>
                <th className="p-4">HOOK TITLE</th>
                <th className="p-4">FEATURED</th>
                <th className="p-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRepos.map((repo) => {
                const summary = Array.isArray(repo.ai_summaries)
                  ? repo.ai_summaries[0]
                  : repo.ai_summaries;

                return (
                  <tr key={repo.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-white text-xs">{repo.repo_name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 max-w-xs truncate">{repo.description || 'No description'}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                        <Star size={12} className="text-yellow-500" weight="fill" />
                        <span>{repo.stars.toLocaleString()}</span>
                        <span className="text-slate-600">|</span>
                        <span>{repo.primary_language || 'UNKNOWN'}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-sm">
                      <div className="text-xs text-slate-300 line-clamp-1">{summary?.hook_title || 'No AI hook generated yet.'}</div>
                    </td>
                    <td className="p-4">
                      {repo.is_featured ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[8px] font-bold font-mono">
                          FEATURED
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-600 font-mono">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleRegenerate(repo.id)}
                          disabled={regeneratingId === repo.id}
                          className="p-2 border border-slate-800 hover:border-purple-500/30 hover:bg-purple-500/5 text-purple-400 rounded-lg transition-all"
                          title="Regenerate Summary"
                        >
                          <Sparkle size={14} className={regeneratingId === repo.id ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={() => handleEditClick(repo)}
                          className="p-2 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-blue-400 rounded-lg transition-all"
                          title="Edit Details"
                        >
                          <PencilSimple size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal Dialog */}
      {selectedRepo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
            
            <h2 className="text-sm font-bold font-mono text-white tracking-widest mb-4">EDIT REPOSITORY CONFIGURATION</h2>
            <p className="text-[10px] text-slate-500 font-mono mb-6">{selectedRepo.repo_name.toUpperCase()}</p>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">AI HOOK TITLE</label>
                <input
                  type="text"
                  value={editHookTitle}
                  onChange={(e) => setEditHookTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">AI SUMMARY</label>
                <textarea
                  rows={4}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">THUMBNAIL URL</label>
                <input
                  type="text"
                  value={editThumbnailUrl}
                  onChange={(e) => setEditThumbnailUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={editIsFeatured}
                  onChange={(e) => setEditIsFeatured(e.target.checked)}
                  className="w-4 h-4 bg-slate-950 border-slate-800 rounded text-blue-600 focus:ring-0"
                />
                <label htmlFor="featured" className="text-[10px] font-bold text-slate-400 tracking-wider font-mono cursor-pointer">
                  MARK AS FEATURED (PIN TO FEED TOP)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRepo(null)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold font-mono tracking-wider rounded-lg transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono tracking-wider rounded-lg transition-all"
                >
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
