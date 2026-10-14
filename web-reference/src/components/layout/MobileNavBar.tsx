import React from 'react';
import { Home, Search, Library, Server } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const MobileNavBar: React.FC = () => {
  const { currentView, setCurrentView, subsonicConfig, setIsSubsonicModalOpen } = useMusic();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-md border-t border-zinc-900 grid grid-cols-4 items-center z-30 select-none pb-safe">
      <button
        onClick={() => setCurrentView('home')}
        className={`flex flex-col items-center justify-center h-full transition-colors ${
          currentView === 'home' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-medium tracking-tight">Home</span>
      </button>

      <button
        onClick={() => setCurrentView('search')}
        className={`flex flex-col items-center justify-center h-full transition-colors ${
          currentView === 'search' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-medium tracking-tight">Search</span>
      </button>

      <button
        onClick={() => setCurrentView('library')}
        className={`flex flex-col items-center justify-center h-full transition-colors ${
          currentView === 'library' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Library className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-medium tracking-tight">Your Library</span>
      </button>

      <button
        onClick={() => setIsSubsonicModalOpen(true)}
        className="flex flex-col items-center justify-center h-full transition-colors text-zinc-400 hover:text-zinc-200 relative"
      >
        <div className="relative">
          <Server className={`w-5 h-5 mb-0.5 ${subsonicConfig.isConnected ? 'text-[#1ed760]' : ''}`} />
          {subsonicConfig.isConnected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#1ed760]" />
          )}
        </div>
        <span className="text-[10px] font-medium tracking-tight">Subsonic</span>
      </button>
    </nav>
  );
};
