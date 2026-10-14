import React, { useState, useEffect, useRef } from 'react';
import { X, Music, Trash2, Check, AlertCircle } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const EditPlaylistModal: React.FC = () => {
  const {
    isEditPlaylistModalOpen,
    editingPlaylist,
    closeEditPlaylistModal,
    updatePlaylist,
    deletePlaylist,
    setCurrentView,
  } = useMusic();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPlaylist && isEditPlaylistModalOpen) {
      setName(editingPlaylist.name || '');
      setDescription(editingPlaylist.description || '');
      setConfirmDelete(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [editingPlaylist, isEditPlaylistModalOpen]);

  if (!isEditPlaylistModalOpen || !editingPlaylist) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updatePlaylist(editingPlaylist.id, {
      name: name.trim(),
      description: description.trim(),
    });
    closeEditPlaylistModal();
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deletePlaylist(editingPlaylist.id);
    closeEditPlaylistModal();
    setCurrentView('library');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeEditPlaylistModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#242424] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-white space-y-6"
      >
        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Edit Playlist Details</h2>
          <button
            onClick={closeEditPlaylistModal}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Cover art preview */}
            <div className="sm:col-span-1 flex flex-col items-center gap-2">
              <div className="w-36 h-36 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shadow-md flex items-center justify-center relative group">
                {editingPlaylist.coverArt && editingPlaylist.coverArt.trim() ? (
                  <img
                    src={editingPlaylist.coverArt || undefined}
                    alt={editingPlaylist.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-12 h-12 text-zinc-500" />
                )}
              </div>
              <span className="text-[11px] text-zinc-400 text-center">
                {editingPlaylist.tracks.length} songs
              </span>
            </div>

            {/* Inputs */}
            <div className="sm:col-span-2 space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Playlist name"
                  className="w-full px-3.5 py-2.5 bg-[#333333] border border-zinc-600 focus:border-[#1ed760] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Give your playlist a description"
                  rows={3}
                  className="w-full px-3.5 py-2 bg-[#333333] border border-zinc-600 focus:border-[#1ed760] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-700/50">
            {/* Delete button (only for custom user playlists) */}
            <div>
              {!editingPlaylist.isSmart && editingPlaylist.id !== 'pl-liked' && editingPlaylist.id !== 'pl-offline-vault' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    confirmDelete
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                      : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-800'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{confirmDelete ? 'Click again to confirm delete' : 'Delete Playlist'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeEditPlaylistModal}
                className="px-4 py-2 rounded-full text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-6 py-2 rounded-full text-sm font-bold bg-[#1ed760] hover:bg-[#1fdf64] disabled:opacity-50 text-black shadow-lg active:scale-95 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
