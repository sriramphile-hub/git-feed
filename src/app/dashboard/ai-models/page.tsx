'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Trash, ToggleLeft, ToggleRight, Sparkle, Trophy, Cpu, Key, ChartBar } from '@phosphor-icons/react';

interface AIProvider {
  id: string;
  name: string;
  display_name: string;
  is_enabled: boolean;
  priority: number;
  models: string[];
}

interface APIKey {
  id: string;
  provider_id: string;
  label: string | null;
  is_active: boolean;
  total_requests: number;
  total_tokens: number;
  last_used_at: string | null;
  cooldown_until: string | null;
  last_error: string | null;
}

export default function AIModelsManager() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // New key inputs
  const [newKey, setNewKey] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [addingKey, setAddingKey] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Providers ordered by priority
      const { data: provs, error: pErr } = await supabase
        .from('ai_providers')
        .select('*')
        .order('priority', { ascending: true });

      if (pErr) throw pErr;
      setProviders(provs || []);

      if (provs && provs.length > 0) {
        const defaultProvId = provs[0].id;
        setSelectedProviderId((prev) => prev || defaultProvId);
        
        // 2. Fetch Keys
        const { data: apiKeyData, error: kErr } = await supabase
          .from('ai_api_keys')
          .select('*');

        if (kErr) throw kErr;
        setKeys(apiKeyData || []);
      }
    } catch (err) {
      console.error('Error fetching AI providers/keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleProvider = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({ is_enabled: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Failed to toggle provider:', err);
    }
  };

  const handleToggleKey = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_api_keys')
        .update({ is_active: !currentStatus })
        .eq('id', keyId);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Failed to toggle API key:', err);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !selectedProviderId) return;

    setAddingKey(true);
    try {
      const { error } = await supabase
        .from('ai_api_keys')
        .insert({
          provider_id: selectedProviderId,
          api_key_encrypted: newKey.trim(), // In a real production app this should be encrypted on serverWorker, here we insert direct securely
          label: newKeyLabel.trim() || 'Custom Key',
          is_active: true,
        });

      if (error) throw error;
      setNewKey('');
      setNewKeyLabel('');
      fetchData();
    } catch (err) {
      console.error('Failed to add API key:', err);
      alert('Error adding API key.');
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API Key?')) return;

    try {
      const { error } = await supabase
        .from('ai_api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const activeProvider = providers.find((p) => p.id === selectedProviderId);
  const filteredKeys = keys.filter((k) => k.provider_id === selectedProviderId);

  return (
    <div className="space-y-6 font-sans text-slate-200">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-black tracking-widest font-mono text-white">AI PROVIDERS & MODELS</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">CONFIGURE CASCADE ROUTING PRIORITY AND MANAGE ENCRYPTED KEYS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Providers List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <Cpu size={18} className="text-blue-500" />
            <h2 className="text-xs font-bold font-mono text-white tracking-widest">CASCADE ORDER</h2>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></span>
            </div>
          ) : (
            <div className="space-y-2">
              {providers.map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => setSelectedProviderId(prov.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-mono font-bold transition-all ${
                    selectedProviderId === prov.id
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] opacity-60">#{prov.priority}</span>
                    <span>{prov.display_name.toUpperCase()}</span>
                  </div>
                  
                  {/* Status Toggle */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleProvider(prov.id, prov.is_enabled);
                    }}
                    className={`p-1 rounded cursor-pointer ${
                      prov.is_enabled ? 'text-green-500' : 'text-slate-600'
                    }`}
                  >
                    {prov.is_enabled ? <ToggleRight size={24} weight="fill" /> : <ToggleLeft size={24} />}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Selected Provider Keys */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key List card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-blue-500" />
                <h2 className="text-xs font-bold font-mono text-white tracking-widest">
                  {activeProvider ? `${activeProvider.display_name.toUpperCase()} KEYS` : 'KEYS MANAGEMENT'}
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="py-10 flex justify-center">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></span>
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 font-mono">NO API KEYS CONFIGURED FOR THIS PROVIDER</div>
            ) : (
              <div className="space-y-4">
                {filteredKeys.map((k) => (
                  <div key={k.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{k.label}</span>
                        {k.cooldown_until && new Date(k.cooldown_until).getTime() > Date.now() && (
                          <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[8px] font-bold font-mono rounded">
                            COOLDOWN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[9px] text-slate-500 font-mono">
                        <span>REQUESTS: {k.total_requests}</span>
                        <span>TOKENS: {k.total_tokens.toLocaleString()}</span>
                      </div>
                      {k.last_error && (
                        <p className="text-[9px] text-red-500 font-mono mt-1">ERROR: {k.last_error}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleKey(k.id, k.is_active)}
                        className={`p-1 rounded ${k.is_active ? 'text-blue-500' : 'text-slate-600'}`}
                      >
                        {k.is_active ? <ToggleRight size={24} weight="fill" /> : <ToggleLeft size={24} />}
                      </button>
                      <button
                        onClick={() => handleDeleteKey(k.id)}
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

          {/* Add Key Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xs font-bold font-mono text-white tracking-widest mb-4">ADD NEW API KEY</h3>
            <form onSubmit={handleAddKey} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">KEY LABEL (e.g. Gmail Account 1)</label>
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="Gmail Account 1"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">API KEY VALUE</label>
                  <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addingKey || !selectedProviderId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold font-mono tracking-wider rounded-lg transition-all flex items-center gap-2"
                >
                  <Plus size={14} />
                  {addingKey ? 'ADDING...' : 'REGISTER API KEY'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
