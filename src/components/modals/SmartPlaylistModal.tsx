import React, { useState } from 'react';
import { X, Sparkles, Filter, Check } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const SmartPlaylistModal: React.FC = () => {
  const {
    createSmartPlaylist,
    isSmartPlaylistModalOpen,
    setIsSmartPlaylistModalOpen,
    setCurrentView,
  } = useMusic();

  const [playlistName, setPlaylistName] = useState('My Smart Flow');
  const [ruleType, setRuleType] = useState<'recently_added' | 'most_played' | 'genre' | 'offline_cached'>('most_played');
  const [selectedGenre, setSelectedGenre] = useState('Synthwave');

  if (!isSmartPlaylistModalOpen) return null;

  const handleCreate = () => {
    createSmartPlaylist(
      playlistName.trim() || 'New Smart Playlist',
      ruleType,
      ruleType === 'genre' ? selectedGenre : undefined
    );
    setIsSmartPlaylistModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-6 text-white shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1ed760]/10 flex items-center justify-center text-[#1ed760] border border-[#1ed760]/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create Smart Playlist</h3>
              <p className="text-xs text-zinc-400">Dynamic criteria that automatically updates</p>
            </div>
          </div>

          <button
            onClick={() => setIsSmartPlaylistModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Name Input */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-400 font-medium">Playlist Name</label>
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1ed760]"
          />
        </div>

        {/* Rule Type Selector */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">Smart Calculation Rule</label>
          <div className="grid grid-cols-1 gap-2">
            {[
              {
                id: 'most_played',
                title: 'Most Played / Heavy Rotation',
                desc: 'Dynamically clusters songs by highest local and Subsonic play counts.',
              },
              {
                id: 'recently_added',
                title: 'Recently Added Tracks',
                desc: 'Keeps newest releases and uploads synced at the top of the playlist.',
              },
              {
                id: 'genre',
                title: 'Genre & Mood Match',
                desc: 'Filters tracks strictly matching selected genre acoustic characteristics.',
              },
              {
                id: 'offline_cached',
                title: 'Offline Vault Only',
                desc: 'Auto-includes every track saved in IndexedDB storage for zero-data listening.',
              },
            ].map((rule) => {
              const isSelected = ruleType === rule.id;
              return (
                <div
                  key={rule.id}
                  onClick={() => setRuleType(rule.id as any)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-zinc-800/90 border-[#1ed760] text-white'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{rule.title}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#1ed760]" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{rule.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Genre Selector if rule is genre */}
        {ruleType === 'genre' && (
          <div className="space-y-1 pt-1">
            <label className="text-xs text-zinc-400 font-medium">Select Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1ed760]"
            >
              <option value="Synthwave">Synthwave</option>
              <option value="Lo-Fi Chill">Lo-Fi Chill</option>
              <option value="Electronic">Electronic</option>
              <option value="Indie Folk">Indie Folk</option>
            </select>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => setIsSmartPlaylistModalOpen(false)}
            className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-5 py-2 rounded-full bg-[#1ed760] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Create Playlist
          </button>
        </div>
      </div>
    </div>
  );
};
