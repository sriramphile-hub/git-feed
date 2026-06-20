'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { TwitterLogo, ToggleLeft, ToggleRight, Plus, Trash, Globe, Key, ShieldCheck, Heart } from '@phosphor-icons/react';

interface CompanyHandle {
  id: string;
  handle: string;
  display_name: string | null;
  is_active: boolean;
  consecutive_failures: number;
  last_scraped_at: string | null;
}

interface Tweet {
  id: string;
  company_handle: string;
  tweet_text: string;
  published_at: string | null;
}

export default function TweetsScraperManager() {
  const [handles, setHandles] = useState<CompanyHandle[]>([]);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [tweetsEnabled, setTweetsEnabled] = useState(true);
  
  // Scraper config inputs
  const [rsshubUrl, setRsshubUrl] = useState('');
  const [rsshubCookies, setRsshubCookies] = useState('');
  
  // New handle inputs
  const [newHandle, setNewHandle] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  
  const [updating, setUpdating] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get scraper settings
      const { data: configData } = await supabase
        .from('app_config')
        .select('*');

      if (configData) {
        const enabled = configData.find((c) => c.key === 'tweets_enabled')?.value === 'true';
        const url = configData.find((c) => c.key === 'rsshub_url')?.value || '';
        const cookies = configData.find((c) => c.key === 'rsshub_cookies')?.value || '';
        
        setTweetsEnabled(enabled);
        setRsshubUrl(url);
        setRsshubCookies(cookies);
      }

      // 2. Fetch AI company handles
      const { data: handleData, error: hErr } = await supabase
        .from('ai_company_handles')
        .select('*')
        .order('handle', { ascending: true });

      if (hErr) throw hErr;
      setHandles(handleData || []);

      // 3. Fetch recent scraped tweets
      const { data: tweetData, error: tErr } = await supabase
        .from('tweets')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(10);

      if (tErr) throw tErr;
      setTweets(tweetData || []);

    } catch (err) {
      console.error('Error loading tweet scraper data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleScraper = async () => {
    setUpdating(true);
    const nextVal = !tweetsEnabled;
    setTweetsEnabled(nextVal);
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'tweets_enabled', value: String(nextVal) });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update app config:', err);
      setTweetsEnabled(!nextVal);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await Promise.all([
        supabase.from('app_config').upsert({ key: 'rsshub_url', value: rsshubUrl.trim() }),
        supabase.from('app_config').upsert({ key: 'rsshub_cookies', value: rsshubCookies.trim() }),
      ]);
      alert('Scraper configuration saved!');
      fetchData();
    } catch (err) {
      console.error('Failed to save scraper config:', err);
      alert('Error saving configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleHandle = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_company_handles')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Failed to toggle handle:', err);
    }
  };

  const handleAddHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    let formattedHandle = newHandle.trim();
    if (!formattedHandle.startsWith('@')) {
      formattedHandle = `@${formattedHandle}`;
    }

    try {
      const { error } = await supabase
        .from('ai_company_handles')
        .insert({
          handle: formattedHandle,
          display_name: newDisplayName.trim() || null,
          is_active: true,
        });

      if (error) throw error;
      setNewHandle('');
      setNewDisplayName('');
      fetchData();
    } catch (err) {
      console.error('Failed to add handle:', err);
      alert('Error registering handle. Make sure it is unique.');
    }
  };

  const handleDeleteHandle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scrape target?')) return;

    try {
      const { error } = await supabase
        .from('ai_company_handles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Failed to delete handle:', err);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-black tracking-widest font-mono text-white">AI TWITTER SCRAPER</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">MANAGE X/TWITTER FEED INGESTION TARGETS AND RSSHUB COOKIES</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scraper Status & Settings */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">GLOBAL STATUS</span>
                <h3 className="text-sm font-black font-mono text-white mt-1">SCRAPER SYSTEM</h3>
              </div>
              <button
                onClick={handleToggleScraper}
                disabled={updating}
                className={`p-1 rounded ${tweetsEnabled ? 'text-blue-500' : 'text-slate-600'}`}
              >
                {tweetsEnabled ? <ToggleRight size={28} weight="fill" /> : <ToggleLeft size={28} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-4">
              IF OFF, CLOUDFLARE SCRAPER CRON WILL AUTOMATICALLY ABORT ON-RUN TO SAVE BANDWIDTH.
            </p>
          </div>

          {/* Config form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xs font-bold font-mono text-white tracking-widest mb-4">RSSHUB CONNECTION</h3>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">RSSHUB INSTANCE URL</label>
                <input
                  type="text"
                  value={rsshubUrl}
                  onChange={(e) => setRsshubUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">X/TWITTER COOKIES (WEBAPI AUTH)</label>
                <textarea
                  rows={3}
                  value={rsshubCookies}
                  onChange={(e) => setRsshubCookies(e.target.value)}
                  placeholder="twid=u%3D...; auth_token=..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-bold tracking-widest font-mono transition-all"
              >
                {savingConfig ? 'SAVING...' : 'SAVE CONFIGURATION'}
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Ingestion Targets (Handles) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xs font-bold font-mono text-white tracking-widest mb-4">SCRAPE TARGETS (AI COMPANIES)</h3>
            
            {loading ? (
              <div className="py-10 flex justify-center">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></span>
              </div>
            ) : (
              <div className="space-y-3">
                {handles.map((h) => (
                  <div key={h.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{h.handle}</span>
                        {h.display_name && (
                          <span className="text-[10px] text-slate-500">({h.display_name})</span>
                        )}
                        {h.consecutive_failures > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-bold font-mono rounded">
                            FAILURES: {h.consecutive_failures}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono mt-1">
                        LAST INGESTION: {h.last_scraped_at ? new Date(h.last_scraped_at).toLocaleString() : 'NEVER'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleHandle(h.id, h.is_active)}
                        className={`p-1 rounded ${h.is_active ? 'text-blue-500' : 'text-slate-600'}`}
                      >
                        {h.is_active ? <ToggleRight size={24} weight="fill" /> : <ToggleLeft size={24} />}
                      </button>
                      <button
                        onClick={() => handleDeleteHandle(h.id)}
                        className="p-2 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Handle form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xs font-bold font-mono text-white tracking-widest mb-4">ADD TARGET SCRAPE ACCOUNT</h3>
            <form onSubmit={handleAddHandle} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">X HANDLE (e.g. @OpenAI)</label>
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="@OpenAI"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">COMPANY NAME</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="OpenAI"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-bold tracking-widest font-mono transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                REGISTER TARGET
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
