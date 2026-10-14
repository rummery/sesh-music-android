import React from 'react';
import { X, Play, Trash2, Sparkles, ListMusic, Music } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const QueueModal: React.FC = () => {
  const {
    currentTrack,
    queue,
    removeFromQueue,
    clearQueue,
    playTrack,
    allTracks,
    addToQueue,
    isQueueOpen,
    setIsQueueOpen,
  } = useMusic();

  if (!isQueueOpen) return null;

  const currentTrackIndex = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;
  const nextUpTracks = currentTrackIndex >= 0 ? queue.slice(currentTrackIndex + 1) : queue;

  const handleAddSmartRecommendations = () => {
    if (!currentTrack) return;
    const candidates = allTracks.filter(
      (t) => !queue.some((q) => q.id === t.id) && t.genre === currentTrack.genre
    );
    const added = candidates.slice(0, 3);
    added.forEach((t) => addToQueue(t));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#181818] text-white h-full flex flex-col border-l border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[#1ed760]" />
            <h3 className="font-bold text-base text-white">Play Queue</h3>
          </div>

          <div className="flex items-center gap-2">
            {nextUpTracks.length > 0 && (
              <button
                onClick={clearQueue}
                title="Clear upcoming queue"
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsQueueOpen(false)}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Now Playing */}
          {currentTrack && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Now Playing
              </span>
              <div className="flex items-center gap-3 p-3 bg-zinc-800/80 rounded-lg border border-zinc-700/50">
                <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-zinc-900 shadow flex items-center justify-center">
                  {currentTrack.coverArt && currentTrack.coverArt.trim() ? (
                    <img
                      src={currentTrack.coverArt || undefined}
                      alt={currentTrack.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-6 h-6 text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-[#1ed760] truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {currentTrack.artist}
                  </p>
                </div>
                {/* Sound wave icon */}
                <div className="flex items-center gap-0.5 h-4 pr-1">
                  <span className="w-0.5 h-3 bg-[#1ed760] animate-pulse" />
                  <span className="w-0.5 h-4 bg-[#1ed760] animate-pulse delay-75" />
                  <span className="w-0.5 h-2 bg-[#1ed760] animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* Next Up */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Next in Queue ({nextUpTracks.length})
              </span>
              <button
                onClick={handleAddSmartRecommendations}
                className="flex items-center gap-1 text-[11px] text-[#1ed760] hover:underline font-semibold"
              >
                <Sparkles className="w-3 h-3" />
                <span>Smart Auto-Fill</span>
              </button>
            </div>

            {nextUpTracks.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 space-y-2 bg-zinc-900/40 rounded-lg p-4 border border-zinc-800/60">
                <Music className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-sm font-semibold text-white">Queue is empty</p>
                <p className="text-xs">Add tracks or click Smart Auto-Fill to populate similar songs.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {nextUpTracks.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-800/60 group transition-colors"
                  >
                    <div
                      onClick={() => playTrack(track)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="w-4 text-center text-xs text-zinc-500 font-mono">
                        {idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
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
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-medium text-white truncate group-hover:text-[#1ed760] transition-colors">
                          {track.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromQueue(currentTrackIndex + 1 + idx)}
                      title="Remove from queue"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-white transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
