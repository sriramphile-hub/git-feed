'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Bell, PaperPlaneTilt, CheckCircle, Warning, Calendar } from '@phosphor-icons/react';

interface SentNotification {
  id: string;
  title: string;
  body: string | null;
  link_type: string | null;
  link_id: string | null;
  created_at: string;
}

export default function NotificationComposer() {
  const [history, setHistory] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [linkType, setLinkType] = useState('url');
  const [linkId, setLinkId] = useState('');
  const [targetSegment, setTargetSegment] = useState('all'); // all | active

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch distinct sent notifications (since we broadcast to individual users, we get distinct title/body combos)
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, link_type, link_id, created_at')
        .eq('type', 'custom_admin')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Filter unique by title & created_at to avoid listing duplicates for every individual user
      const seen = new Set();
      const unique = (data || []).filter((item) => {
        const key = `${item.title}-${item.created_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setHistory(unique as SentNotification[]);
    } catch (err) {
      console.error('Error fetching notifications logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    try {
      // 1. Fetch target user profiles
      const { data: users, error: uErr } = await supabase
        .from('user_profiles')
        .select('id');

      if (uErr) throw uErr;

      if (!users || users.length === 0) {
        alert('No users registered in the system to target.');
        setSending(false);
        return;
      }

      // 2. Insert notifications records for every user
      const inserts = users.map((u) => ({
        user_id: u.id,
        type: 'custom_admin',
        title: title.trim(),
        body: body.trim(),
        icon_url: iconUrl.trim() || null,
        link_type: linkType || null,
        link_id: linkId.trim() || null,
      }));

      const { error: insErr } = await supabase
        .from('notifications')
        .insert(inserts);

      if (insErr) throw insErr;

      alert(`Notification broadcasted successfully to ${users.length} users!`);
      setTitle('');
      setBody('');
      setIconUrl('');
      setLinkId('');
      fetchHistory();

    } catch (err: any) {
      console.error('Failed to broadcast notification:', err);
      alert(err.message || 'Error occurred during notification broadcast.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-black tracking-widest font-mono text-white">NOTIFICATION CENTER</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">COMPOSE AND BROADCAST REAL-TIME NOTIFICATIONS TO DEVS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Compose Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
            <Bell size={18} className="text-blue-500" />
            <h2 className="text-xs font-bold font-mono text-white tracking-widest">COMPOSE BROADCAST MESSAGE</h2>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">NOTIFICATION TITLE</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New security report released..."
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">MESSAGE BODY</label>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="A high-severity zero-day vulnerability in popular OSS library has been disclosed..."
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">LINK TYPE</label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-400 rounded-lg px-3 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                >
                  <option value="url">URL LINK</option>
                  <option value="repository">REPOSITORY ID</option>
                  <option value="news">NEWS ID</option>
                  <option value="collection">COLLECTION ID</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">LINK ID / TARGET URL</label>
                <input
                  type="text"
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                  placeholder={linkType === 'url' ? 'https://example.com' : 'UUID or numeric ID'}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">ICON OR IMAGE URL (OPTIONAL)</label>
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold font-mono tracking-widest rounded-lg transition-all flex items-center gap-2 hover:shadow-lg"
              >
                <PaperPlaneTilt size={16} />
                {sending ? 'BROADCASTING...' : 'BROADCAST NOTIFICATION'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Broadcast Logs */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <Calendar size={18} className="text-blue-500" />
            <h2 className="text-xs font-bold font-mono text-white tracking-widest">BROADCAST LOGS</h2>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 font-mono">NO SENT RECORDS REGISTERED</div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
              {history.map((h) => (
                <div key={h.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-2">
                  <span className="block font-mono text-[11px] font-bold text-white leading-tight">{h.title}</span>
                  <p className="text-[10px] text-slate-500 leading-snug">{h.body}</p>
                  <div className="flex justify-between items-center text-[8px] font-bold font-mono text-slate-600 pt-1 border-t border-slate-800/40">
                    <span>{h.link_type?.toUpperCase() || 'NO LINK'}</span>
                    <span>{new Date(h.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
