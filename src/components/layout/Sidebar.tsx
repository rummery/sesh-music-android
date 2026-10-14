import React, { useState } from 'react';
import {
  Home,
  Search,
  Library,
  Plus,
  ArrowRight,
  Pin,
  Sparkles,
  Server,
  DownloadCloud,
  CheckCircle2,
  ListMusic,
  Heart,
  Sliders,
  WifiOff,
  Wifi,
  Pencil,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Playlist } from '../../types/music';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    selectedEntityId,
    playlists,
    createPlaylist,
    openCreatePlaylistModal,
    openEditPlaylistModal,
    setIsSmartPlaylistModalOpen,
    setIsSubsonicModalOpen,
    setIsEqualizerOpen,
    subsonicConfig,
    isOfflineMode,
    setIsOfflineMode,
    cachedTrackIds,
    cachedTracksList,
  } = useMusic();

  const [libraryFilter, setLibraryFilter] = useState<'all' | 'playlists' | 'downloaded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlaylists = playlists.filter((pl) => {
    if (libraryFilter === 'downloaded' && !pl.isDownloaded && pl.id !== 'pl-offline-vault') {
      return false;
    }
    if (searchQuery.trim()) {
      return pl.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <aside className="hidden md:flex flex-col w-72 lg:w-80 shrink-0 h-full p-2 gap-2 select-none bg-black text-[#b3b3b3]">
      {/* Top Navigation Box */}
      <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-4">
        {/* Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-8 h-8 rounded-full bg-[#1ed760] flex items-center justify-center text-black font-extrabold shadow-lg shadow-[#1ed760]/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.794-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.496 9.723 1.115.294.18.386.562.207.855zm1.226-2.723c-.226.368-.71.482-1.078.256-2.69-1.653-6.79-2.131-9.97-1.165-.413.125-.85-.108-.975-.522-.125-.414.108-.85.522-.975 3.633-1.103 8.147-.568 11.245 1.33.368.226.482.71.256 1.076zm.105-2.835C14.692 8.95 9.085 8.766 5.82 9.757c-.496.15-1.022-.134-1.173-.63-.15-.496.134-1.022.63-1.173 3.755-1.14 9.948-.925 13.738 1.325.446.265.592.844.327 1.29-.265.447-.844.593-1.29.327z"/>
              </svg>
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">sesh music</span>
              <span className="block text-[10px] text-zinc-400 font-medium tracking-wider uppercase">Subsonic Hi-Fi</span>
            </div>
          </div>

          {/* Subsonic Server Status Pill */}
          <button
            onClick={() => setIsSubsonicModalOpen(true)}
            title={subsonicConfig.isConnected ? `Connected to ${subsonicConfig.serverName || 'Subsonic'}` : 'Connect Subsonic Server'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              subsonicConfig.isConnected
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/80'
                : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span className="max-w-[70px] truncate">{subsonicConfig.isConnected ? 'Connected' : 'Subsonic'}</span>
          </button>
        </div>

        {/* Primary Nav Links */}
        <nav className="flex flex-col gap-1 text-sm font-semibold">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex items-center gap-4 px-2 py-2 rounded-md transition-colors ${
              currentView === 'home' ? 'text-white font-bold' : 'hover:text-white'
            }`}
          >
            <Home className={`w-6 h-6 ${currentView === 'home' ? 'text-white' : ''}`} />
            <span>Home</span>
          </button>

          <button
            onClick={() => setCurrentView('search')}
            className={`flex items-center gap-4 px-2 py-2 rounded-md transition-colors ${
              currentView === 'search' ? 'text-white font-bold' : 'hover:text-white'
            }`}
          >
            <Search className={`w-6 h-6 ${currentView === 'search' ? 'text-white' : ''}`} />
            <span>Search</span>
          </button>
        </nav>
      </div>

      {/* Library Section Box */}
      <div className="bg-[#121212] rounded-lg p-3 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Library Header */}
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <button
            onClick={() => setCurrentView('library')}
            className="flex items-center gap-3 text-sm font-bold hover:text-white transition-colors"
          >
            <Library className="w-6 h-6" />
            <span>Your Library</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSmartPlaylistModalOpen(true)}
              title="Create Smart Playlist"
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Sparkles className="w-4 h-4 text-[#1ed760]" />
            </button>
            <button
              onClick={openCreatePlaylistModal}
              title="Create Playlist"
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 px-1 py-1 overflow-x-auto no-scrollbar text-xs font-medium">
          <button
            onClick={() => setLibraryFilter('all')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              libraryFilter === 'all'
                ? 'bg-white text-black font-semibold'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setLibraryFilter('playlists')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              libraryFilter === 'playlists'
                ? 'bg-white text-black font-semibold'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            Playlists
          </button>
          <button
            onClick={() => setLibraryFilter('downloaded')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              libraryFilter === 'downloaded'
                ? 'bg-white text-black font-semibold'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>Downloaded</span>
          </button>
        </div>

        {/* Offline Mode Switch Bar */}
        <div className="my-2 p-2 rounded-md bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isOfflineMode ? <WifiOff className="w-4 h-4 text-amber-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
            <div>
              <span className="text-white font-medium block">Offline Mode</span>
              <span className="text-[10px] text-zinc-400">{cachedTrackIds.size} tracks cached</span>
            </div>
          </div>
          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isOfflineMode ? 'bg-[#1ed760]' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isOfflineMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Playlist & Library Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 mt-1 scrollbar-thin">
          {filteredPlaylists.map((pl) => {
            const isSelected = currentView === 'playlist' && selectedEntityId === pl.id;

            return (
              <div
                key={pl.id}
                onClick={() => setCurrentView('playlist', pl.id)}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors group ${
                  isSelected ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800/60'
                }`}
              >
                {/* Artwork */}
                <div className="relative w-12 h-12 rounded overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                  {pl.id === 'pl-liked' ? (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center">
                      <Heart className="w-5 h-5 fill-white text-white" />
                    </div>
                  ) : pl.coverArt && pl.coverArt.trim() ? (
                    <img
                      src={pl.coverArt || undefined}
                      alt={pl.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ListMusic className="w-6 h-6 text-zinc-500" />
                  )}

                  {pl.isSmart && (
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[#1ed760] flex items-center justify-center">
                      <Sparkles className="w-2 h-2 text-black" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#1ed760]' : 'text-white'}`}>
                    {pl.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    {pl.isPinned && <Pin className="w-3 h-3 text-[#1ed760] fill-current" />}
                    <span>{pl.isSmart ? 'Smart' : 'Playlist'}</span>
                    <span>•</span>
                    <span>
                      {pl.id === 'pl-offline-vault' || pl.smartRule?.type === 'offline_cached'
                        ? (cachedTracksList.length > 0 ? cachedTracksList.length : pl.tracks.length)
                        : pl.tracks.length}{' '}
                      songs
                    </span>
                  </div>
                </div>

                {/* Downloaded Checkmark */}
                {(pl.isDownloaded || pl.id === 'pl-offline-vault') && (
                  <CheckCircle2 className="w-4 h-4 text-[#1ed760] shrink-0" />
                )}

                {/* Edit Button for custom playlists */}
                {!pl.isSmart && pl.id !== 'pl-liked' && pl.id !== 'pl-offline-vault' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditPlaylistModal(pl);
                    }}
                    title="Edit details / Rename"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-zinc-400 rounded hover:bg-zinc-700/80 transition-all shrink-0 ml-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Utility Link */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <button
            onClick={() => setIsEqualizerOpen(true)}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>Gapless & EQ</span>
          </button>

          <button
            onClick={() => setIsSubsonicModalOpen(true)}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Cache ({cachedTrackIds.size})</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
