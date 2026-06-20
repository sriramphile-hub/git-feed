'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Image, ToggleLeft, ToggleRight, Sparkle, HardDrives, ArrowClockwise } from '@phosphor-icons/react';

interface RepoThumbnail {
  id: number;
  repo_name: string;
  thumbnail_url: string | null;
  thumbnail_source: string;
}

export default function ImageGenerationManager() {
  const [thumbnails, setThumbnails] = useState<RepoThumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagenEnabled, setImagenEnabled] = useState(true);
  const [quotaCount, setQuotaCount] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Imagen enable flag
      const { data: configData } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'imagen_enabled')
        .single();
      
      setImagenEnabled(configData ? configData.value === 'true' : true);

      // 2. Fetch daily Imagen requests count from logs
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: dailyCount } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('task_type', 'image_generation')
        .gte('created_at', startOfDay.toISOString());
      
      setQuotaCount(dailyCount || 0);

      // 3. Fetch repositories thumbnails
      const { data: repos, error: rErr } = await supabase
        .from('repositories')
        .select('id, repo_name, thumbnail_url, thumbnail_source')
        .order('stars', { ascending: false })
        .limit(24);

      if (rErr) throw rErr;
      setThumbnails(repos || []);

    } catch (err) {
      console.error('Error fetching image gen config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleImagen = async () => {
    setUpdating(true);
    const nextVal = !imagenEnabled;
    setImagenEnabled(nextVal);
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'imagen_enabled', value: String(nextVal) });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update app config:', err);
      setImagenEnabled(!nextVal);
    } finally {
      setUpdating(false);
    }
  };

  const handleRegenerateThumb = async (repoId: number) => {
    setRegeneratingId(repoId);
    try {
      const response = await fetch('/api/admin/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate');
      alert('Thumbnail regenerated and uploaded to R2 successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error occurred during thumbnail regeneration.');
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-widest font-mono text-white">IMAGEN GENERATION</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">MANAGE GOOGLE IMAGEN KEYS, GENERATE REPO THUMBNAILS, AND TRACK RPD QUOTAS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Toggle Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">GLOBAL SETTING</span>
              <h3 className="text-sm font-black font-mono text-white mt-1">IMAGEN STATUS</h3>
            </div>
            <button
              onClick={handleToggleImagen}
              disabled={updating}
              className={`p-1 rounded ${imagenEnabled ? 'text-blue-500' : 'text-slate-600'}`}
            >
              {imagenEnabled ? <ToggleRight size={28} weight="fill" /> : <ToggleLeft size={28} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-4">
            IF DISABLED, ALL FALLBACK THUMBNAILS WILL RENDER GITHUB AVATAR OR DEFAULT COVER ART ON USER APPS.
          </p>
        </div>

        {/* Daily Quota Counter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">RPD QUOTA STATUS</span>
              <h3 className="text-sm font-black font-mono text-white mt-1">DAILY IMAGE REQUESTS TODAY</h3>
            </div>
            <HardDrives size={20} className="text-slate-400" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-400 font-bold">
              <span>{quotaCount} RUNS TODAY</span>
              <span>75 TOTAL RUNS CAP (3 MODELS x 25 RPD)</span>
            </div>
            <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-3 overflow-hidden p-0.5">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (quotaCount / 75) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] font-bold font-mono text-slate-500">
              <span>{((quotaCount / 75) * 100).toFixed(1)}% CONSUMED</span>
              <span>RESETS AUTOMATICALLY AT GMT 00:00</span>
            </div>
          </div>
        </div>

      </div>

      {/* Thumbnails Gallery Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image size={18} className="text-blue-500" />
            <h2 className="text-xs font-bold font-mono text-white tracking-widest">THUMBNAIL MEDIA GALLERY</h2>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {thumbnails.map((thumb) => (
              <div key={thumb.id} className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between group">
                <div className="aspect-video bg-slate-900 relative">
                  {thumb.thumbnail_url ? (
                    <img
                      src={thumb.thumbnail_url}
                      alt={thumb.repo_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 font-mono text-[10px]">
                      NO IMAGE FILE
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-[8px] font-bold font-mono text-slate-400 rounded">
                    {thumb.thumbnail_source.toUpperCase()}
                  </span>
                </div>

                <div className="p-3 space-y-3">
                  <span className="block font-mono text-xs font-bold text-white truncate">{thumb.repo_name}</span>
                  <button
                    onClick={() => handleRegenerateThumb(thumb.id)}
                    disabled={regeneratingId === thumb.id}
                    className="w-full py-1.5 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-blue-400 text-[9px] font-bold font-mono tracking-wider rounded transition-all flex items-center justify-center gap-1"
                  >
                    <Sparkle size={12} className={regeneratingId === thumb.id ? 'animate-spin' : ''} />
                    {regeneratingId === thumb.id ? 'REGENERATING...' : 'REGENERATE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
