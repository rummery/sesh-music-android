import React, { useState } from 'react';
import {
  ChevronDown,
  MoreVertical,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Mic2,
  ListMusic,
  Sliders,
  Server,
  CheckCircle2,
  ArrowDownToLine,
  Music,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const FullScreenPlayerModal: React.FC = () => {
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    likedTrackIds,
    cachedTrackIds,
    downloadTrack,
    isMobilePlayerExpanded,
    setIsMobilePlayerExpanded,
    setIsLyricsOpen,
    setIsQueueOpen,
    setIsEqualizerOpen,
    setIsSubsonicModalOpen,
    subsonicConfig,
    equalizerSettings,
  } = useMusic();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  if (!isMobilePlayerExpanded || !currentTrack) return null;

  const isPlaying = playbackState === 'playing';
  const isLiked = likedTrackIds.has(currentTrack.id);
  const isCached = cachedTrackIds.has(currentTrack.id);

  const currentProgress = duration > 0 ? (isScrubbing ? scrubValue : (currentTime / duration) * 100) : 0;

  // Active lyric snippet preview
  const currentLyricsLine = currentTrack.lyrics?.find((l, idx, arr) => {
    const nextLine = arr[idx + 1];
    if (nextLine) {
      return currentTime >= l.time && currentTime < nextLine.time;
    }
    return currentTime >= l.time;
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#121212] text-white flex flex-col justify-between overflow-y-auto p-6 md:p-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsMobilePlayerExpanded(false)}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition-all"
        >
          <ChevronDown className="w-6 h-6 text-white" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
            Playing From Album
          </span>
          <span className="text-xs font-semibold text-white truncate max-w-[200px]">
            {currentTrack.album}
          </span>
        </div>

        <button
          onClick={() => setIsSubsonicModalOpen(true)}
          className="p-2 -mr-2 rounded-full hover:bg-white/10 text-zinc-400"
        >
          <MoreVertical className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Album Artwork */}
      <div className="my-auto py-4 flex flex-col items-center">
        <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          {currentTrack.coverArt && currentTrack.coverArt.trim() ? (
            <img
              src={currentTrack.coverArt || undefined}
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-24 h-24 text-zinc-600" />
          )}
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Title, Artist, & Actions */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h2 className="text-xl font-bold truncate text-white">
              {currentTrack.title}
            </h2>
            <p className="text-sm font-medium text-zinc-400 truncate">
              {currentTrack.artist}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isCached ? (
              <span title="Downloaded in Offline Cache">
                <CheckCircle2 className="w-5 h-5 text-[#1ed760]" />
              </span>
            ) : (
              <button
                onClick={() => downloadTrack(currentTrack)}
                title="Download for offline playback"
                className="p-1 text-zinc-400 hover:text-white"
              >
                <ArrowDownToLine className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => toggleLike(currentTrack)}
              className="p-1 text-zinc-400 hover:text-white active:scale-125 transition-transform"
            >
              <Heart
                className={`w-6 h-6 ${
                  isLiked ? 'text-[#1ed760] fill-[#1ed760]' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Scrub Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="relative flex items-center h-4 cursor-pointer">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={currentProgress}
              onMouseDown={() => setIsScrubbing(true)}
              onTouchStart={() => setIsScrubbing(true)}
              onChange={(e) => setScrubValue(parseFloat(e.target.value))}
              onMouseUp={() => {
                setIsScrubbing(false);
                if (duration > 0) seek((scrubValue / 100) * duration);
              }}
              onTouchEnd={() => {
                setIsScrubbing(false);
                if (duration > 0) seek((scrubValue / 100) * duration);
              }}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
            <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono tabular-nums">
            <span>{formatTime(isScrubbing ? (scrubValue / 100) * duration : currentTime)}</span>
            {equalizerSettings.gaplessEnabled && (
              <span className="text-[10px] text-[#1ed760] font-sans font-bold uppercase tracking-wider">
                Gapless Playback
              </span>
            )}
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls Row */}
        <div className="flex items-center justify-between px-2">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors relative ${
              isShuffle ? 'text-[#1ed760]' : 'text-zinc-400'
            }`}
          >
            <Shuffle className="w-5 h-5" />
            {isShuffle && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />}
          </button>

          {/* Previous */}
          <button
            onClick={prevTrack}
            className="p-2 text-white active:scale-95 transition-transform"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-transform shadow-xl shadow-black/50"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-black" />
            ) : (
              <Play className="w-7 h-7 fill-black ml-1" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="p-2 text-white active:scale-95 transition-transform"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={`p-2 transition-colors relative ${
              repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-zinc-400'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />
            )}
          </button>
        </div>

        {/* Mini Lyrics Preview Card */}
        {currentTrack.lyrics && currentTrack.lyrics.length > 0 && (
          <div
            onClick={() => {
              setIsMobilePlayerExpanded(false);
              setIsLyricsOpen(true);
            }}
            className="bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 p-4 rounded-xl cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Mic2 className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>Lyrics</span>
              </span>
              <span className="text-[#1ed760]">Full View</span>
            </div>
            <p className="text-sm font-semibold text-white line-clamp-2">
              {currentLyricsLine?.text || currentTrack.lyrics[0]?.text}
            </p>
          </div>
        )}

        {/* Bottom Drawer Bar */}
        <div className="flex items-center justify-between text-zinc-400 pt-1">
          <button
            onClick={() => setIsSubsonicModalOpen(true)}
            className="flex items-center gap-1.5 text-xs hover:text-white"
          >
            <Server className={`w-4 h-4 ${subsonicConfig.isConnected ? 'text-[#1ed760]' : ''}`} />
            <span className="truncate max-w-[120px]">{subsonicConfig.isConnected ? 'Subsonic' : 'Offline'}</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEqualizerOpen(true)}
              className="p-1 hover:text-white"
            >
              <Sliders className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsMobilePlayerExpanded(false);
                setIsQueueOpen(true);
              }}
              className="p-1 hover:text-white"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
