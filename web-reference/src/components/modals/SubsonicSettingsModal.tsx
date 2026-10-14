import React, { useState } from 'react';
import {
  X,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  Trash2,
  Lock,
  Globe,
  Radio,
  Sliders,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const SubsonicSettingsModal: React.FC = () => {
  const {
    subsonicConfig,
    updateSubsonicConfig,
    pingSubsonic,
    syncWithSubsonic,
    isSyncing,
    isSubsonicModalOpen,
    setIsSubsonicModalOpen,
    cachedTrackIds,
    cacheStorageEstimate,
    clearCache,
  } = useMusic();

  const [serverUrl, setServerUrl] = useState(subsonicConfig.serverUrl);
  const [username, setUsername] = useState(subsonicConfig.username);
  const [password, setPassword] = useState(subsonicConfig.password || '');
  const [tokenAuth, setTokenAuth] = useState(subsonicConfig.tokenAuth);
  const [showPassword, setShowPassword] = useState(false);

  const [pingStatus, setPingStatus] = useState<{
    testing: boolean;
    result?: { ok: boolean; latency: number; version?: string; error?: string };
  }>({ testing: false });

  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  if (!isSubsonicModalOpen) return null;

  const handleTestConnection = async () => {
    updateSubsonicConfig({
      serverUrl,
      username,
      password,
      tokenAuth,
    });

    setPingStatus({ testing: true });
    setSyncStatusMsg(null);

    const res = await pingSubsonic();
    setPingStatus({ testing: false, result: res });
  };

  const handleSyncPlaylists = async () => {
    setSyncStatusMsg('Syncing playlists with Navidrome (pushing local differences as source of truth)...');
    const ok = await syncWithSubsonic();
    if (ok) {
      setSyncStatusMsg('Navidrome updated with all differences from sesh-music successfully!');
    } else {
      setSyncStatusMsg('Sync failed. Please check server credentials.');
    }
  };

  const handleLoadDemoNavidrome = () => {
    setServerUrl('https://demo.navidrome.org');
    setUsername('demo');
    setPassword('demo');
    setTokenAuth(true);
  };

  const cacheSizeMb = (cacheStorageEstimate.usedBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-6 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1ed760]/10 flex items-center justify-center text-[#1ed760] border border-[#1ed760]/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Subsonic & Server Settings</h3>
              <p className="text-xs text-zinc-400">Navidrome • LMS • Subsonic • OpenSubsonic API v1.16.1+</p>
            </div>
          </div>

          <button
            onClick={() => setIsSubsonicModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Connection Form */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Server Credentials
            </span>
            <button
              onClick={handleLoadDemoNavidrome}
              className="text-xs text-[#1ed760] hover:underline font-semibold"
            >
              Fill Public Demo Server
            </button>
          </div>

          {/* URL Input */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Server URL</span>
            </label>
            <input
              type="url"
              placeholder="https://music.example.com or http://localhost:4533"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1ed760] transition-colors"
            />
          </div>

          {/* Username & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium">Username</label>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1ed760] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                <span>Password</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-zinc-400 hover:text-white"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1ed760] transition-colors"
              />
            </div>
          </div>

          {/* Token Auth Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={tokenAuth}
              onChange={(e) => setTokenAuth(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-[#1ed760] focus:ring-0"
            />
            <span className="text-xs text-zinc-300">
              Use Secure Token Auth (MD5 + Salt) recommended for modern Subsonic / Navidrome
            </span>
          </label>
        </div>

        {/* Action Buttons: Ping & Sync */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={handleTestConnection}
              disabled={pingStatus.testing}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 text-[#1ed760] ${pingStatus.testing ? 'animate-spin' : ''}`} />
              <span>{pingStatus.testing ? 'Testing Latency...' : 'Ping & Test Connection'}</span>
            </button>

            <button
              onClick={handleSyncPlaylists}
              disabled={isSyncing}
              title="Push differences to Navidrome (sesh-music is source of truth)"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1ed760] hover:bg-[#1ed760]/90 text-xs font-bold text-black transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing to Navidrome...' : 'Sync Playlists (Push to Server)'}</span>
            </button>
          </div>

          {/* Ping Result Banner */}
          {pingStatus.result && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                pingStatus.result.ok
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
              }`}
            >
              {pingStatus.result.ok ? (
                <CheckCircle2 className="w-4 h-4 text-[#1ed760] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block">
                  {pingStatus.result.ok
                    ? `Connected! Latency: ${pingStatus.result.latency} ms`
                    : 'Connection Failed'}
                </span>
                <span className="text-[11px] opacity-90">
                  {pingStatus.result.ok
                    ? `Protocol: ${pingStatus.result.version || 'v1.16.1'} • Server: ${subsonicConfig.serverName || 'Subsonic'}`
                    : pingStatus.result.error}
                </span>
              </div>
            </div>
          )}

          {syncStatusMsg && (
            <div className="p-2.5 rounded-lg bg-zinc-800 text-xs text-white border border-zinc-700">
              {syncStatusMsg}
            </div>
          )}
        </div>

        {/* Offline Cache Storage Manager */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#1ed760]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Offline Cache Storage (IndexedDB)
              </span>
            </div>
            <span className="text-xs font-mono text-[#1ed760] font-bold">
              {cachedTrackIds.size} tracks ({cacheSizeMb} MB)
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Tracks downloaded while connected to your Subsonic server remain available for full gapless playback even when traveling or disconnected.
          </p>

          {cachedTrackIds.size > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all downloaded offline cache tracks?')) {
                  clearCache();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cached Tracks</span>
            </button>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              updateSubsonicConfig({ serverUrl, username, password, tokenAuth });
              setIsSubsonicModalOpen(false);
            }}
            className="px-6 py-2.5 rounded-full bg-white text-black text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
