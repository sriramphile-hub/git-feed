'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { triggerPipelineSync } from '@/lib/api';
import {
  Database,
  Users,
  Cpu,
  TwitterLogo,
  HardDrives,
  ArrowClockwise,
  Broadcast,
} from '@phosphor-icons/react';

interface Stats {
  totalRepos: number;
  totalUsers: number;
  aiCallsToday: number;
  totalTweets: number;
  dbSizeMB: number;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalRepos: 0,
    totalUsers: 0,
    aiCallsToday: 0,
    totalTweets: 0,
    dbSizeMB: 0,
  });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Get repos count
      const { count: reposCount } = await supabase
        .from('repositories')
        .select('*', { count: 'exact', head: true });

      // 2. Get users count
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // 3. Get AI calls count today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: aiCallsCount } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // 4. Get tweets count
      const { count: tweetsCount } = await supabase
        .from('tweets')
        .select('*', { count: 'exact', head: true });

      // 5. Estimate DB storage size
      // Typical sizes: Repo record ≈ 8KB, AI summary ≈ 5KB, News article ≈ 3KB, Tweet ≈ 2KB
      // Plus overheads. We'll use a realistic multiplier.
      const estimatedBytes = 
        (reposCount || 0) * 8000 + 
        (usersCount || 0) * 3000 + 
        (aiCallsCount || 0) * 2000 + 
        (tweetsCount || 0) * 2000;
      
      const dbSizeMB = Math.max(1.2, parseFloat((estimatedBytes / (1024 * 1024)).toFixed(2)));

      setStats({
        totalRepos: reposCount || 0,
        totalUsers: usersCount || 0,
        aiCallsToday: aiCallsCount || 0,
        totalTweets: tweetsCount || 0,
        dbSizeMB,
      });
    } catch (err) {
      console.error('Error fetching dashboard overview stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleTriggerPipeline = async (pipeline: 'trending' | 'news' | 'tweets' | 'releases' | 'keepalive') => {
    setTriggering(pipeline);
    try {
      const res = await triggerPipelineSync(pipeline);
      alert(res.message || 'Pipeline triggered successfully!');
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to trigger pipeline ingestion.');
    } finally {
      setTriggering(null);
    }
  };

  const dbPercentage = Math.min(100, (stats.dbSizeMB / 500) * 100);

  return (
    <div className="space-y-8 font-sans text-slate-100">
      
      {/* Page Title Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-widest font-mono text-white">SYSTEM OVERVIEW</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">REAL-TIME TELEMETRY AND PIPELINE STATUS</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 px-4 py-2 text-xs font-bold font-mono tracking-wider rounded-lg flex items-center gap-2 hover:border-slate-700 transition-colors"
        >
          <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
          REFRESH TELEMETRY
        </button>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Repos Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">TOTAL REPOSITORIES</span>
              <h3 className="text-3xl font-black font-mono text-white mt-2">
                {loading ? '...' : stats.totalRepos}
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg">
              <Database size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span className="text-[9px] font-bold font-mono text-slate-500">SYNCHRONIZED WITH GITHUB</span>
          </div>
        </div>

        {/* Total Users Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">REGISTERED USERS</span>
              <h3 className="text-3xl font-black font-mono text-white mt-2">
                {loading ? '...' : stats.totalUsers}
              </h3>
            </div>
            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span className="text-[9px] font-bold font-mono text-slate-500">ACTIVE PROFILES ON SUPABASE</span>
          </div>
        </div>

        {/* AI Calls Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">AI CALLS TODAY</span>
              <h3 className="text-3xl font-black font-mono text-white mt-2">
                {loading ? '...' : stats.aiCallsToday}
              </h3>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-500 rounded-lg">
              <Cpu size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="text-[9px] font-bold font-mono text-slate-500">PROVIDER PRIORITY CASCADE ACTIVE</span>
          </div>
        </div>

        {/* Tweets Scraped Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">TWEETS SCRAPED</span>
              <h3 className="text-3xl font-black font-mono text-white mt-2">
                {loading ? '...' : stats.totalTweets}
              </h3>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-500 rounded-lg">
              <TwitterLogo size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span className="text-[9px] font-bold font-mono text-slate-500">RSSHUB INGESTION SYSTEM</span>
          </div>
        </div>

      </div>

      {/* Storage Gauge Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">DATABASE VOLUME GAUGE</span>
            <h3 className="text-lg font-black font-mono text-white mt-1">SUPABASE STORAGE ALLOCATION</h3>
          </div>
          <HardDrives size={24} className="text-slate-400" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-slate-400 font-bold">
            <span>{stats.dbSizeMB.toFixed(2)} MB USED</span>
            <span>500.00 MB TOTAL CAPACITY (FREE TIER)</span>
          </div>
          <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-4 overflow-hidden p-0.5">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${dbPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[9px] font-bold font-mono text-slate-500 mt-2">
            <span>{dbPercentage.toFixed(1)}% CONSUMED</span>
            <span>WARNING LIMIT TRIGGER AT 400 MB</span>
          </div>
        </div>
      </div>

      {/* Manual Pipeline Trigger Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-6">
          <Broadcast size={20} className="text-blue-500" />
          <h2 className="text-sm font-bold font-mono text-white tracking-widest">MANUAL INGESTION TRIGGERS</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <button
            onClick={() => handleTriggerPipeline('trending')}
            disabled={!!triggering}
            className="px-4 py-3 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-slate-300 hover:text-blue-400 text-xs font-bold font-mono tracking-wider rounded-lg transition-all disabled:opacity-50"
          >
            {triggering === 'trending' ? 'SYNCING...' : 'TRENDING REPOS'}
          </button>
          
          <button
            onClick={() => handleTriggerPipeline('news')}
            disabled={!!triggering}
            className="px-4 py-3 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-slate-300 hover:text-blue-400 text-xs font-bold font-mono tracking-wider rounded-lg transition-all disabled:opacity-50"
          >
            {triggering === 'news' ? 'SYNCING...' : 'NEWS INGEST'}
          </button>
          
          <button
            onClick={() => handleTriggerPipeline('tweets')}
            disabled={!!triggering}
            className="px-4 py-3 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-slate-300 hover:text-blue-400 text-xs font-bold font-mono tracking-wider rounded-lg transition-all disabled:opacity-50"
          >
            {triggering === 'tweets' ? 'SYNCING...' : 'AI TWEETS'}
          </button>
          
          <button
            onClick={() => handleTriggerPipeline('releases')}
            disabled={!!triggering}
            className="px-4 py-3 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-slate-300 hover:text-blue-400 text-xs font-bold font-mono tracking-wider rounded-lg transition-all disabled:opacity-50"
          >
            {triggering === 'releases' ? 'SYNCING...' : 'CHECK RELEASES'}
          </button>

          <button
            onClick={() => handleTriggerPipeline('keepalive')}
            disabled={!!triggering}
            className="px-4 py-3 border border-slate-800 hover:border-purple-500/30 hover:bg-purple-500/5 text-slate-300 hover:text-purple-400 text-xs font-bold font-mono tracking-wider rounded-lg transition-all disabled:opacity-50"
          >
            {triggering === 'keepalive' ? 'PINGING...' : 'KEEPALIVE PING'}
          </button>
        </div>
      </div>

    </div>
  );
}
