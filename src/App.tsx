/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MusicProvider, useMusic } from './context/MusicContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { BottomPlayerBar } from './components/layout/BottomPlayerBar';
import { MobileNavBar } from './components/layout/MobileNavBar';
import { MiniPlayer } from './components/player/MiniPlayer';
import { FullScreenPlayerModal } from './components/player/FullScreenPlayerModal';
import { HomeView } from './components/views/HomeView';
import { SearchView } from './components/views/SearchView';
import { LibraryView } from './components/views/LibraryView';
import { PlaylistDetailView } from './components/views/PlaylistDetailView';
import { LyricsView } from './components/modals/LyricsView';
import { QueueModal } from './components/modals/QueueModal';
import { EqualizerModal } from './components/modals/EqualizerModal';
import { SubsonicSettingsModal } from './components/modals/SubsonicSettingsModal';
import { SmartPlaylistModal } from './components/modals/SmartPlaylistModal';
import { CreatePlaylistModal } from './components/modals/CreatePlaylistModal';
import { EditPlaylistModal } from './components/modals/EditPlaylistModal';
import { AddToPlaylistModal } from './components/modals/AddToPlaylistModal';
import { AudioDiagnosticModal } from './components/modals/AudioDiagnosticModal';
import { ToastNotification } from './components/layout/ToastNotification';

const AppContent: React.FC = () => {
  const { currentView, selectedEntityId, playlists, albums } = useMusic();

  const renderActiveView = () => {
    switch (currentView) {
      case 'search':
        return <SearchView />;
      case 'library':
        return <LibraryView />;
      case 'playlist':
      case 'album':
        const targetId = selectedEntityId || playlists[0]?.id || albums[0]?.id || 'pl-liked';
        return <PlaylistDetailView playlistId={targetId} />;
      case 'home':
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-sans select-none">
      {/* Main App Stage */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Desktop Sidebar */}
        <Sidebar />

        {/* Center / Right Content Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#121212] md:my-2 md:mr-2 md:rounded-lg overflow-hidden relative shadow-inner">
          <TopHeader />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Desktop Spotify Playback Bar */}
      <BottomPlayerBar />

      {/* Mobile Floating Mini Player */}
      <MiniPlayer />

      {/* Mobile Bottom Tab Navigation */}
      <MobileNavBar />

      {/* Modals & Overlays */}
      <FullScreenPlayerModal />
      <LyricsView />
      <QueueModal />
      <EqualizerModal />
      <SubsonicSettingsModal />
      <SmartPlaylistModal />
      <CreatePlaylistModal />
      <EditPlaylistModal />
      <AddToPlaylistModal />
      <AudioDiagnosticModal />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <MusicProvider>
      <AppContent />
    </MusicProvider>
  );
}
