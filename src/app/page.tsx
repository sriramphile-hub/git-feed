'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Terminal, Key, ShieldWarning } from '@phosphor-icons/react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in as admin
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isAdmin = session.user.app_metadata?.role === 'admin' || session.user.email?.endsWith('@gitfeed.app');
        if (isAdmin) {
          router.replace('/dashboard');
          return;
        }
      }
      setCheckingSession(false);
    };

    checkUser();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const user = data.user;
      const isAdmin = user?.app_metadata?.role === 'admin' || user?.email?.endsWith('@gitfeed.app');

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error('Access denied: You do not have administrator privileges.');
      }

      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-xs tracking-widest text-slate-400 font-mono">INITIALIZING TERMINAL...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 font-sans text-slate-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Neon Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-500"></div>
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20 mb-3">
            <Terminal size={24} className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-black tracking-widest font-mono text-white">GITFEED ADMIN</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">SECURE MANAGEMENT ACCESS</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <ShieldWarning size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-200 leading-relaxed font-mono">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 font-mono transition-colors"
              placeholder="admin@gitfeed.app"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 font-mono transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-xs font-bold tracking-widest font-mono transition-all flex items-center justify-center gap-2 mt-4 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            ) : (
              <>
                <Key size={16} />
                ESTABLISH SESSION
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-[10px] text-slate-600 mt-8 font-mono tracking-wider">SECURE SHIELD V2.5.0 · FOR INTERNAL USE ONLY</p>
    </div>
  );
}
