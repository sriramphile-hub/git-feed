'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Trash, FolderSimple, Gear, Check, Code } from '@phosphor-icons/react';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  color: string | null;
  is_official: boolean;
  repo_count: number;
}

interface Repository {
  id: number;
  repo_name: string;
}

export default function CollectionsManager() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected collection details
  const [selectedColId, setSelectedColId] = useState<string>('');
  const [colRepos, setColRepos] = useState<number[]>([]);
  const [linkingRepo, setLinkingRepo] = useState(false);

  // New Collection Form
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colIcon, setColIcon] = useState('FolderSimple');
  const [colColor, setColColor] = useState('#3D7EFF');
  const [colIsOfficial, setColIsOfficial] = useState(true);
  const [addingCol, setAddingCol] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Collections
      const { data: cols } = await supabase
        .from('collections')
        .select('*')
        .order('is_official', { ascending: false })
        .order('name', { ascending: true });

      setCollections(cols || []);

      if (cols && cols.length > 0) {
        const defaultColId = cols[0].id;
        setSelectedColId((prev) => prev || defaultColId);
      }

      // 2. Fetch Repos list for selector
      const { data: repositoryList } = await supabase
        .from('repositories')
        .select('id, repo_name')
        .order('repo_name', { ascending: true });

      setRepos(repositoryList || []);
    } catch (err) {
      console.error('Error fetching collections data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch linked repositories for selected collection
  useEffect(() => {
    if (!selectedColId) return;

    const fetchColRepos = async () => {
      try {
        const { data } = await supabase
          .from('collection_repositories')
          .select('repository_id')
          .eq('collection_id', selectedColId);

        setColRepos((data || []).map((d) => d.repository_id));
      } catch (err) {
        console.error('Error loading collection repos:', err);
      }
    };

    fetchColRepos();
  }, [selectedColId]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) return;

    setAddingCol(true);
    try {
      const { error } = await supabase
        .from('collections')
        .insert({
          name: colName.trim(),
          description: colDesc.trim() || null,
          icon_name: colIcon,
          color: colColor,
          is_official: colIsOfficial,
        });

      if (error) throw error;
      setColName('');
      setColDesc('');
      fetchData();
    } catch (err) {
      console.error('Failed to create collection:', err);
      alert('Error creating collection.');
    } finally {
      setAddingCol(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (selectedColId === id) setSelectedColId('');
      fetchData();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const handleToggleRepoLink = async (repoId: number) => {
    if (!selectedColId) return;
    setLinkingRepo(true);
    
    const isLinked = colRepos.includes(repoId);
    try {
      if (isLinked) {
        // Delete link
        const { error } = await supabase
          .from('collection_repositories')
          .delete()
          .eq('collection_id', selectedColId)
          .eq('repository_id', repoId);

        if (error) throw error;
        setColRepos((prev) => prev.filter((id) => id !== repoId));
      } else {
        // Add link
        const { error } = await supabase
          .from('collection_repositories')
          .insert({
            collection_id: selectedColId,
            repository_id: repoId,
          });

        if (error) throw error;
        setColRepos((prev) => [...prev, repoId]);
      }

      // Update repo_count on collection table
      const { count } = await supabase
        .from('collection_repositories')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', selectedColId);

      await supabase
        .from('collections')
        .update({ repo_count: count || 0 })
        .eq('id', selectedColId);

      // Refresh list metadata
      const { data: cols } = await supabase
        .from('collections')
        .select('*')
        .order('is_official', { ascending: false })
        .order('name', { ascending: true });
      if (cols) setCollections(cols);

    } catch (err) {
      console.error('Failed to link/unlink repo:', err);
    } finally {
      setLinkingRepo(false);
    }
  };

  const activeCollection = collections.find((c) => c.id === selectedColId);

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-black tracking-widest font-mono text-white">COLLECTIONS MANAGER</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">CREATE CURATED LISTS AND BIND CHOSEN OSS REPOSITORIES</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Collections List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <FolderSimple size={18} className="text-blue-500" />
            <h2 className="text-xs font-bold font-mono text-white tracking-widest">CURATED FOLDERS</h2>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></span>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedColId === col.id
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="truncate">{col.name.toUpperCase()}</span>
                    <span className="text-[8px] opacity-60 font-mono">{col.repo_count} REPOS</span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(col.id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Collection form */}
          <form onSubmit={handleCreateCollection} className="border-t border-slate-800 pt-4 mt-6 space-y-3">
            <h3 className="text-[10px] font-bold font-mono text-white tracking-widest">NEW COLLECTION</h3>
            <input
              type="text"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              placeholder="COLLECTION NAME..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
              required
            />
            <input
              type="text"
              value={colDesc}
              onChange={(e) => setColDesc(e.target.value)}
              placeholder="DESCRIPTION..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={addingCol}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold font-mono tracking-wider rounded-lg transition-all flex items-center justify-center gap-1"
            >
              <Plus size={12} />
              CREATE
            </button>
          </form>
        </div>

        {/* Right: Repository Binder Picker */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
            <Code size={18} className="text-blue-500" />
            <h2 className="text-xs font-bold font-mono text-white tracking-widest">
              {activeCollection ? `BIND REPOSITORIES TO "${activeCollection.name.toUpperCase()}"` : 'REPOSITORY BINDER'}
            </h2>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></span>
            </div>
          ) : !selectedColId ? (
            <div className="py-10 text-center text-xs text-slate-500 font-mono">SELECT A COLLECTION ON THE LEFT</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {repos.map((repo) => {
                const isLinked = colRepos.includes(repo.id);
                return (
                  <button
                    key={repo.id}
                    onClick={() => handleToggleRepoLink(repo.id)}
                    disabled={linkingRepo}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs font-mono transition-all text-left ${
                      isLinked
                        ? 'bg-blue-900/10 border-blue-500/30 text-blue-400 font-bold'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="truncate flex-1 pr-2">{repo.repo_name}</span>
                    <span className="flex-shrink-0">
                      {isLinked && <Check size={14} className="text-blue-400" weight="bold" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
