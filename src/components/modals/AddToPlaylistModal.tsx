import React, { useState } from 'react';
import { X, Plus, Check, Music2, Search, ListPlus } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Playlist } from '../../types/music';

export const AddToPlaylistModal: React.FC = () => {
  const {
    isAddToPlaylistModalOpen,
    trackToAddToPlaylist,
    closeAddToPlaylistModal,
    playlists,
    addTrackToPlaylist,
    createPlaylist,
  } = useMusic();

  const [filterQuery, setFilterQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!isAddToPlaylistModalOpen || !trackToAddToPlaylist) return null;

  // Only show user-editable playlists (not smart playlists like 'Liked Songs' which use toggleLike, or 'Offline Vault')
  const userPlaylists = playlists.filter(
    (p) => !p.isSmart && p.id !== 'pl-liked' && p.id !== 'pl-offline-vault'
  );

  const filteredPlaylists = filterQuery.trim()
    ? userPlaylists.filter((p) =>
        p.name.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : userPlaylists;

  const handleAddToPlaylist = (playlist: Playlist) => {
    addTrackToPlaylist(playlist.id, trackToAddToPlaylist);
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim() || 'My Playlist';
    const newPl = await createPlaylist(name);
    if (newPl) {
      addTrackToPlaylist(newPl.id, trackToAddToPlaylist);
    }
    setIsCreatingNew(false);
    setNewPlaylistName('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeAddToPlaylistModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#242424] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-[#1ed760]" />
            <h2 className="text-lg font-bold tracking-tight">Add to Playlist</h2>
          </div>
          <button
            onClick={closeAddToPlaylistModal}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Track Preview Banner */}
        <div className="px-5 py-3.5 bg-zinc-900/70 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-800 shadow flex items-center justify-center">
            {trackToAddToPlaylist.coverArt && trackToAddToPlaylist.coverArt.trim() ? (
              <img
                src={trackToAddToPlaylist.coverArt || undefined}
                alt={trackToAddToPlaylist.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <Music2 className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">
              {trackToAddToPlaylist.title}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {trackToAddToPlaylist.artist} • {trackToAddToPlaylist.album}
            </p>
          </div>
        </div>

        {/* New Playlist Action / Quick Input */}
        <div className="p-4 border-b border-zinc-800">
          {isCreatingNew ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="w-full px-3 py-2 bg-[#333333] border border-[#1ed760] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#1ed760] text-black hover:bg-[#1fdf64] transition-colors"
                >
                  Create & Add
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setNewPlaylistName(`Playlist #${userPlaylists.length + 1}`);
                setIsCreatingNew(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors group"
            >
              <div className="w-5 h-5 rounded-full bg-[#1ed760] text-black flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>New playlist</span>
            </button>
          )}

          {/* Filter Input if user has multiple playlists */}
          {userPlaylists.length > 3 && !isCreatingNew && (
            <div className="relative mt-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Find a playlist..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#181818] border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          )}
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-zinc-800/40">
          {filteredPlaylists.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 space-y-2">
              <p className="text-xs">
                {userPlaylists.length === 0
                  ? 'No custom playlists yet. Click "New playlist" above to create one!'
                  : 'No playlists match your search.'}
              </p>
            </div>
          ) : (
            filteredPlaylists.map((pl) => {
              const isAlreadyAdded = pl.tracks.some(
                (t) => t.id === trackToAddToPlaylist.id
              );

              return (
                <div
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/70 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-zinc-800 shrink-0 shadow flex items-center justify-center">
                      {pl.coverArt && pl.coverArt.trim() ? (
                        <img
                          src={pl.coverArt || undefined}
                          alt={pl.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music2 className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-[#1ed760] transition-colors">
                        {pl.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {pl.tracks.length} songs
                      </p>
                    </div>
                  </div>

                  <div>
                    {isAlreadyAdded ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#1ed760] bg-[#1ed760]/10 px-2.5 py-1 rounded-full border border-[#1ed760]/20">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToPlaylist(pl);
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-white bg-zinc-700 group-hover:bg-[#1ed760] group-hover:text-black px-3 py-1 rounded-full transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <button
            onClick={closeAddToPlaylistModal}
            className="px-5 py-1.5 rounded-full text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
