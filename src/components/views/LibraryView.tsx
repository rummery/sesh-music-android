import React, { useState } from 'react';
import {
  ListMusic,
  Plus,
  Sparkles,
  CheckCircle2,
  Trash2,
  HardDrive,
  Grid,
  List as ListIcon,
  Play,
  Heart,
  ArrowUpDown,
  Pencil,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Playlist, Album, Track } from '../../types/music';

export const LibraryView: React.FC = () => {
  const {
    playlists,
    albums,
    artists,
    allTracks,
    cachedTrackIds,
    cachedTracksList,
    cacheStorageEstimate,
    clearCache,
    removeCachedTrack,
    cacheAllDemoTracks,
    isOfflineMode,
    setIsOfflineMode,
    playTrack,
    setCurrentView,
    createPlaylist,
    openCreatePlaylistModal,
    openEditPlaylistModal,
    setIsSmartPlaylistModalOpen,
  } = useMusic();

  const [activeTab, setActiveTab] = useState<'playlists' | 'albums' | 'artists' | 'downloaded'>('playlists');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const cacheSizeMb = (cacheStorageEstimate.usedBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 pb-32">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Your Library
          </h1>
          <p className="text-xs text-zinc-400">
            {playlists.length} playlists • {albums.length} albums • {cachedTrackIds.size} downloaded offline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSmartPlaylistModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors border border-zinc-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>Smart Playlist</span>
          </button>

          <button
            onClick={openCreatePlaylistModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1ed760] hover:bg-[#1ed760]/90 text-black text-xs font-bold transition-colors shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Offline Storage Cache Meter */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-950 flex items-center justify-center text-[#1ed760] shrink-0 border border-emerald-800/60">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">IndexedDB Offline Storage</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
                {cachedTrackIds.size} songs cached ({cacheSizeMb} MB)
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] mt-0.5">
              Downloaded tracks are stored persistently in browser storage for zero-data offline playback.
            </p>
          </div>
        </div>

        {cachedTrackIds.size > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all offline cached music?')) {
                clearCache();
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-700 transition-colors shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Storage</span>
          </button>
        )}
      </div>

      {/* Tab Filter Chips */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-medium">
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              activeTab === 'playlists'
                ? 'bg-white text-black font-semibold'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            Playlists
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              activeTab === 'albums'
                ? 'bg-white text-black font-semibold'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            Albums
          </button>
          <button
            onClick={() => setActiveTab('artists')}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              activeTab === 'artists'
                ? 'bg-white text-black font-semibold'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            Artists
          </button>
          <button
            onClick={() => setActiveTab('downloaded')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
              activeTab === 'downloaded'
                ? 'bg-white text-black font-semibold'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>Downloaded</span>
          </button>
        </div>

        <div className="flex items-center gap-1 text-zinc-400">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded hover:text-white ${viewMode === 'grid' ? 'text-[#1ed760]' : ''}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded hover:text-white ${viewMode === 'list' ? 'text-[#1ed760]' : ''}`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid / List Contents */}
      {activeTab === 'playlists' && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-1'}>
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => setCurrentView('playlist', pl.id)}
              className={
                viewMode === 'grid'
                  ? 'group p-3.5 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg cursor-pointer transition-colors relative flex flex-col'
                  : 'flex items-center justify-between p-2.5 rounded-md hover:bg-zinc-800/60 cursor-pointer transition-colors'
              }
            >
              <div
                className={
                  viewMode === 'grid'
                    ? 'relative aspect-square w-full rounded-md overflow-hidden bg-zinc-800 mb-3 shadow'
                    : 'w-12 h-12 rounded overflow-hidden bg-zinc-800 mr-3 shrink-0'
                }
              >
                {pl.id === 'pl-liked' ? (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center">
                    <Heart className="w-8 h-8 fill-white text-white" />
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
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border border-zinc-700 flex items-center gap-1 text-[9px] text-[#1ed760] font-semibold">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Smart</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-white truncate mb-0.5 group-hover:text-[#1ed760] transition-colors">{pl.name}</h4>
                  <p className="text-xs text-zinc-400 truncate">
                    {pl.isSmart ? 'Auto-Sync' : 'Playlist'} •{' '}
                    {pl.id === 'pl-offline-vault' || pl.smartRule?.type === 'offline_cached'
                      ? (cachedTracksList.length > 0 ? cachedTracksList.length : pl.tracks.length)
                      : pl.tracks.length}{' '}
                    songs
                  </p>
                </div>
                {!pl.isSmart && pl.id !== 'pl-liked' && pl.id !== 'pl-offline-vault' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditPlaylistModal(pl);
                    }}
                    title="Edit details"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all ml-2"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'albums' && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-1'}>
          {albums.map((alb) => (
            <div
              key={alb.id}
              onClick={() => setCurrentView('album', alb.id)}
              className={
                viewMode === 'grid'
                  ? 'group p-3.5 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg cursor-pointer transition-colors relative flex flex-col'
                  : 'flex items-center justify-between p-2.5 rounded-md hover:bg-zinc-800/60 cursor-pointer transition-colors'
              }
            >
              <div
                className={
                  viewMode === 'grid'
                    ? 'relative aspect-square w-full rounded-md overflow-hidden bg-zinc-800 mb-3 shadow flex items-center justify-center'
                    : 'w-12 h-12 rounded overflow-hidden bg-zinc-800 mr-3 shrink-0 flex items-center justify-center'
                }
              >
                {alb.coverArt && alb.coverArt.trim() ? (
                  <img
                    src={alb.coverArt || undefined}
                    alt={alb.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ListMusic className="w-6 h-6 text-zinc-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-white truncate mb-0.5">{alb.name}</h4>
                <p className="text-xs text-zinc-400 truncate">
                  {alb.year} • {alb.artist}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'artists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {artists.map((art) => (
            <div
              key={art.id}
              onClick={() => {
                if (art.albums && art.albums[0]) {
                  setCurrentView('album', art.albums[0].id);
                }
              }}
              className="p-4 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg cursor-pointer transition-colors flex flex-col items-center text-center group"
            >
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-zinc-800 mb-3 shadow-lg flex items-center justify-center">
                {art.coverArt && art.coverArt.trim() ? (
                  <img
                    src={art.coverArt || undefined}
                    alt={art.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <ListMusic className="w-8 h-8 text-zinc-500" />
                )}
              </div>
              <h4 className="font-bold text-sm text-white truncate w-full">{art.name}</h4>
              <p className="text-xs text-zinc-400">Artist</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'downloaded' && (
        <div className="space-y-4">
          {/* Header Action Bar for Downloaded Tab */}
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-zinc-400">
              {cachedTracksList.length > 0 ? cachedTracksList.length : cachedTrackIds.size} tracks stored in browser IndexedDB
            </span>
            <div className="flex items-center gap-2">
              {(cachedTracksList.length > 0 || cachedTrackIds.size > 0) && (
                <button
                  onClick={() => {
                    const list = cachedTracksList.length > 0 ? cachedTracksList : allTracks.filter((t) => cachedTrackIds.has(t.id));
                    if (list.length > 0) playTrack(list[0], list);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1ed760] hover:bg-[#1ed760]/90 text-black text-xs font-bold transition-transform hover:scale-105 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play All Offline</span>
                </button>
              )}
              {cachedTracksList.length === 0 && (
                <button
                  onClick={() => cacheAllDemoTracks()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700"
                >
                  <span>Pre-cache Demo Library</span>
                </button>
              )}
            </div>
          </div>

          {(cachedTracksList.length > 0 ? cachedTracksList : allTracks.filter((t) => cachedTrackIds.has(t.id))).length === 0 ? (
            <div className="text-center py-16 text-zinc-400 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
              <p className="text-base font-semibold text-white">No tracks downloaded yet</p>
              <p className="text-xs max-w-sm mx-auto text-zinc-400">
                Click the download icon on any playlist, song, or search result to cache it locally for zero-data offline playback.
              </p>
              <button
                onClick={() => cacheAllDemoTracks()}
                className="mt-2 px-4 py-2 rounded-full bg-[#1ed760] text-black text-xs font-bold hover:scale-105 transition-transform"
              >
                Pre-cache 4 Demo Songs for Offline
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {(cachedTracksList.length > 0 ? cachedTracksList : allTracks.filter((t) => cachedTrackIds.has(t.id))).map((track, idx, arr) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, arr)}
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-zinc-800/60 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span className="w-5 text-center text-xs text-zinc-500 font-mono">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                      {track.coverArt && track.coverArt.trim() ? (
                        <img
                          src={track.coverArt || undefined}
                          alt={track.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ListMusic className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                      <p className="text-xs text-zinc-400 truncate">{track.artist} {track.album ? `• ${track.album}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1 text-[11px] text-[#1ed760] font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cached Offline</span>
                    </span>
                    <span className="tabular-nums">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCachedTrack(track.id);
                      }}
                      title="Remove from offline cache"
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
