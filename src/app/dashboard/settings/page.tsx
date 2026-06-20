'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Gear, ToggleLeft, ToggleRight, Trash, Warning, Sparkle } from '@phosphor-icons/react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [clearing, setClearing] = useState(false);

  // App Configuration States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [tweetsEnabled, setTweetsEnabled] = useState(true);
  const [imagenEnabled, setImagenEnabled] = useState(true);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_config')
        .select('*');

      if (data) {
        setMaintenanceMode(data.find((c) => c.key === 'maintenance_mode')?.value === 'true');
        setTweetsEnabled(data.find((c) => c.key === 'tweets_enabled')?.value === 'true');
        setImagenEnabled(data.find((c) => c.key === 'imagen_enabled')?.value === 'true');
      }
    } catch (err) {
      console.error('Error fetching configuration settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleToggleConfig = async (key: 'maintenance_mode' | 'tweets_enabled' | 'imagen_enabled', currentVal: boolean) => {
    setUpdating(true);
    const nextVal = !currentVal;
    try {
      // Optimistic Update
      if (key === 'maintenance_mode') setMaintenanceMode(nextVal);
      if (key === 'tweets_enabled') setTweetsEnabled(nextVal);
      if (key === 'imagen_enabled') setImagenEnabled(nextVal);

      const { error } = await supabase
        .from('app_config')
        .upsert({ key, value: String(nextVal) });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to save config change:', err);
      // Revert
      if (key === 'maintenance_mode') setMaintenanceMode(currentVal);
      if (key === 'tweets_enabled') setTweetsEnabled(currentVal);
      if (key === 'imagen_enabled') setImagenEnabled(currentVal);
    } finally {
      setUpdating(false);
    }
  };

  const handlePruneStorage = async () => {
    if (!confirm('Are you sure you want to prune old data? This will delete news articles older than 30 days and company tweets older than 14 days.')) {
      return;
    }

    setClearing(true);
    try {
      const response = await fetch('/api/admin/prune-db', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pruning failed');
      alert(data.message || 'Pruning operation completed successfully!');
    } catch (err: any) {
      console.error('Failed to prune database storage:', err);
      alert(err.message || 'Failed to trigger pruning. Service role might not be set.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-8 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-black tracking-widest font-mono text-white">GLOBAL CONFIGURATION</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">EDIT APPLICATION PREFERENCES AND EXECUTE DATABASE MAINTENANCE TASKS</p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Feature Flags Block */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Gear size={18} className="text-blue-500" />
                <h2 className="text-xs font-bold font-mono text-white tracking-widest">APPLICATION TOGGLES</h2>
              </div>

              <div className="space-y-4">
                {/* Maintenance Mode */}
                <div className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div>
                    <span className="block font-mono text-xs font-bold text-white">MAINTENANCE MODE</span>
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Locks user access to the app with a maintenance alert banner.</span>
                  </div>
                  <button
                    onClick={() => handleToggleConfig('maintenance_mode', maintenanceMode)}
                    disabled={updating}
                    className={`p-1 rounded ${maintenanceMode ? 'text-red-500' : 'text-slate-600'}`}
                  >
                    {maintenanceMode ? <ToggleRight size={28} weight="fill" /> : <ToggleLeft size={28} />}
                  </button>
                </div>

                {/* Tweets Enabled */}
                <div className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div>
                    <span className="block font-mono text-xs font-bold text-white">SCRAPE AI COMPANY TWEETS</span>
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Scrapes latest updates from OpenAI, Anthropic, etc.</span>
                  </div>
                  <button
                    onClick={() => handleToggleConfig('tweets_enabled', tweetsEnabled)}
                    disabled={updating}
                    className={`p-1 rounded ${tweetsEnabled ? 'text-blue-500' : 'text-slate-600'}`}
                  >
                    {tweetsEnabled ? <ToggleRight size={28} weight="fill" /> : <ToggleLeft size={28} />}
                  </button>
                </div>

                {/* Imagen Enabled */}
                <div className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div>
                    <span className="block font-mono text-xs font-bold text-white">IMAGEN MEDIA GENERATION</span>
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Generates repository thumbnail cover art using Gemini Imagen.</span>
                  </div>
                  <button
                    onClick={() => handleToggleConfig('imagen_enabled', imagenEnabled)}
                    disabled={updating}
                    className={`p-1 rounded ${imagenEnabled ? 'text-blue-500' : 'text-slate-600'}`}
                  >
                    {imagenEnabled ? <ToggleRight size={28} weight="fill" /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Database Maintenance Panel */}
          <div className="md:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Warning size={18} className="text-yellow-500" />
                <h2 className="text-xs font-bold font-mono text-white tracking-widest">SYSTEM RETENTION CONTROL</h2>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                  EXECUTE MANUAL DATABASE PRUNING ACTIONS TO TRUNCATE EXPIRED CONTENT AND PREVENT SUPABASE CAPACITY FROM HITTING ITS 500MB THRESHOLD.
                </p>

                <div className="border-t border-slate-800/80 pt-4 space-y-2 text-[10px] font-mono text-slate-500">
                  <p>· ARTICLES RETAINED: 30 DAYS</p>
                  <p>· SCRAPED TWEETS RETAINED: 14 DAYS</p>
                </div>

                <button
                  onClick={handlePruneStorage}
                  disabled={clearing}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-950/20 border border-red-500/30 hover:border-red-500/80 hover:bg-red-500/10 text-red-400 font-bold font-mono text-xs tracking-wider rounded-lg transition-all"
                >
                  <Trash size={16} />
                  {clearing ? 'PRUNING DATA...' : 'PRUNE EXPIRED RECORDS'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
