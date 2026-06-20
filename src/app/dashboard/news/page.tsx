'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { PencilSimple, Trash, Globe, Calendar, ArrowClockwise, ShieldCheck } from '@phosphor-icons/react';

interface NewsArticle {
  id: string;
  source: string;
  title: string;
  summary: string | null;
  url: string;
  image_url: string | null;
  published_at: string | null;
  category: string | null;
}

export default function NewsManager() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Edit Form Fields
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Error fetching news articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleEditClick = (article: NewsArticle) => {
    setSelectedArticle(article);
    setEditTitle(article.title);
    setEditSummary(article.summary || '');
    setEditImageUrl(article.image_url || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('news_articles')
        .update({
          title: editTitle.trim(),
          summary: editSummary.trim() || null,
          image_url: editImageUrl.trim() || null,
          is_edited: true,
        })
        .eq('id', selectedArticle.id);

      if (error) throw error;
      setSelectedArticle(null);
      fetchArticles();
    } catch (err) {
      console.error('Failed to update article:', err);
      alert('Error updating article.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('news_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchArticles();
    } catch (err) {
      console.error('Failed to delete article:', err);
      alert('Error deleting article.');
    }
  };

  const filteredArticles = articles.filter((art) => {
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || art.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-widest font-mono text-white">NEWS FEED MANAGER</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">CURATE INGESTED ARTICLES, TOP RELEASES, AND DISCUSSIONS</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="SEARCH BY ARTICLE TITLE OR SOURCE..."
          className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500 transition-colors"
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-400 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
        >
          <option value="All">ALL CATEGORIES</option>
          <option value="top_news">TOP NEWS</option>
          <option value="releases">RELEASES</option>
          <option value="articles">ARTICLES</option>
        </select>
      </div>

      {/* Table Data */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></span>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 font-mono">NO NEWS ARTICLES FOUND</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 tracking-wider font-mono bg-slate-900/50">
                <th className="p-4">SOURCE & CATEGORY</th>
                <th className="p-4">TITLE & SUMMARY</th>
                <th className="p-4">PUBLISHED AT</th>
                <th className="p-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((art) => (
                <tr key={art.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[8px] font-bold font-mono">
                      {art.source.toUpperCase()}
                    </span>
                    <span className="block text-[8px] text-slate-500 mt-1 font-mono">{art.category?.toUpperCase() || '-'}</span>
                  </td>
                  <td className="p-4 max-w-md">
                    <a href={art.url} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-white text-xs hover:text-blue-400 hover:underline transition-all">
                      {art.title}
                    </a>
                    <div className="text-[10px] text-slate-500 mt-1 truncate">{art.summary || 'No summary description.'}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                      <Calendar size={12} />
                      <span>{art.published_at ? new Date(art.published_at).toLocaleDateString() : '-'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => handleEditClick(art)}
                        className="p-2 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-blue-400 rounded-lg transition-all"
                        title="Edit Article"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(art.id)}
                        className="p-2 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 rounded-lg transition-all"
                        title="Delete Article"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
            
            <h2 className="text-sm font-bold font-mono text-white tracking-widest mb-4">EDIT NEWS ARTICLE</h2>
            <p className="text-[10px] text-slate-500 font-mono mb-6">{selectedArticle.source.toUpperCase()} ARTICLE</p>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">TITLE</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">SUMMARY / DESCRIPTION</label>
                <textarea
                  rows={4}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">THUMBNAIL IMAGE URL</label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
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
