import React, { useState, useEffect, useRef } from 'react';
import { X, Music2, Sparkles } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const CreatePlaylistModal: React.FC = () => {
  const {
    isCreatePlaylistModalOpen,
    closeCreatePlaylistModal,
    createPlaylist,
    setCurrentView,
    playlists,
  } = useMusic();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatePlaylistModalOpen) {
      // Generate default name like "My Playlist #2"
      const userPlaylists = playlists.filter((p) => !p.isSmart && p.id !== 'pl-liked' && p.id !== 'pl-offline-vault');
      const defaultName = `My Playlist #${userPlaylists.length + 1}`;
      setName(defaultName);
      setDescription('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isCreatePlaylistModalOpen, playlists]);

  if (!isCreatePlaylistModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'My Playlist';
    const newPl = await createPlaylist(finalName, description.trim());
    closeCreatePlaylistModal();
    if (newPl && newPl.id) {
      setCurrentView('playlist', newPl.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeCreatePlaylistModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#242424] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-white space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1ed760]/20 flex items-center justify-center text-[#1ed760]">
              <Music2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Create Playlist</h2>
          </div>
          <button
            onClick={closeCreatePlaylistModal}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give your playlist a name"
              className="w-full px-3.5 py-2.5 bg-[#333333] border border-zinc-600 focus:border-[#1ed760] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What vibe or tracks belong here?"
              rows={3}
              className="w-full px-3.5 py-2.5 bg-[#333333] border border-zinc-600 focus:border-[#1ed760] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeCreatePlaylistModal}
              className="px-4 py-2 rounded-full text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full text-sm font-bold bg-[#1ed760] hover:bg-[#1fdf64] active:scale-95 text-black shadow-lg transition-all"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
