'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ChartBar, ShieldCheck, Cpu, HardDrives, TrendUp } from '@phosphor-icons/react';

interface TopicStats {
  name: string;
  count: number;
}

interface SourceStats {
  source: string;
  count: number;
}

interface AIUsageStats {
  provider_name: string;
  success_count: number;
  error_count: number;
  total_tokens: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);
  const [aiStats, setAiStats] = useState<AIUsageStats[]>([]);
  const [activeUserRatio, setActiveUserRatio] = useState({ active: 0, total: 0 });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Fetch user onboarding active ratio
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('onboarding_completed');

      const total = profiles?.length || 0;
      const active = profiles?.filter((p) => p.onboarding_completed).length || 0;
      setActiveUserRatio({ active, total });

      // 2. Fetch Repository Topic distribution
      const { data: repoTopics } = await supabase
        .from('repository_topics')
        .select(`
          topic:topics (
            name
          )
        `);

      const topicCounts: Record<string, number> = {};
      (repoTopics || []).forEach((rt: any) => {
        const name = rt.topic?.name;
        if (name) {
          topicCounts[name] = (topicCounts[name] || 0) + 1;
        }
      });

      const sortedTopics = Object.entries(topicCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      setTopicStats(sortedTopics);

      // 3. Fetch News sources distribution
      const { data: newsArticles } = await supabase
        .from('news_articles')
        .select('source');

      const sourceCounts: Record<string, number> = {};
      (newsArticles || []).forEach((na) => {
        sourceCounts[na.source] = (sourceCounts[na.source] || 0) + 1;
      });

      const sortedSources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);
      
      setSourceStats(sortedSources);

      // 4. Fetch AI logs usage stats
      const { data: logs } = await supabase
        .from('ai_usage_logs')
        .select('provider_name, tokens_input, tokens_output, status');

      const aiData: Record<string, AIUsageStats> = {};
      (logs || []).forEach((log) => {
        const prov = log.provider_name;
        if (!aiData[prov]) {
          aiData[prov] = { provider_name: prov, success_count: 0, error_count: 0, total_tokens: 0 };
        }
        if (log.status === 'success') {
          aiData[prov].success_count++;
        } else {
          aiData[prov].error_count++;
        }
        aiData[prov].total_tokens += (log.tokens_input || 0) + (log.tokens_output || 0);
      });

      setAiStats(Object.values(aiData));

    } catch (err) {
      console.error('Error compiling analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalTopicRepos = topicStats.reduce((acc, t) => acc + t.count, 0);
  const totalNewsArticles = sourceStats.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-8 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-black tracking-widest font-mono text-white">ANALYTICS & METRICS</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">TELEMETRY CHARTS AND OSS CONTENT CLASSIFICATION STATISTICS</p>
      </div>

      {loading ? (
        <div className="py-40 flex justify-center items-center">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Active Users Ratio */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendUp size={18} className="text-blue-500" />
              <h2 className="text-xs font-bold font-mono text-white tracking-widest">ONBOARDING RETENTION</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-mono">
                <span>ONBOARDED USER PROFILES</span>
                <span className="font-bold text-white">{activeUserRatio.active} / {activeUserRatio.total}</span>
              </div>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-green-500 h-full rounded-full"
                  style={{ width: `${activeUserRatio.total ? (activeUserRatio.active / activeUserRatio.total) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                REPRESENTS THE PERCENTAGE OF USERS WHO SUCCESSFULLY COMPLETED THE INTERFACES OF TOPICS AND USERNAME INITIALS SETUP.
              </p>
            </div>
          </div>

          {/* AI Usage Logs Cascade */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Cpu size={18} className="text-blue-500" />
              <h2 className="text-xs font-bold font-mono text-white tracking-widest">AI PROVIDERS STATS</h2>
            </div>
            
            <div className="space-y-3">
              {aiStats.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono py-4 text-center">NO AI USAGE LOGGED YET</p>
              ) : (
                aiStats.map((ai) => (
                  <div key={ai.provider_name} className="flex justify-between items-center text-xs font-mono p-2 bg-slate-950 border border-slate-800 rounded-lg">
                    <span className="font-bold text-white">{ai.provider_name.toUpperCase()}</span>
                    <div className="flex gap-4 text-[10px] text-slate-400">
                      <span className="text-green-500">SUCCESS: {ai.success_count}</span>
                      <span className="text-red-500">ERRORS: {ai.error_count}</span>
                      <span>TOKENS: {ai.total_tokens.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Topics Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ChartBar size={18} className="text-blue-500" />
              <h2 className="text-xs font-bold font-mono text-white tracking-widest">TOP TOPICS BY REPO COUNT</h2>
            </div>

            <div className="space-y-3">
              {topicStats.map((topic) => {
                const percent = totalTopicRepos ? (topic.count / totalTopicRepos) * 100 : 0;
                return (
                  <div key={topic.name} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-300 font-bold">{topic.name.toUpperCase()}</span>
                      <span className="text-slate-500">{topic.count} REPOS</span>
                    </div>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* News Source Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck size={18} className="text-blue-500" />
              <h2 className="text-xs font-bold font-mono text-white tracking-widest">NEWS SOURCES DISTRIBUTION</h2>
            </div>

            <div className="space-y-3">
              {sourceStats.map((src) => {
                const percent = totalNewsArticles ? (src.count / totalNewsArticles) * 100 : 0;
                return (
                  <div key={src.source} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-300 font-bold">{src.source.replace('_', ' ').toUpperCase()}</span>
                      <span className="text-slate-500">{src.count} ITEMS</span>
                    </div>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
