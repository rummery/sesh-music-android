import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Server,
  Sliders,
  WifiOff,
  Wifi,
  Sparkles,
  User,
  Activity,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const TopHeader: React.FC = () => {
  const {
    navigateBack,
    viewHistory,
    subsonicConfig,
    isOfflineMode,
    setIsOfflineMode,
    cachedTrackIds,
    setIsSubsonicModalOpen,
    setIsEqualizerOpen,
    setIsSmartPlaylistModalOpen,
    setIsDiagnosticOpen,
  } = useMusic();

  const canGoBack = viewHistory.length > 1;

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#121212]/90 backdrop-blur-md px-4 md:px-8 flex items-center justify-between border-b border-zinc-900/40 select-none">
      {/* Left: History Navigation & Mobile Brand */}
      <div className="flex items-center gap-2">
        {/* Desktop History Arrows */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={navigateBack}
            disabled={!canGoBack}
            title="Go back"
            className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/90 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            disabled
            title="Go forward"
            className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white opacity-40 cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Brand Mark */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1ed760] flex items-center justify-center text-black font-extrabold shadow">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.794-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.496 9.723 1.115.294.18.386.562.207.855zm1.226-2.723c-.226.368-.71.482-1.078.256-2.69-1.653-6.79-2.131-9.97-1.165-.413.125-.85-.108-.975-.522-.125-.414.108-.85.522-.975 3.633-1.103 8.147-.568 11.245 1.33.368.226.482.71.256 1.076zm.105-2.835C14.692 8.95 9.085 8.766 5.82 9.757c-.496.15-1.022-.134-1.173-.63-.15-.496.134-1.022.63-1.173 3.755-1.14 9.948-.925 13.738 1.325.446.265.592.844.327 1.29-.265.447-.844.593-1.29.327z"/>
            </svg>
          </div>
          <span className="font-extrabold text-white text-base tracking-tight">sesh music</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Offline Mode Toggle Button */}
        <button
          onClick={() => setIsOfflineMode(!isOfflineMode)}
          title={isOfflineMode ? 'Exit Offline Mode' : 'Switch to Offline Mode'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            isOfflineMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700'
          }`}
        >
          {isOfflineMode ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
          <span className="hidden sm:inline">{isOfflineMode ? `Offline (${cachedTrackIds.size} songs)` : 'Online'}</span>
        </button>

        {/* Subsonic Server Status Pill */}
        <button
          onClick={() => setIsSubsonicModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            subsonicConfig.isConnected
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900'
              : 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-[#1ed760]" />
          <span className="hidden sm:inline">{subsonicConfig.isConnected ? 'Subsonic Synced' : 'Subsonic'}</span>
        </button>

        {/* EQ quick access */}
        <button
          onClick={() => setIsEqualizerOpen(true)}
          title="Gapless & Equalizer"
          className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Audio Diagnostics Monitor */}
        <button
          onClick={() => setIsDiagnosticOpen(true)}
          title="Audio & CORS Diagnostics"
          className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-[#1ed760] border border-zinc-700 transition-colors relative"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Profile Avatar */}
        <div
          title="sesh listener"
          className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
        >
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
};
