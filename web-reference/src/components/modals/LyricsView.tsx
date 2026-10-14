import React, { useEffect, useRef } from 'react';
import { X, Mic2, Music } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const LyricsView: React.FC = () => {
  const { currentTrack, currentTime, isLyricsOpen, setIsLyricsOpen, seek } = useMusic();
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  const lyrics = currentTrack?.lyrics || [];

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i];
    const nextLine = lyrics[i + 1];
    if (nextLine) {
      if (currentTime >= line.time && currentTime < nextLine.time) {
        activeIndex = i;
        break;
      }
    } else if (currentTime >= line.time) {
      activeIndex = i;
      break;
    }
  }

  // Smooth auto-scroll active lyric into center
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!isLyricsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-950/95 via-[#121212]/98 to-black text-white flex flex-col backdrop-blur-xl animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1ed760] flex items-center justify-center text-black">
            <Mic2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{currentTrack?.title || 'Lyrics'}</h3>
            <p className="text-xs text-zinc-400">{currentTrack?.artist} • Synced Subsonic Lyrics</p>
          </div>
        </div>

        <button
          onClick={() => setIsLyricsOpen(false)}
          className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Lyrics Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-6 md:px-16 py-12 space-y-6 text-center select-none scrollbar-none">
        {lyrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3">
            <Music className="w-12 h-12 text-zinc-600" />
            <p className="text-lg font-bold text-white">No synchronized lyrics available</p>
            <p className="text-xs max-w-sm">
              This track does not have embedded LRC timestamps or Subsonic lyrics for this release.
            </p>
          </div>
        ) : (
          lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => seek(line.time)}
                className={`cursor-pointer transition-all duration-300 py-2 rounded-xl px-4 ${
                  isActive
                    ? 'text-white font-extrabold text-2xl md:text-3xl scale-105 bg-white/5 drop-shadow'
                    : 'text-zinc-500 hover:text-zinc-300 font-semibold text-lg md:text-xl'
                }`}
              >
                {line.text}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
