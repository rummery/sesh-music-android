import React from 'react';
import { Play, Pause, Heart, CheckCircle2, Music } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    togglePlayPause,
    toggleLike,
    likedTrackIds,
    cachedTrackIds,
    setIsMobilePlayerExpanded,
  } = useMusic();

  if (!currentTrack) return null;

  const isPlaying = playbackState === 'playing';
  const isLiked = likedTrackIds.has(currentTrack.id);
  const isCached = cachedTrackIds.has(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="md:hidden fixed bottom-16 left-2 right-2 z-40">
      <div
        onClick={() => setIsMobilePlayerExpanded(true)}
        className="bg-[#282828] text-white rounded-lg p-2 flex items-center justify-between shadow-2xl border border-zinc-700/50 cursor-pointer overflow-hidden relative"
      >
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-zinc-800 shadow flex items-center justify-center">
            {currentTrack.coverArt && currentTrack.coverArt.trim() ? (
              <img
                src={currentTrack.coverArt || undefined}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-5 h-5 text-zinc-600" />
            )}
          </div>
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-semibold truncate text-white">
              {currentTrack.title}
            </span>
            <span className="text-[11px] text-zinc-400 truncate">
              {currentTrack.artist}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 pr-1" onClick={(e) => e.stopPropagation()}>
          {isCached && (
            <span title="Offline Downloaded">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1ed760]" />
            </span>
          )}

          <button
            onClick={() => toggleLike(currentTrack)}
            className="p-1.5 text-zinc-300 hover:text-white"
          >
            <Heart
              className={`w-4 h-4 ${
                isLiked ? 'text-[#1ed760] fill-[#1ed760]' : ''
              }`}
            />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-transform shadow"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>
        </div>

        {/* Bottom Micro Progress Line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-zinc-700">
          <div
            className="h-full bg-[#1ed760] transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
