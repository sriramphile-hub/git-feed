'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Users, Calendar, BookmarkSimple, UserCheck, Sparkle } from '@phosphor-icons/react';

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  selected_topics: string[] | null;
  onboarding_completed: boolean;
  created_at: string;
  bookmark_count?: number;
  follow_count?: number;
}

export default function UsersInspector() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch user profiles
      const { data: profiles, error: pErr } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;

      // 2. Fetch stats for each user in parallel
      const formattedProfiles: UserProfile[] = await Promise.all(
        (profiles || []).map(async (profile: any) => {
          // Get bookmark count
          const { count: bCount } = await supabase
            .from('bookmarks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get follow count
          const { count: fCount } = await supabase
            .from('followed_repos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          return {
            ...profile,
            bookmark_count: bCount || 0,
            follow_count: fCount || 0,
          };
        })
      );

      setUsers(formattedProfiles);
    } catch (err) {
      console.error('Error fetching user telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const name = u.display_name?.toLowerCase() || '';
    const username = u.username?.toLowerCase() || '';
    const search = searchQuery.toLowerCase();
    return name.includes(search) || username.includes(search);
  });

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-black tracking-widest font-mono text-white">USERS DIRECTORY</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">INSPECT REGISTERED USER PREFERENCES AND USAGE TELEMETRY</p>
      </div>

      {/* Search Filter */}
      <div className="flex gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="SEARCH USER BY NAME OR USERNAME..."
          className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Users table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 font-mono">NO USER REGISTRATIONS RECORDED</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 tracking-wider font-mono bg-slate-900/50">
                <th className="p-4">USER PROFILE</th>
                <th className="p-4">INTERESTED TOPICS</th>
                <th className="p-4">USAGE METRICS</th>
                <th className="p-4 text-right">JOINED DATE</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-slate-300">
                      {u.display_name ? u.display_name.substring(0, 2).toUpperCase() : 'GF'}
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white text-xs">{u.display_name || 'Anonymous User'}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">@{u.username || 'no-username'}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[8px] font-bold font-mono">
                      {(u.selected_topics || []).length} TOPICS CHOSEN
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-4 font-mono text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <BookmarkSimple size={12} />
                        <span>{u.bookmark_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserCheck size={12} />
                        <span>{u.follow_count}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 font-mono text-[10px] text-slate-500">
                      <Calendar size={12} />
                      <span>{new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
