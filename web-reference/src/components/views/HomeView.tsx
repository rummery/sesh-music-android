import React, { useMemo } from 'react';
import { Play, Sparkles, Server, CheckCircle2, Heart, ArrowRight, WifiOff, Music } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Album, Playlist, Track } from '../../types/music';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const HomeView: React.FC = () => {
  const {
    playlists,
    albums,
    allTracks,
    playTrack,
    currentTrack,
    playbackState,
    setCurrentView,
    subsonicConfig,
    isOfflineMode,
    setIsOfflineMode,
    cachedTrackIds,
    cachedTracksList,
    setIsSubsonicModalOpen,
    setIsSmartPlaylistModalOpen,
  } = useMusic();

  const greeting = useMemo(() => getGreeting(), []);

  // 6 quick cards for Spotify top grid
  const quickItems = useMemo(() => {
    return [
      {
        id: 'pl-liked',
        type: 'playlist' as const,
        name: 'Liked Songs',
        coverArt: playlists.find((p) => p.id === 'pl-liked')?.coverArt || albums[0]?.coverArt,
        isLikedSpecial: true,
        tracks: playlists.find((p) => p.id === 'pl-liked')?.tracks || [],
      },
      {
        id: 'pl-heavy-rotation',
        type: 'playlist' as const,
        name: 'Heavy Rotation',
        coverArt: albums[2]?.coverArt,
        tracks: playlists.find((p) => p.id === 'pl-heavy-rotation')?.tracks || [],
      },
      {
        id: 'pl-offline-vault',
        type: 'playlist' as const,
        name: 'Offline Vault',
        coverArt: albums[1]?.coverArt,
        tracks: (cachedTracksList.length > 0 ? cachedTracksList : playlists.find((p) => p.id === 'pl-offline-vault')?.tracks) || [],
      },
      {
        id: albums[0]?.id || 'album-neon',
        type: 'album' as const,
        name: albums[0]?.name || 'Neon Reflections',
        coverArt: albums[0]?.coverArt,
        tracks: albums[0]?.tracks || [],
      },
      {
        id: albums[1]?.id || 'album-lofi',
        type: 'album' as const,
        name: albums[1]?.name || 'Twilight Tones',
        coverArt: albums[1]?.coverArt,
        tracks: albums[1]?.tracks || [],
      },
      {
        id: albums[2]?.id || 'album-prismatik',
        type: 'album' as const,
        name: albums[2]?.name || 'Spectrum Pulse',
        coverArt: albums[2]?.coverArt,
        tracks: albums[2]?.tracks || [],
      },
    ];
  }, [playlists, albums]);

  const handlePlayCollection = (e: React.MouseEvent, tracks: Track[]) => {
    e.stopPropagation();
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-8 pb-32">
      {/* Offline Mode Active Banner */}
      {isOfflineMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/30">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Offline Mode Active</h4>
              <p className="text-xs text-amber-300/80">
                Playing strictly from local IndexedDB storage ({cachedTrackIds.size} songs cached). Remote server streaming is blocked for zero mobile data usage.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOfflineMode(false)}
            className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shrink-0 shadow"
          >
            Go Online
          </button>
        </div>
      )}

      {/* Subsonic Connectivity Status Banner (if not connected and not offline) */}
      {!subsonicConfig.isConnected && !isOfflineMode && (
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1ed760]/10 flex items-center justify-center text-[#1ed760] shrink-0 border border-[#1ed760]/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Standalone / Demo Library Active</h4>
              <p className="text-xs text-zinc-400">
                Playing rich local audio assets with gapless playback. Connect your Navidrome or Subsonic server to stream your full library.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSubsonicModalOpen(true)}
            className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-[#1ed760] transition-colors shrink-0"
          >
            Connect Server
          </button>
        </div>
      )}

      {/* Top Greeting & Smart Playlists Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {greeting}
          </h1>

          <button
            onClick={() => setIsSmartPlaylistModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors border border-zinc-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>New Smart Playlist</span>
          </button>
        </div>

        {/* 6 Quick-Access Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickItems.map((item) => {
            const isItemPlaying =
              currentTrack &&
              playbackState === 'playing' &&
              item.tracks.some((t) => t.id === currentTrack.id);

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.type === 'album') {
                    setCurrentView('album', item.id);
                  } else {
                    setCurrentView('playlist', item.id);
                  }
                }}
                className="group relative flex items-center gap-3 bg-zinc-800/40 hover:bg-zinc-800/90 rounded-md overflow-hidden cursor-pointer transition-colors shadow-sm"
              >
                {/* Cover thumbnail */}
                <div className="w-16 h-16 shrink-0 relative bg-zinc-800 flex items-center justify-center">
                  {item.isLikedSpecial ? (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center">
                      <Heart className="w-6 h-6 fill-white text-white" />
                    </div>
                  ) : item.coverArt && item.coverArt.trim() ? (
                    <img
                      src={item.coverArt || undefined}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-6 h-6 text-zinc-600" />
                  )}
                </div>

                {/* Name */}
                <span className="font-bold text-sm text-white truncate flex-1 pr-3">
                  {item.name}
                </span>

                {/* Play Button on hover */}
                <button
                  onClick={(e) => handlePlayCollection(e, item.tracks)}
                  title="Play"
                  className={`mr-3 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-black/60 transition-all ${
                    isItemPlaying
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'
                  } hover:scale-105 active:scale-95`}
                >
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 1: Made For You (Smart Playlists) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Smart Playlists
            </h2>
            <p className="text-xs text-zinc-400">
              Dynamically calculated based on your listening habits, offline cache, and favorites
            </p>
          </div>
          <button
            onClick={() => setCurrentView('library')}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Show all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists
            .filter((p) => p.isSmart)
            .map((pl) => (
              <div
                key={pl.id}
                onClick={() => setCurrentView('playlist', pl.id)}
                className="group p-3.5 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg cursor-pointer transition-colors flex flex-col relative"
              >
                <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-800 mb-3 shadow-md flex items-center justify-center">
                  {pl.id === 'pl-liked' ? (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center">
                      <Heart className="w-12 h-12 fill-white text-white" />
                    </div>
                  ) : pl.coverArt && pl.coverArt.trim() ? (
                    <img
                      src={pl.coverArt || undefined}
                      alt={pl.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-10 h-10 text-zinc-600" />
                  )}

                  {/* Smart Icon Badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-zinc-700 flex items-center gap-1 text-[10px] text-[#1ed760] font-semibold">
                    <Sparkles className="w-3 h-3" />
                    <span>Smart</span>
                  </div>

                  {/* Hover Play Button */}
                  <button
                    onClick={(e) => handlePlayCollection(e, pl.tracks)}
                    className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  </button>
                </div>

                <h3 className="font-bold text-sm text-white truncate mb-1">{pl.name}</h3>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {pl.description || `Playlist • ${pl.tracks.length} songs`}
                </p>
              </div>
            ))}
        </div>
      </section>

      {/* Section 2: Subsonic Albums */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Featured Albums & Master Audio
            </h2>
            <p className="text-xs text-zinc-400">
              Gapless playback, 320kbps streams, and studio acoustics
            </p>
          </div>
          <button
            onClick={() => setCurrentView('library')}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Show all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {albums.map((alb) => (
            <div
              key={alb.id}
              onClick={() => setCurrentView('album', alb.id)}
              className="group p-3.5 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg cursor-pointer transition-colors flex flex-col relative"
            >
              <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-800 mb-3 shadow-lg flex items-center justify-center">
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

                <button
                  onClick={(e) => handlePlayCollection(e, alb.tracks || [])}
                  className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                </button>
              </div>

              <h3 className="font-bold text-sm text-white truncate mb-1">{alb.name}</h3>
              <p className="text-xs text-zinc-400 truncate">
                {alb.year} • {alb.artist}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Curated Playlists */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Popular Sesh Mixes
            </h2>
            <p className="text-xs text-zinc-400">Hand-curated for night sessions, deep work, and relaxation</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {playlists
            .filter((p) => !p.isSmart)
            .map((pl) => (
              <div
                key={pl.id}
                onClick={() => setCurrentView('playlist', pl.id)}
                className="group p-3.5 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg cursor-pointer transition-colors flex flex-col relative"
              >
                <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-800 mb-3 shadow-md flex items-center justify-center">
                  {pl.coverArt && pl.coverArt.trim() ? (
                    <img
                      src={pl.coverArt || undefined}
                      alt={pl.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-10 h-10 text-zinc-600" />
                  )}

                  <button
                    onClick={(e) => handlePlayCollection(e, pl.tracks)}
                    className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  </button>
                </div>

                <h3 className="font-bold text-sm text-white truncate mb-1">{pl.name}</h3>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {pl.description || `Playlist • ${pl.tracks.length} songs`}
                </p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
};
