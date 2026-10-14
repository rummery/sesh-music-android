import React, { useState } from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  ArrowDownToLine,
  CheckCircle2,
  MoreHorizontal,
  Search,
  Sparkles,
  Server,
  Music,
  Pencil,
  Plus,
  Trash2,
  ListPlus,
  RefreshCw,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Playlist, Track } from '../../types/music';

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min ${seconds} sec`;
}

function formatTrackTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlaylistDetailView: React.FC<{ playlistId: string }> = ({ playlistId }) => {
  const {
    playlists,
    albums,
    allTracks,
    currentTrack,
    playbackState,
    playTrack,
    togglePlayPause,
    toggleLike,
    likedTrackIds,
    cachedTrackIds,
    cachedTracksList,
    downloadTrack,
    downloadPlaylist,
    downloadProgress,
    addToQueue,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    openEditPlaylistModal,
    openAddToPlaylistModal,
    setCurrentView,
    subsonicConfig,
    setIsSubsonicModalOpen,
    syncWithSubsonic,
    isSyncing,
  } = useMusic();

  const [filterQuery, setFilterQuery] = useState('');
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);

  // Check if it's a playlist or an album
  const playlist = playlists.find((p) => p.id === playlistId);
  const album = !playlist ? albums.find((a) => a.id === playlistId) : null;

  const isOfflineVault = playlist?.id === 'pl-offline-vault' || playlist?.smartRule?.type === 'offline_cached';
  const isCustomPlaylist = Boolean(playlist && !playlist.isSmart && playlist.id !== 'pl-liked' && playlist.id !== 'pl-offline-vault');
  const rawTracks = isOfflineVault
    ? (cachedTracksList.length > 0 ? cachedTracksList : playlist?.tracks || [])
    : (playlist?.tracks || album?.tracks || []);

  const title = playlist?.name || album?.name || 'Playlist';
  const description = playlist?.description || `${album?.genre || 'Album'} • Released ${album?.year || '2026'}`;
  const coverArt = playlist?.coverArt || album?.coverArt;
  const owner = playlist?.owner || album?.artist || 'sesh music';

  const tracks = rawTracks.filter((t) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
  });

  const totalDuration = rawTracks.reduce((acc, cur) => acc + (cur.duration || 0), 0);
  const isCurrentCollectionPlaying =
    currentTrack &&
    playbackState === 'playing' &&
    rawTracks.some((t) => t.id === currentTrack.id);

  const isAllDownloaded = isOfflineVault
    ? true
    : rawTracks.length > 0 && rawTracks.every((t) => cachedTrackIds.has(t.id));

  const handlePlayAll = () => {
    if (isCurrentCollectionPlaying) {
      togglePlayPause();
    } else if (rawTracks.length > 0) {
      playTrack(rawTracks[0], rawTracks);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      {/* Dynamic Gradient Hero Header */}
      <div className="p-6 md:p-8 bg-gradient-to-b from-indigo-900/60 via-zinc-900/80 to-[#121212] flex flex-col md:flex-row items-center md:items-end gap-6 border-b border-zinc-800/40">
        {/* Cover Art */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg overflow-hidden shrink-0 shadow-2xl shadow-black/80 bg-zinc-900">
          {playlist?.id === 'pl-liked' ? (
            <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center">
              <Heart className="w-20 h-20 fill-white text-white" />
            </div>
          ) : coverArt && coverArt.trim() ? (
            <img
              src={coverArt || undefined}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
              <Music className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Hero Metadata */}
        <div className="flex flex-col gap-2 min-w-0 text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {playlist?.isSmart ? 'Smart Playlist' : album ? 'Album' : 'Public Playlist'}
            </span>
            {playlist?.isSmart && (
              <span className="flex items-center gap-1 text-[11px] text-[#1ed760] font-semibold bg-[#1ed760]/10 px-2 py-0.5 rounded-full border border-[#1ed760]/20">
                <Sparkles className="w-3 h-3" />
                <span>Auto-Sync</span>
              </span>
            )}
            {isCustomPlaylist && playlist && (
              <span
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  playlist.subsonicSyncStatus === 'synced'
                    ? 'text-[#1ed760] bg-[#1ed760]/10 border-[#1ed760]/25'
                    : playlist.subsonicSyncStatus === 'syncing'
                    ? 'text-sky-400 bg-sky-500/10 border-sky-500/25 animate-pulse'
                    : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                }`}
              >
                {playlist.subsonicSyncStatus === 'synced' && <CheckCircle2 className="w-3 h-3 text-[#1ed760]" />}
                {playlist.subsonicSyncStatus === 'syncing' && <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />}
                <span>
                  {playlist.subsonicSyncStatus === 'synced'
                    ? 'Navidrome Synced'
                    : playlist.subsonicSyncStatus === 'syncing'
                    ? 'Syncing with Navidrome...'
                    : 'Source of Truth: Sesh Music'}
                </span>
              </span>
            )}
          </div>

          {isCustomPlaylist ? (
            <div className="flex items-center justify-center md:justify-start gap-3 group">
              <h1
                onClick={() => playlist && openEditPlaylistModal(playlist)}
                title="Click to rename / edit details"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight break-words cursor-pointer hover:underline decoration-white/30"
              >
                {title}
              </h1>
              <button
                onClick={() => playlist && openEditPlaylistModal(playlist)}
                title="Edit playlist details"
                className="opacity-70 group-hover:opacity-100 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all shrink-0"
              >
                <Pencil className="w-5 h-5 text-zinc-400 group-hover:text-white" />
              </button>
            </div>
          ) : (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight break-words">
              {title}
            </h1>
          )}

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
            {description}
          </p>

          <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-medium text-white/90 pt-1">
            <span className="font-bold">{owner}</span>
            <span>•</span>
            <span>{rawTracks.length} songs,</span>
            <span className="text-zinc-400">{formatDuration(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Action Bar (Play, Download, Filter) */}
      <div className="px-6 md:px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Main Big Green Play Button */}
          <button
            onClick={handlePlayAll}
            title={isCurrentCollectionPlaying ? 'Pause' : 'Play'}
            className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
          >
            {isCurrentCollectionPlaying ? (
              <Pause className="w-6 h-6 fill-black" />
            ) : (
              <Play className="w-6 h-6 fill-black ml-1" />
            )}
          </button>

          {/* Download Playlist Button */}
          {playlist && (
            <button
              onClick={() => downloadPlaylist(playlist)}
              title={isAllDownloaded ? 'All tracks downloaded offline' : 'Download playlist to offline cache'}
              className={`p-2.5 rounded-full transition-colors ${
                isAllDownloaded
                  ? 'text-[#1ed760] hover:text-[#1ed760]/80'
                  : 'text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {isAllDownloaded ? (
                <CheckCircle2 className="w-6 h-6 fill-current" />
              ) : (
                <ArrowDownToLine className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Edit Playlist Details Button */}
          {isCustomPlaylist && playlist && (
            <button
              onClick={() => openEditPlaylistModal(playlist)}
              title="Edit playlist name & description"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-zinc-700 hover:border-zinc-400 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-zinc-400" />
              <span>Edit Details</span>
            </button>
          )}

          {/* Subsonic / Navidrome Sync Button */}
          {subsonicConfig.isConnected && (
            <button
              onClick={() => syncWithSubsonic()}
              disabled={isSyncing}
              title="Sync playlist differences to Navidrome (sesh-music is source of truth)"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-700 hover:border-[#1ed760]/50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1ed760] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync to Navidrome'}</span>
            </button>
          )}
        </div>

        {/* Search within playlist */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search in playlist"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-zinc-800/80 hover:bg-zinc-800 text-white placeholder-zinc-500 text-xs rounded-full pl-9 pr-4 py-2 border border-zinc-700/60 focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>
      </div>

      {/* Spotify Table of Tracks */}
      <div className="px-6 md:px-8">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider select-none">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-6 md:col-span-5">Title</div>
          <div className="hidden md:block col-span-3">Album</div>
          <div className="hidden lg:block col-span-2">Date Added</div>
          <div className="col-span-5 md:col-span-3 lg:col-span-1 flex items-center justify-end pr-3">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Tracks List */}
        <div className="divide-y divide-zinc-900 mt-1">
          {tracks.map((track, index) => {
            const isPlayingThis = currentTrack?.id === track.id && playbackState === 'playing';
            const isSelected = currentTrack?.id === track.id;
            const isLiked = likedTrackIds.has(track.id);
            const isCached = cachedTrackIds.has(track.id);
            const progress = downloadProgress[track.id];

            return (
              <div
                key={track.id}
                onClick={() => playTrack(track, rawTracks)}
                className={`group grid grid-cols-12 gap-4 px-4 py-2.5 rounded-md items-center cursor-pointer transition-colors text-sm ${
                  isSelected ? 'bg-zinc-800/70 text-white' : 'hover:bg-zinc-800/40 text-zinc-300'
                }`}
              >
                {/* # or Play button */}
                <div className="col-span-1 text-center font-mono text-xs tabular-nums text-zinc-400">
                  <span className="group-hover:hidden">
                    {isPlayingThis ? (
                      <span className="flex items-center justify-center gap-0.5 h-4">
                        <span className="w-0.5 h-3 bg-[#1ed760] animate-pulse" />
                        <span className="w-0.5 h-4 bg-[#1ed760] animate-pulse delay-75" />
                        <span className="w-0.5 h-2 bg-[#1ed760] animate-pulse delay-150" />
                      </span>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) togglePlayPause();
                      else playTrack(track, rawTracks);
                    }}
                    className="hidden group-hover:flex items-center justify-center w-full text-white"
                  >
                    {isPlayingThis ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Title & Artist */}
                <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                    {track.coverArt && track.coverArt.trim() ? (
                      <img
                        src={track.coverArt || undefined}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`font-semibold truncate text-sm ${
                        isSelected ? 'text-[#1ed760]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </span>
                    <span className="text-xs text-zinc-400 truncate">
                      {track.artist}
                    </span>
                  </div>
                </div>

                {/* Album */}
                <div className="hidden md:block col-span-3 text-xs text-zinc-400 truncate hover:text-white">
                  {track.album}
                </div>

                {/* Date Added */}
                <div className="hidden lg:block col-span-2 text-xs text-zinc-400 font-mono">
                  {track.dateAdded || '2 days ago'}
                </div>

                {/* Duration & Actions */}
                <div className="col-span-5 md:col-span-3 lg:col-span-1 flex items-center justify-end gap-3 text-xs font-mono text-zinc-400">
                  {/* Download Progress / Cached checkmark */}
                  {progress !== undefined ? (
                    <span className="text-[10px] text-[#1ed760] font-sans font-bold">
                      {progress}%
                    </span>
                  ) : isCached ? (
                    <span title="Cached Offline">
                      <CheckCircle2 className="w-4 h-4 text-[#1ed760]" />
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTrack(track);
                      }}
                      title="Download Offline"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-opacity"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                    </button>
                  )}

                  {/* Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(track);
                    }}
                    className={`p-1 transition-transform ${
                      isLiked ? 'text-[#1ed760]' : 'opacity-0 group-hover:opacity-100 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1ed760]' : ''}`} />
                  </button>

                  {/* Duration */}
                  <span className="w-10 text-right tabular-nums">
                    {formatTrackTime(track.duration)}
                  </span>

                  {/* 3 dots context menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuTrackId(activeMenuTrackId === track.id ? null : track.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {activeMenuTrackId === track.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 w-52 bg-zinc-800 border border-zinc-700 rounded-md shadow-2xl py-1 z-30 text-xs font-sans text-white"
                      >
                        <button
                          onClick={() => {
                            addToQueue(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Add to Queue</span>
                        </button>
                        <button
                          onClick={() => {
                            openAddToPlaylistModal(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                        >
                          <ListPlus className="w-3.5 h-3.5 text-[#1ed760]" />
                          <span>Add to Playlist</span>
                        </button>
                        <button
                          onClick={() => {
                            downloadTrack(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{isCached ? 'Re-download' : 'Download for Offline'}</span>
                        </button>
                        {isCustomPlaylist && (
                          <button
                            onClick={() => {
                              removeTrackFromPlaylist(playlistId, track.id);
                              setActiveMenuTrackId(null);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-rose-900/40 text-rose-300 transition-colors flex items-center gap-2 border-t border-zinc-700/60 mt-1"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Remove from this playlist</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {tracks.length === 0 && (
          <div className="py-16 text-center text-zinc-400 space-y-4 max-w-md mx-auto">
            <CheckCircle2 className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">
              {isOfflineVault ? 'Your Offline Vault is Empty' : isCustomPlaylist ? 'This playlist is empty' : 'No tracks found'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isOfflineVault
                ? 'Download any songs, albums, or playlists across the app to store them in your local vault for offline listening without internet.'
                : isCustomPlaylist
                ? 'Search for your favorite tracks or add from the suggestions below to build your sesh playlist.'
                : 'No songs match your current filter query.'}
            </p>

            {isCustomPlaylist && (
              <div className="space-y-4 pt-2">
                <button
                  onClick={() => setCurrentView('search')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <Search className="w-4 h-4" />
                  <span>Search for songs to add</span>
                </button>

                {/* Quick suggestions */}
                <div className="pt-4 text-left border-t border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-300 mb-2">Recommended for this playlist:</p>
                  <div className="space-y-1.5">
                    {allTracks.slice(0, 3).map((recTrack) => (
                      <div
                        key={recTrack.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-9 h-9 rounded overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                            {recTrack.coverArt && recTrack.coverArt.trim() ? (
                              <img
                                src={recTrack.coverArt || undefined}
                                alt={recTrack.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{recTrack.title}</p>
                            <p className="text-[11px] text-zinc-400 truncate">{recTrack.artist}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => addTrackToPlaylist(playlistId, recTrack)}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-800 hover:bg-[#1ed760] hover:text-black text-xs font-semibold text-white border border-zinc-700 transition-colors shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
