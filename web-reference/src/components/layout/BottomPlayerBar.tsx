import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Mic2,
  ListMusic,
  Sliders,
  Server,
  Heart,
  Maximize2,
  CheckCircle2,
  ArrowDownToLine,
  Zap,
  ListPlus,
  Music,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const BottomPlayerBar: React.FC = () => {
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    likedTrackIds,
    cachedTrackIds,
    downloadTrack,
    downloadProgress,
    equalizerSettings,
    subsonicConfig,
    isLyricsOpen,
    setIsLyricsOpen,
    isQueueOpen,
    setIsQueueOpen,
    isEqualizerOpen,
    setIsEqualizerOpen,
    setIsSubsonicModalOpen,
    setIsMobilePlayerExpanded,
    setCurrentView,
    openAddToPlaylistModal,
  } = useMusic();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const isPlaying = playbackState === 'playing';
  const isLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false;
  const isCached = currentTrack ? cachedTrackIds.has(currentTrack.id) : false;

  const currentProgress = duration > 0 ? (isScrubbing ? scrubValue : (currentTime / duration) * 100) : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubValue(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    setIsScrubbing(false);
    if (duration > 0) {
      seek((scrubValue / 100) * duration);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!currentTrack) {
    return (
      <footer className="hidden md:flex h-20 bg-black border-t border-zinc-900 px-4 items-center justify-between text-zinc-500 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Zap className="w-6 h-6 text-zinc-700" />
          </div>
          <div>
            <p className="text-zinc-400 font-medium">Ready to play</p>
            <p className="text-xs text-zinc-600">Select any track or playlist from sesh library</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="hidden md:grid grid-cols-12 h-20 bg-[#181818] border-t border-zinc-800/60 px-4 items-center select-none z-30">
      {/* Left: Track Details */}
      <div className="col-span-3 flex items-center gap-3 min-w-0 pr-2">
        <div
          onClick={() => setIsMobilePlayerExpanded(true)}
          className="relative w-14 h-14 rounded overflow-hidden shrink-0 shadow-md cursor-pointer group bg-zinc-900 flex items-center justify-center"
        >
          {currentTrack.coverArt && currentTrack.coverArt.trim() ? (
            <img
              src={currentTrack.coverArt || undefined}
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            />
          ) : (
            <Music className="w-6 h-6 text-zinc-600" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <span
            onClick={() => {
              if (currentTrack.albumId) {
                setCurrentView('playlist', currentTrack.albumId);
              }
            }}
            className="text-sm font-semibold text-white truncate hover:underline cursor-pointer"
            title={currentTrack.title}
          >
            {currentTrack.title}
          </span>
          <span className="text-xs text-zinc-400 truncate hover:text-white hover:underline cursor-pointer">
            {currentTrack.artist}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-1">
          <button
            onClick={() => toggleLike(currentTrack)}
            title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${
                isLiked ? 'text-[#1ed760] fill-[#1ed760]' : 'hover:scale-110'
              } transition-transform`}
            />
          </button>

          {downloadProgress[currentTrack.id] !== undefined ? (
            <span className="text-[10px] text-[#1ed760] font-mono font-bold">
              {downloadProgress[currentTrack.id]}%
            </span>
          ) : isCached ? (
            <span title="Offline Cached in IndexedDB">
              <CheckCircle2 className="w-4 h-4 text-[#1ed760]" />
            </span>
          ) : (
            <button
              onClick={() => downloadTrack(currentTrack)}
              title="Download for Offline Playback"
              className="p-1 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowDownToLine className="w-4 h-4" />
            </button>
          )}

          {/* Add to Playlist Button */}
          <button
            onClick={() => openAddToPlaylistModal(currentTrack)}
            title="Add to Playlist"
            className="p-1 rounded-full text-zinc-400 hover:text-[#1ed760] transition-colors"
          >
            <ListPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Controls & Scrub Bar */}
      <div className="col-span-6 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
        {/* Buttons */}
        <div className="flex items-center gap-4 mb-1">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
            className={`p-1.5 rounded-full transition-colors relative ${
              isShuffle ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />}
          </button>

          {/* Previous */}
          <button
            onClick={prevTrack}
            title="Previous Track"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            title="Next Track"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            title={`Repeat: ${repeatMode}`}
            className={`p-1.5 rounded-full transition-colors relative ${
              repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />
            )}
          </button>
        </div>

        {/* Scrub Bar */}
        <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-mono tabular-nums">
          <span className="w-9 text-right">{formatTime(isScrubbing ? (scrubValue / 100) * duration : currentTime)}</span>

          <div className="relative flex-1 group flex items-center h-4 cursor-pointer">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={currentProgress}
              onMouseDown={() => setIsScrubbing(true)}
              onTouchStart={() => setIsScrubbing(true)}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
            {/* Visual Track */}
            <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden relative group-hover:h-1.5 transition-all">
              <div
                className="h-full bg-white group-hover:bg-[#1ed760] transition-colors rounded-full"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            {/* Knob */}
            <div
              className="absolute w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -ml-1.5"
              style={{ left: `${currentProgress}%` }}
            />
          </div>

          <span className="w-9">{formatTime(duration)}</span>

          {equalizerSettings.gaplessEnabled && (
            <span
              title="Gapless Web Audio Buffer Enabled"
              className="hidden lg:inline text-[9px] font-sans font-bold text-[#1ed760]/80 uppercase tracking-wider px-1 bg-[#1ed760]/10 rounded border border-[#1ed760]/20"
            >
              Gapless
            </span>
          )}
        </div>
      </div>

      {/* Right: Audio FX, Lyrics, Queue, Volume */}
      <div className="col-span-3 flex items-center justify-end gap-2 text-zinc-400">
        {/* Lyrics */}
        <button
          onClick={() => setIsLyricsOpen(!isLyricsOpen)}
          title="Synced Karaoke Lyrics"
          className={`p-1.5 rounded-full hover:text-white transition-colors ${
            isLyricsOpen ? 'text-[#1ed760]' : ''
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue */}
        <button
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          title="Play Queue"
          className={`p-1.5 rounded-full hover:text-white transition-colors ${
            isQueueOpen ? 'text-[#1ed760]' : ''
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Equalizer */}
        <button
          onClick={() => setIsEqualizerOpen(true)}
          title="5-Band Equalizer & Crossfade"
          className={`p-1.5 rounded-full hover:text-white transition-colors ${
            isEqualizerOpen ? 'text-[#1ed760]' : ''
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Subsonic Server Indicator */}
        <button
          onClick={() => setIsSubsonicModalOpen(true)}
          title={
            subsonicConfig.isConnected
              ? `Subsonic Active: ${subsonicConfig.serverName} (${subsonicConfig.latencyMs || 25}ms)`
              : 'Subsonic Server Settings'
          }
          className="p-1.5 rounded-full hover:text-white transition-colors"
        >
          <Server
            className={`w-4 h-4 ${
              subsonicConfig.isConnected ? 'text-[#1ed760]' : 'text-zinc-500'
            }`}
          />
        </button>

        {/* Volume */}
        <div className="flex items-center gap-1.5 pl-1">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="p-1 rounded hover:text-white transition-colors"
          >
            <VolumeIcon className="w-4 h-4" />
          </button>

          <div className="relative w-20 group flex items-center h-4 cursor-pointer">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
            <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden relative group-hover:h-1.5 transition-all">
              <div
                className="h-full bg-white group-hover:bg-[#1ed760] transition-colors rounded-full"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
