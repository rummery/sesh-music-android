import React, { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  X,
  Play,
  Music,
  Sparkles,
  ArrowDownToLine,
  CheckCircle2,
  Heart,
  WifiOff,
  ListPlus,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Track } from '../../types/music';
import { subsonicClient } from '../../services/subsonicClient';

const GENRE_CARDS = [
  { name: 'Synthwave & Retro', color: 'from-fuchsia-700 to-indigo-900', query: 'Synthwave' },
  { name: 'Lo-Fi Chill & Study', color: 'from-amber-700 to-rose-900', query: 'Lo-Fi' },
  { name: 'Electronic & Laser', color: 'from-cyan-700 to-blue-900', query: 'Electronic' },
  { name: 'Indie Folk & Acoustic', color: 'from-emerald-700 to-teal-950', query: 'Indie' },
  { name: 'Heavy Rotation', color: 'from-purple-800 to-zinc-900', query: 'Synth' },
  { name: 'Night Drive', color: 'from-blue-700 to-slate-900', query: 'Highway' },
  { name: 'Coffee & Rain', color: 'from-orange-800 to-stone-900', query: 'Rain' },
  { name: 'Offline Vault', color: 'from-emerald-800 to-zinc-900', query: 'Pines' },
];

export const SearchView: React.FC = () => {
  const {
    allTracks,
    albums,
    artists,
    playTrack,
    setCurrentView,
    subsonicConfig,
    cachedTrackIds,
    downloadTrack,
    downloadProgress,
    toggleLike,
    likedTrackIds,
    isOfflineMode,
    setIsOfflineMode,
    openAddToPlaylistModal,
  } = useMusic();
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteTracks, setRemoteTracks] = useState<Track[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  // Search Subsonic remote server if connected, not in offline mode, and query has at least 2 chars
  useEffect(() => {
    if (isOfflineMode || !subsonicConfig.isConnected || searchQuery.trim().length < 2) {
      setRemoteTracks([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const res = await subsonicClient.search(searchQuery);
        setRemoteTracks(res.tracks || []);
      } catch {
        setRemoteTracks([]);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, subsonicConfig.isConnected, isOfflineMode]);

  // Local filtering
  const matchingTracks = searchQuery.trim()
    ? allTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const combinedTracks = isOfflineMode
    ? matchingTracks.filter((t) => cachedTrackIds.has(t.id))
    : [...matchingTracks, ...remoteTracks.filter((rt) => !matchingTracks.some((mt) => mt.id === rt.id))];

  const topResult = combinedTracks[0];

  const matchingAlbums = searchQuery.trim()
    ? albums.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 pb-32">
      {/* Offline Mode Alert Banner if active */}
      {isOfflineMode && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> Searching only downloaded offline music ({cachedTrackIds.size} tracks cached). Live server streaming is disabled.
            </span>
          </div>
          <button
            onClick={() => setIsOfflineMode(false)}
            className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold border border-amber-500/30 transition-colors shrink-0"
          >
            Go Online
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <SearchIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder={isOfflineMode ? "Search downloaded offline music..." : "What do you want to play? (Subsonic & Local)"}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white placeholder-zinc-400 text-sm rounded-full pl-11 pr-10 py-3 border border-transparent focus:border-zinc-500 focus:outline-none transition-colors"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* When Empty: Browse All Categories */}
      {!searchQuery.trim() ? (
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Browse All
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {GENRE_CARDS.map((card) => (
              <div
                key={card.name}
                onClick={() => setSearchQuery(card.query)}
                className={`h-40 rounded-xl p-4 bg-gradient-to-br ${card.color} cursor-pointer relative overflow-hidden shadow-lg group hover:scale-[1.02] active:scale-[0.98] transition-transform`}
              >
                <h3 className="font-extrabold text-lg text-white max-w-[130px] leading-tight break-words">
                  {card.name}
                </h3>
                <div className="absolute -bottom-2 -right-2 w-20 h-20 rounded-lg bg-black/20 transform rotate-12 flex items-center justify-center group-hover:rotate-6 transition-transform">
                  <Music className="w-10 h-10 text-white/40" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* Results Section */
        <div className="space-y-8">
          {isSearchingRemote && (
            <p className="text-xs text-[#1ed760] font-semibold animate-pulse">
              Querying Subsonic server catalog...
            </p>
          )}

          {combinedTracks.length === 0 && matchingAlbums.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 space-y-2">
              <p className="text-lg font-semibold text-white">No results found for "{searchQuery}"</p>
              <p className="text-xs">
                {isOfflineMode
                  ? 'No cached tracks matched your query. Turn off Offline Mode to search online.'
                  : 'Please verify your spelling or search by artist name.'}
              </p>
            </div>
          ) : (
            <>
              {/* Top Result & Songs Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Top Result Card */}
                {topResult && (
                  <div className="lg:col-span-5 space-y-3">
                    <h3 className="text-xl font-bold text-white">Top result</h3>
                    <div
                      onClick={() => playTrack(topResult, combinedTracks)}
                      className="group p-5 rounded-lg bg-[#181818] hover:bg-[#282828] cursor-pointer transition-colors relative flex flex-col justify-between shadow-xl"
                    >
                      <div className="w-24 h-24 rounded-lg overflow-hidden mb-4 shadow-lg bg-zinc-800 flex items-center justify-center">
                        {topResult.coverArt && topResult.coverArt.trim() ? (
                          <img
                            src={topResult.coverArt || undefined}
                            alt={topResult.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-10 h-10 text-zinc-600" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-2xl font-black text-white truncate mb-1">
                          {topResult.title}
                        </h4>
                        <p className="text-sm text-zinc-400">
                          <span className="text-white font-medium">{topResult.artist}</span>
                          <span className="mx-2">•</span>
                          <span>Song</span>
                        </p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddToPlaylistModal(topResult);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-700 hover:border-[#1ed760]/50 transition-colors"
                          >
                            <ListPlus className="w-3.5 h-3.5 text-[#1ed760]" />
                            <span>Add to Playlist</span>
                          </button>

                          {cachedTrackIds.has(topResult.id) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#1ed760] text-xs font-medium border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Cached Offline</span>
                            </span>
                          ) : downloadProgress[topResult.id] !== undefined ? (
                            <span className="inline-flex items-center gap-1 text-xs text-[#1ed760] font-bold">
                              <span>Downloading {downloadProgress[topResult.id]}%</span>
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadTrack(topResult);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white border border-zinc-700 transition-colors"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5 text-[#1ed760]" />
                              <span>Download for Offline</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Green Play Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playTrack(topResult, combinedTracks);
                        }}
                        className="absolute bottom-5 right-5 w-12 h-12 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105 active:scale-95"
                      >
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Matching Songs List */}
                <div className="lg:col-span-7 space-y-3">
                  <h3 className="text-xl font-bold text-white">Songs</h3>
                  <div className="space-y-1">
                    {combinedTracks.slice(0, 7).map((track) => {
                      const isCached = cachedTrackIds.has(track.id);
                      const isLiked = likedTrackIds.has(track.id);
                      const progress = downloadProgress[track.id];

                      return (
                        <div
                          key={track.id}
                          onClick={() => playTrack(track, combinedTracks)}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-[#282828] cursor-pointer group transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
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
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {track.title}
                              </p>
                              <p className="text-xs text-zinc-400 truncate">
                                {track.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-400">
                            {/* Add to Playlist */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAddToPlaylistModal(track);
                              }}
                              title="Add to Playlist"
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#1ed760] text-zinc-400 hover:scale-110 transition-all"
                            >
                              <ListPlus className="w-4 h-4" />
                            </button>

                            {/* Download Action */}
                            {progress !== undefined ? (
                              <span className="text-[10px] text-[#1ed760] font-bold">
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
                                <ArrowDownToLine className="w-4 h-4 text-zinc-400 hover:text-white" />
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

                            <span className="w-10 text-right tabular-nums">
                              {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Albums results */}
              {matchingAlbums.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xl font-bold text-white">Albums</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {matchingAlbums.map((alb) => (
                      <div
                        key={alb.id}
                        onClick={() => setCurrentView('album', alb.id)}
                        className="p-3.5 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="aspect-square w-full rounded-md overflow-hidden bg-zinc-800 mb-3 shadow flex items-center justify-center">
                          {alb.coverArt && alb.coverArt.trim() ? (
                            <img
                              src={alb.coverArt || undefined}
                              alt={alb.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-10 h-10 text-zinc-600" />
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white truncate">{alb.name}</h4>
                        <p className="text-xs text-zinc-400 truncate">{alb.artist}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
