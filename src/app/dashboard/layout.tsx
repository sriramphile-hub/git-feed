'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import {
  Terminal,
  GridFour,
  GitBranch,
  Newspaper,
  Cpu,
  Image,
  TwitterLogo,
  FolderSimple,
  Users,
  Bell,
  ChartBar,
  Gear,
  SignOut,
} from '@phosphor-icons/react';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function SidebarItem({ href, icon, label, active }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold font-mono tracking-wider transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/');
        return;
      }

      const isAdmin = session.user.app_metadata?.role === 'admin' || session.user.email?.endsWith('@gitfeed.app');
      if (!isAdmin) {
        await supabase.auth.signOut();
        router.replace('/');
        return;
      }

      setUserEmail(session.user.email ?? null);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-xs tracking-widest text-slate-400 font-mono">ESTABLISHING SECURE CONNECTION...</p>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', icon: <GridFour size={18} />, label: 'OVERVIEW' },
    { href: '/dashboard/repositories', icon: <GitBranch size={18} />, label: 'REPOSITORIES' },
    { href: '/dashboard/news', icon: <Newspaper size={18} />, label: 'NEWS FEED' },
    { href: '/dashboard/ai-models', icon: <Cpu size={18} />, label: 'AI CONFIG' },
    { href: '/dashboard/image-generation', icon: <Image size={18} />, label: 'IMAGEN KEY' },
    { href: '/dashboard/tweets', icon: <TwitterLogo size={18} />, label: 'TWEETS SCRAPER' },
    { href: '/dashboard/collections', icon: <FolderSimple size={18} />, label: 'COLLECTIONS' },
    { href: '/dashboard/users', icon: <Users size={18} />, label: 'USERS' },
    { href: '/dashboard/notifications', icon: <Bell size={18} />, label: 'NOTIFICATION COMPOSER' },
    { href: '/dashboard/analytics', icon: <ChartBar size={18} />, label: 'ANALYTICS' },
    { href: '/dashboard/settings', icon: <Gear size={18} />, label: 'FEATURE FLAGS' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Panel */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo Brand Block */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center">
              <Terminal size={18} className="text-blue-500" />
            </div>
            <div>
              <span className="text-sm font-black tracking-widest font-mono text-white">GITFEED</span>
              <span className="block text-[8px] text-slate-500 font-mono tracking-wider">ADMIN CONTROL</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname === item.href}
              />
            ))}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-blue-400">
              AD
            </div>
            <div className="overflow-hidden">
              <span className="block text-[10px] font-bold font-mono text-slate-300 truncate">{userEmail}</span>
              <span className="block text-[8px] text-green-500 font-mono font-bold tracking-wider">ONLINE · ROOT</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 text-slate-400 text-[10px] font-bold font-mono tracking-wider rounded-lg transition-all"
          >
            <SignOut size={14} />
            TERMINATE SESSION
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
        {children}
      </main>
    </div>
  );
}
