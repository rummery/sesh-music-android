import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Album,
  Artist,
  EqualizerSettings,
  Playlist,
  RepeatMode,
  SubsonicConfig,
  Track,
  ToastNotification,
} from '../types/music';
import { DEMO_ALBUMS, DEMO_ARTISTS, DEMO_TRACKS, INITIAL_PLAYLISTS } from '../data/demoLibrary';
import { audioEngine, PlaybackState, AudioDiagnostics } from '../services/audioEngine';
import { offlineCacheService } from '../services/indexedDbCache';
import { subsonicClient, SubsonicApiClient } from '../services/subsonicClient';

interface MusicContextType {
  // Navigation & View
  currentView: string;
  setCurrentView: (view: string, id?: string | null) => void;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  viewHistory: { view: string; id: string | null }[];
  navigateBack: () => void;

  // Playback
  currentTrack: Track | null;
  playbackState: PlaybackState;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  // Queue
  queue: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;

  // Library & Data
  allTracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  likedTrackIds: Set<string>;
  toggleLike: (track: Track) => void;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  createSmartPlaylist: (name: string, type: 'recently_added' | 'most_played' | 'genre' | 'offline_cached', genre?: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  updatePlaylist: (playlistId: string, updates: { name?: string; description?: string; coverArt?: string }) => void;
  deletePlaylist: (playlistId: string) => void;

  // Offline Caching
  cachedTrackIds: Set<string>;
  cachedTracksList: Track[];
  downloadProgress: { [id: string]: number };
  isOfflineMode: boolean;
  setIsOfflineMode: (offline: boolean) => void;
  downloadTrack: (track: Track) => Promise<void>;
  downloadPlaylist: (playlist: Playlist) => Promise<void>;
  removeCachedTrack: (trackId: string) => Promise<void>;
  cacheStorageEstimate: { usedBytes: number; trackCount: number };
  refreshCacheEstimate: () => Promise<void>;
  clearCache: () => Promise<void>;
  cacheAllDemoTracks: () => Promise<void>;

  // Subsonic API
  subsonicConfig: SubsonicConfig;
  updateSubsonicConfig: (newCfg: Partial<SubsonicConfig>) => void;
  pingSubsonic: () => Promise<{ ok: boolean; latency: number; version?: string; error?: string }>;
  syncWithSubsonic: () => Promise<boolean>;
  isSyncing: boolean;

  // Equalizer & Audio FX
  equalizerSettings: EqualizerSettings;
  setEqualizerBand: (freq: number, gainDb: number) => void;
  setEqualizerPreset: (name: string, bands: { [f: number]: number }) => void;
  toggleEqualizer: (enabled: boolean) => void;
  toggleBassBoost: (enabled: boolean) => void;
  setCrossfadeDuration: (sec: number) => void;
  toggleGapless: (enabled: boolean) => void;

  // UI Modals
  isLyricsOpen: boolean;
  setIsLyricsOpen: (open: boolean) => void;
  isQueueOpen: boolean;
  setIsQueueOpen: (open: boolean) => void;
  isEqualizerOpen: boolean;
  setIsEqualizerOpen: (open: boolean) => void;
  isSubsonicModalOpen: boolean;
  setIsSubsonicModalOpen: (open: boolean) => void;
  isSmartPlaylistModalOpen: boolean;
  setIsSmartPlaylistModalOpen: (open: boolean) => void;
  isMobilePlayerExpanded: boolean;
  setIsMobilePlayerExpanded: (expanded: boolean) => void;
  isDiagnosticOpen: boolean;
  setIsDiagnosticOpen: (open: boolean) => void;

  isCreatePlaylistModalOpen: boolean;
  setIsCreatePlaylistModalOpen: (open: boolean) => void;
  openCreatePlaylistModal: () => void;
  closeCreatePlaylistModal: () => void;

  isEditPlaylistModalOpen: boolean;
  editingPlaylist: Playlist | null;
  openEditPlaylistModal: (playlist: Playlist) => void;
  closeEditPlaylistModal: () => void;

  isAddToPlaylistModalOpen: boolean;
  trackToAddToPlaylist: Track | null;
  openAddToPlaylistModal: (track: Track) => void;
  closeAddToPlaylistModal: () => void;

  // Diagnostics
  audioDiagnostics: AudioDiagnostics;
  playDiagnosticTestTone: () => void;
  resumeAudioContext: () => Promise<boolean>;

  // Toast Notifications
  toast: ToastNotification | null;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  hideToast: () => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentView, setCurrentViewRaw] = useState<string>('home');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState<{ view: string; id: string | null }[]>([{ view: 'home', id: null }]);

  const setCurrentView = (view: string, id: string | null = null) => {
    setSelectedEntityId(id);
    setCurrentViewRaw(view);
    setViewHistory((prev) => [...prev.slice(-15), { view, id }]);
  };

  const navigateBack = () => {
    if (viewHistory.length > 1) {
      const newHist = [...viewHistory];
      newHist.pop(); // current
      const prev = newHist[newHist.length - 1];
      setViewHistory(newHist);
      setCurrentViewRaw(prev.view);
      setSelectedEntityId(prev.id);
    }
  };

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  // Queue
  const [queue, setQueue] = useState<Track[]>(DEMO_TRACKS);

  // Library
  const [allTracks, setAllTracks] = useState<Track[]>(DEMO_TRACKS);
  const [albums] = useState<Album[]>(DEMO_ALBUMS);
  const [artists] = useState<Artist[]>(DEMO_ARTISTS);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('sesh_playlists');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => ({
            ...p,
            coverArt: p.coverArt && p.coverArt.trim() ? p.coverArt : DEMO_ALBUMS[0]?.coverArt,
          }));
        }
      }
    } catch {}
    return INITIAL_PLAYLISTS;
  });

  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(() => {
    const initialLiked = new Set<string>();
    DEMO_TRACKS.filter((t) => t.starred).forEach((t) => initialLiked.add(t.id));
    return initialLiked;
  });

  // Offline Caching State
  const [cachedTrackIds, setCachedTrackIds] = useState<Set<string>>(new Set());
  const [cachedTracksList, setCachedTracksList] = useState<Track[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [id: string]: number }>({});
  const [cacheStorageEstimate, setCacheStorageEstimate] = useState<{ usedBytes: number; trackCount: number }>({ usedBytes: 0, trackCount: 0 });
  const [isOfflineMode, setIsOfflineModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sesh_offline_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Subsonic API State
  const [subsonicConfig, setSubsonicConfig] = useState<SubsonicConfig>(() => {
    const saved = SubsonicApiClient.loadConfigFromStorage();
    return {
      serverUrl: saved?.serverUrl || 'https://demo.navidrome.org',
      username: saved?.username || 'demo',
      password: saved?.password || 'demo',
      tokenAuth: saved?.tokenAuth ?? true,
      apiVersion: saved?.apiVersion || '1.16.1',
      clientName: saved?.clientName || 'sesh-music',
      isConnected: saved?.isConnected ?? false,
      serverName: saved?.serverName,
      serverType: saved?.serverType,
      lastSyncTimestamp: saved?.lastSyncTimestamp,
      latencyMs: saved?.latencyMs,
    };
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Equalizer & Audio FX
  const [equalizerSettings, setEqualizerSettings] = useState<EqualizerSettings>(() => audioEngine.getEqualizerSettings());
  const [audioDiagnostics, setAudioDiagnostics] = useState<AudioDiagnostics>(() => audioEngine.getDiagnostics());

  // UI Modals
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isSubsonicModalOpen, setIsSubsonicModalOpen] = useState(false);
  const [isSmartPlaylistModalOpen, setIsSmartPlaylistModalOpen] = useState(false);
  const [isMobilePlayerExpanded, setIsMobilePlayerExpanded] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isEditPlaylistModalOpen, setIsEditPlaylistModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);

  const openCreatePlaylistModal = useCallback(() => setIsCreatePlaylistModalOpen(true), []);
  const closeCreatePlaylistModal = useCallback(() => setIsCreatePlaylistModalOpen(false), []);

  const openEditPlaylistModal = useCallback((playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setIsEditPlaylistModalOpen(true);
  }, []);
  const closeEditPlaylistModal = useCallback(() => {
    setEditingPlaylist(null);
    setIsEditPlaylistModalOpen(false);
  }, []);

  const openAddToPlaylistModal = useCallback((track: Track) => {
    setTrackToAddToPlaylist(track);
    setIsAddToPlaylistModalOpen(true);
  }, []);
  const closeAddToPlaylistModal = useCallback(() => {
    setTrackToAddToPlaylist(null);
    setIsAddToPlaylistModalOpen(false);
  }, []);

  // Toast Notification state
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((toastData: Omit<ToastNotification, 'id'>) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToast({ ...toastData, id });

    const duration = toastData.durationMs || 5000;
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, duration);
  }, []);

  // Refresh cache status and list from IndexedDB
  const refreshCacheEstimate = useCallback(async () => {
    try {
      const est = await offlineCacheService.getCacheStorageEstimate();
      setCacheStorageEstimate(est);
      const cachedTracks = await offlineCacheService.getAllCachedTracks();
      setCachedTracksList(cachedTracks);
      setCachedTrackIds(new Set(cachedTracks.map((t) => t.id)));

      // Merge cached tracks into allTracks so any downloaded remote tracks appear in the library
      setAllTracks((prev) => {
        const existingMap = new Map(prev.map((t) => [t.id, t]));
        cachedTracks.forEach((ct) => existingMap.set(ct.id, { ...ct, isLocalCached: true }));
        return Array.from(existingMap.values());
      });

      // Synchronize Smart Playlist "Offline Vault" and any other offline_cached playlists with ALL cached tracks
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === 'pl-offline-vault' || p.smartRule?.type === 'offline_cached') {
            const updatedTracks = cachedTracks.length > 0 ? cachedTracks : p.tracks;
            return {
              ...p,
              tracks: updatedTracks,
              songCount: updatedTracks.length,
              duration: updatedTracks.reduce((acc, cur) => acc + (cur.duration || 0), 0),
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.warn('Error refreshing cache estimate:', err);
    }
  }, []);

  // Offline Download handlers
  const downloadTrack = useCallback(
    async (track: Track) => {
      setDownloadProgress((prev) => ({ ...prev, [track.id]: 5 }));
      const success = await offlineCacheService.cacheTrack(track, (percent) => {
        setDownloadProgress((prev) => ({ ...prev, [track.id]: percent }));
      });

      if (success) {
        setCachedTrackIds((prev) => new Set(prev).add(track.id));
        setCachedTracksList((prev) => {
          if (prev.some((t) => t.id === track.id)) return prev;
          return [...prev, { ...track, isLocalCached: true }];
        });
        setAllTracks((prev) => {
          if (prev.some((t) => t.id === track.id)) {
            return prev.map((t) => (t.id === track.id ? { ...t, isLocalCached: true } : t));
          }
          return [...prev, { ...track, isLocalCached: true }];
        });
        await refreshCacheEstimate();
      }

      setTimeout(() => {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[track.id];
          return next;
        });
      }, 1000);
    },
    [refreshCacheEstimate]
  );

  const downloadPlaylist = useCallback(
    async (playlist: Playlist) => {
      const tracksToDownload = playlist.tracks.filter((t) => !cachedTrackIds.has(t.id));
      if (tracksToDownload.length === 0) return;

      for (let i = 0; i < tracksToDownload.length; i++) {
        const track = tracksToDownload[i];
        await downloadTrack(track);
      }

      // Mark playlist as downloaded
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlist.id ? { ...p, isDownloaded: true } : p))
      );
      await refreshCacheEstimate();
    },
    [cachedTrackIds, downloadTrack, refreshCacheEstimate]
  );

  const removeCachedTrack = useCallback(
    async (trackId: string) => {
      await offlineCacheService.removeTrack(trackId);
      setCachedTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
      setCachedTracksList((prev) => {
        const next = prev.filter((t) => t.id !== trackId);
        setPlaylists((plPrev) =>
          plPrev.map((p) => {
            if (p.id === 'pl-offline-vault' || p.smartRule?.type === 'offline_cached') {
              return {
                ...p,
                tracks: next,
                songCount: next.length,
                duration: next.reduce((acc, cur) => acc + (cur.duration || 0), 0),
              };
            }
            return p;
          })
        );
        return next;
      });
      await refreshCacheEstimate();
    },
    [refreshCacheEstimate]
  );

  const clearCache = useCallback(async () => {
    await offlineCacheService.clearAllCache();
    setCachedTrackIds(new Set());
    setCachedTracksList([]);
    setCacheStorageEstimate({ usedBytes: 0, trackCount: 0 });
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === 'pl-offline-vault' || p.smartRule?.type === 'offline_cached') {
          return {
            ...p,
            tracks: [],
            songCount: 0,
            duration: 0,
          };
        }
        return p;
      })
    );
  }, []);

  const cacheAllDemoTracks = useCallback(async () => {
    for (const track of DEMO_TRACKS) {
      await downloadTrack(track);
    }
    await refreshCacheEstimate();
  }, [downloadTrack, refreshCacheEstimate]);

  // Offline Mode Switch with rich feedback
  const setIsOfflineMode = useCallback(
    (offline: boolean) => {
      setIsOfflineModeState(offline);
      audioEngine.setOfflineMode(offline);
      try {
        localStorage.setItem('sesh_offline_mode', offline ? 'true' : 'false');
      } catch {}

      if (offline) {
        if (currentTrack && !cachedTrackIds.has(currentTrack.id) && currentTrack.streamUrl?.startsWith('http')) {
          showToast({
            title: 'Offline Mode Active',
            message: `Playback paused: "${currentTrack.title}" is not downloaded. Only cached songs play offline.`,
            type: 'warning',
            durationMs: 8000,
            actions: [
              {
                label: 'Download Song',
                primary: true,
                onClick: () => downloadTrack(currentTrack),
              },
              {
                label: 'Offline Vault',
                primary: false,
                onClick: () => setCurrentView('playlist', 'pl-offline-vault'),
              },
            ],
          });
        } else {
          showToast({
            title: 'Offline Mode Enabled',
            message: `Zero data usage mode. Remote streaming blocked. Playing only from local cache (${cachedTrackIds.size} songs cached).`,
            type: 'info',
            durationMs: 5000,
            actions: [
              {
                label: 'Offline Vault',
                primary: false,
                onClick: () => setCurrentView('playlist', 'pl-offline-vault'),
              },
            ],
          });
        }
      } else {
        showToast({
          title: 'Online Mode Active',
          message: 'Subsonic streaming and remote library browsing restored.',
          type: 'success',
          durationMs: 4000,
        });
      }
    },
    [currentTrack, cachedTrackIds, downloadTrack, setCurrentView, showToast]
  );

  // Sync initial isOfflineMode with audioEngine
  useEffect(() => {
    audioEngine.setOfflineMode(isOfflineMode);
  }, [isOfflineMode]);

  // Keep Offline Vault smart playlist in sync with cachedTracksList
  useEffect(() => {
    if (cachedTracksList.length > 0) {
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === 'pl-offline-vault' || p.smartRule?.type === 'offline_cached') {
            return {
              ...p,
              tracks: cachedTracksList,
              songCount: cachedTracksList.length,
              duration: cachedTracksList.reduce((acc, cur) => acc + (cur.duration || 0), 0),
            };
          }
          return p;
        })
      );
    }
  }, [cachedTracksList]);

  // Seed initial demo songs into IndexedDB on first run so user has immediate offline cache
  useEffect(() => {
    const initCache = async () => {
      try {
        await refreshCacheEstimate();
        const cached = await offlineCacheService.getAllCachedTracks();
        if (cached.length === 0) {
          // Pre-seed the 4 core demo songs into IndexedDB so user starts with working offline cache
          const seedCandidates = DEMO_TRACKS.slice(0, 4);
          for (const track of seedCandidates) {
            await offlineCacheService.cacheTrack(track);
          }
          await refreshCacheEstimate();
        }
      } catch (err) {
        console.warn('Initial offline cache seed error:', err);
      }
    };
    initCache();
  }, [refreshCacheEstimate]);

  // Audio Engine Subscriptions
  useEffect(() => {
    const unsubState = audioEngine.onStateChange(setPlaybackState);
    const unsubTime = audioEngine.onTimeUpdate((cur, dur) => {
      setCurrentTime(cur);
      setDuration(dur);
    });
    const unsubTrack = audioEngine.onTrackChange((t) => {
      setCurrentTrack(t);
      if (t) {
        // Increment play count locally
        setAllTracks((prev) =>
          prev.map((track) => (track.id === t.id ? { ...track, playCount: (track.playCount || 0) + 1 } : track))
        );
      }
    });
    const unsubDiag = audioEngine.onDiagnosticUpdate(setAudioDiagnostics);
    const unsubOffline = audioEngine.onOfflineBlocked((track, reason) => {
      showToast({
        title: 'Offline Mode: Playback Blocked',
        message: reason,
        type: 'warning',
        durationMs: 8000,
        actions: [
          {
            label: 'Download Track',
            primary: true,
            onClick: () => {
              downloadTrack(track);
            },
          },
          {
            label: 'Go Online',
            primary: false,
            onClick: () => {
              setIsOfflineMode(false);
              setTimeout(() => {
                audioEngine.playTrack(track);
              }, 150);
            },
          },
        ],
      });
    });

    return () => {
      unsubState();
      unsubTime();
      unsubTrack();
      unsubDiag();
      unsubOffline();
    };
  }, [downloadTrack, setIsOfflineMode, showToast]);

  // Save playlists to local storage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem('sesh_playlists', JSON.stringify(playlists));
    } catch {}
  }, [playlists]);

  // Next Track Provider for gapless lookahead
  const getNextTrackInQueue = useCallback((): Track | null => {
    if (!currentTrack || queue.length === 0) return null;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex === -1) return queue[0] || null;

    if (repeatMode === 'one') {
      return currentTrack;
    }

    if (isShuffle) {
      const candidates = queue.filter((t) => t.id !== currentTrack.id);
      if (candidates.length === 0) return currentTrack;
      const randIdx = Math.floor(Math.random() * candidates.length);
      return candidates[randIdx];
    }

    if (currentIndex < queue.length - 1) {
      return queue[currentIndex + 1];
    } else if (repeatMode === 'all') {
      return queue[0];
    }

    return null;
  }, [currentTrack, queue, isShuffle, repeatMode]);

  useEffect(() => {
    audioEngine.setNextTrackGetter(getNextTrackInQueue);
  }, [getNextTrackInQueue]);

  // Handle Track End
  useEffect(() => {
    const unsubEnd = audioEngine.onTrackEnd(() => {
      const next = getNextTrackInQueue();
      if (next) {
        audioEngine.playTrack(next);
      }
    });
    return unsubEnd;
  }, [getNextTrackInQueue]);

  // Playback Control Handlers
  const playTrack = useCallback(
    (track: Track, newQueue?: Track[]) => {
      if (isOfflineMode && !cachedTrackIds.has(track.id) && track.streamUrl?.startsWith('http')) {
        console.warn(`[Offline Mode] Blocked live stream request for uncached track: ${track.title}`);
        showToast({
          title: 'Offline Mode: Track Not Cached',
          message: `"${track.title}" is not saved to offline storage. Download it to listen offline or switch to Online Mode.`,
          type: 'warning',
          durationMs: 8000,
          actions: [
            {
              label: 'Download Now',
              primary: true,
              onClick: () => downloadTrack(track),
            },
            {
              label: 'Go Online',
              primary: false,
              onClick: () => {
                setIsOfflineMode(false);
                setTimeout(() => playTrack(track, newQueue), 150);
              },
            },
          ],
        });
        audioEngine.playTrack(track); // Let audioEngine set the error diagnostic
        return;
      }

      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
      } else if (!queue.some((t) => t.id === track.id)) {
        setQueue((prev) => [track, ...prev]);
      }
      audioEngine.playTrack(track);

      // Scrobble nowPlaying to Subsonic server if connected and not in offline mode
      if (subsonicConfig.isConnected && !isOfflineMode) {
        subsonicClient.scrobble(track.id, false);
      }
    },
    [cachedTrackIds, downloadTrack, isOfflineMode, queue, setIsOfflineMode, showToast, subsonicConfig.isConnected]
  );

  const togglePlayPause = useCallback(() => {
    if (!currentTrack && queue.length > 0) {
      playTrack(queue[0]);
      return;
    }
    if (isOfflineMode && currentTrack && !cachedTrackIds.has(currentTrack.id) && currentTrack.streamUrl?.startsWith('http')) {
      showToast({
        title: 'Offline Mode Active',
        message: `Cannot play "${currentTrack.title}" because it is not downloaded for offline listening.`,
        type: 'warning',
        durationMs: 8000,
        actions: [
          {
            label: 'Download Song',
            primary: true,
            onClick: () => downloadTrack(currentTrack),
          },
          {
            label: 'Go Online',
            primary: false,
            onClick: () => {
              setIsOfflineMode(false);
              setTimeout(() => audioEngine.togglePlayPause(), 150);
            },
          },
        ],
      });
      return;
    }
    audioEngine.togglePlayPause();
  }, [currentTrack, queue, playTrack, isOfflineMode, cachedTrackIds, downloadTrack, setIsOfflineMode, showToast]);

  const nextTrack = useCallback(() => {
    const next = getNextTrackInQueue();
    if (next) {
      audioEngine.playTrack(next);
    }
  }, [getNextTrackInQueue]);

  const prevTrack = useCallback(() => {
    if (currentTime > 3) {
      audioEngine.seek(0);
      return;
    }
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      audioEngine.playTrack(queue[currentIndex - 1]);
    } else if (repeatMode === 'all') {
      audioEngine.playTrack(queue[queue.length - 1]);
    } else {
      audioEngine.seek(0);
    }
  }, [currentTrack, currentTime, queue, repeatMode]);

  const seek = useCallback((sec: number) => {
    audioEngine.seek(sec);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    audioEngine.setVolume(vol);
  }, []);

  const toggleMute = useCallback(() => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Queue actions
  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack]);
    } else {
      setQueue([]);
    }
  }, [currentTrack]);

  // Liked Tracks
  const toggleLike = useCallback(
    (track: Track) => {
      const willBeLiked = !likedTrackIds.has(track.id);
      setLikedTrackIds((prev) => {
        const next = new Set(prev);
        if (willBeLiked) next.add(track.id);
        else next.delete(track.id);
        return next;
      });

      // Update in allTracks
      setAllTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, starred: willBeLiked } : t))
      );

      // Update Liked Songs smart playlist
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === 'pl-liked') {
            const updatedTracks = willBeLiked
              ? [track, ...p.tracks.filter((t) => t.id !== track.id)]
              : p.tracks.filter((t) => t.id !== track.id);
            return {
              ...p,
              songCount: updatedTracks.length,
              duration: updatedTracks.reduce((acc, cur) => acc + cur.duration, 0),
              tracks: updatedTracks,
            };
          }
          return p;
        })
      );

      // Subsonic remote sync
      if (subsonicConfig.isConnected && !isOfflineMode) {
        subsonicClient.toggleStar(track.id, willBeLiked);
      }
    },
    [isOfflineMode, likedTrackIds, subsonicConfig.isConnected]
  );

  // Subsonic API handlers
  const updateSubsonicConfig = useCallback((newCfg: Partial<SubsonicConfig>) => {
    subsonicClient.updateConfig(newCfg);
    setSubsonicConfig(subsonicClient.getConfig());
  }, []);

  const pingSubsonic = useCallback(async () => {
    const result = await subsonicClient.ping();
    setSubsonicConfig(subsonicClient.getConfig());
    return result;
  }, []);

  const syncWithSubsonic = useCallback(async () => {
    if (!subsonicConfig.isConnected) {
      const pingRes = await pingSubsonic();
      if (!pingRes.ok) return false;
    }

    setIsSyncing(true);
    try {
      // 1. Fetch remote playlists list from Navidrome
      const remotePlaylists = await subsonicClient.getPlaylists();

      // Build maps for quick lookup of remote playlists
      const remoteById = new Map<string, Playlist>();
      const remoteByName = new Map<string, Playlist>();
      for (const rp of remotePlaylists) {
        remoteById.set(rp.id, rp);
        remoteByName.set(rp.name.toLowerCase().trim(), rp);
      }

      // Fetch detailed tracks cache for remote playlists
      const remoteDetailsCache = new Map<string, Playlist>();
      const fetchRemoteDetails = async (remoteId: string): Promise<Playlist | null> => {
        if (remoteDetailsCache.has(remoteId)) {
          return remoteDetailsCache.get(remoteId)!;
        }
        const detailed = await subsonicClient.getPlaylist(remoteId);
        if (detailed) {
          remoteDetailsCache.set(remoteId, detailed);
        }
        return detailed;
      };

      // 2. Iterate through local playlists (SESH-MUSIC IS THE SOURCE OF TRUTH)
      // We preserve all local changes and push any differences TO Navidrome:
      // - Updating Navidrome playlist name and description -> comment
      // - Adding any missing songs to Navidrome
      // - Creating any local playlists on Navidrome if they don't exist yet
      const matchedRemoteIds = new Set<string>();
      const updatedLocalPlaylists: Playlist[] = [];

      for (const localP of playlists) {
        // Built-in smart playlists (Liked Songs, Heavy Rotation, Offline Vault, etc.) remain intact
        if (localP.isSmart || localP.id === 'pl-liked' || localP.id === 'pl-offline-vault') {
          updatedLocalPlaylists.push(localP);
          continue;
        }

        // Find if there is a matching remote playlist on Navidrome by ID or name
        const matchedRemote =
          remoteById.get(localP.id) || remoteByName.get(localP.name.toLowerCase().trim());

        if (matchedRemote) {
          matchedRemoteIds.add(matchedRemote.id);
          const detailedRemote = await fetchRemoteDetails(matchedRemote.id);
          const targetRemoteId = matchedRemote.id;

          // Check differences between Sesh-music (source of truth) and Navidrome
          const remoteTracks = detailedRemote?.tracks || [];
          const remoteTrackIdSet = new Set(remoteTracks.map((t) => t.id));

          // Songs in sesh-music playlist that are missing in Navidrome:
          const missingTrackIds = localP.tracks
            .filter((t) => !remoteTrackIdSet.has(t.id))
            .map((t) => t.id);

          // Update Navidrome with differences:
          // Map "description" -> "comment" in Navidrome!
          const needsMetaUpdate =
            matchedRemote.name !== localP.name ||
            (matchedRemote.description || '') !== (localP.description || '');

          if (needsMetaUpdate || missingTrackIds.length > 0) {
            await subsonicClient.updatePlaylist({
              playlistId: targetRemoteId,
              name: localP.name,
              comment: localP.description || '', // mapped from playlist's description!
              songIdsToAdd: missingTrackIds.length > 0 ? missingTrackIds : undefined,
            });
          }

          updatedLocalPlaylists.push({
            ...localP,
            id: targetRemoteId,
            subsonicSyncStatus: 'synced',
          });
        } else {
          // Playlist exists in Sesh-Music but NOT yet in Navidrome:
          // Push it to Navidrome with tracks and description as comment!
          const remoteId = await subsonicClient.createPlaylist(
            localP.name,
            localP.tracks.map((t) => t.id),
            localP.description || '' // mapped from playlist's description!
          );

          if (remoteId) {
            matchedRemoteIds.add(remoteId);
            updatedLocalPlaylists.push({
              ...localP,
              id: remoteId,
              subsonicSyncStatus: 'synced',
            });
          } else {
            updatedLocalPlaylists.push(localP);
          }
        }
      }

      // 3. For any remote playlists in Navidrome that don't exist locally,
      // bring them in as new playlists so the user can access them,
      // WITHOUT modifying or clearing ANY of the local changes!
      for (const rp of remotePlaylists) {
        if (!matchedRemoteIds.has(rp.id) && !remoteByName.has(rp.name.toLowerCase().trim())) {
          const detailed = await fetchRemoteDetails(rp.id);
          if (detailed) {
            updatedLocalPlaylists.push(detailed);
          } else {
            updatedLocalPlaylists.push(rp);
          }
        }
      }

      setPlaylists(updatedLocalPlaylists);
      setSubsonicConfig(subsonicClient.getConfig());

      showToast({
        title: 'Playlists Synced',
        message: 'Navidrome updated with all playlist changes from sesh-music.',
        type: 'success',
      });

      return true;
    } catch (err) {
      console.warn('Subsonic playlist sync error:', err);
      showToast({
        title: 'Sync Error',
        message: 'Could not sync with Navidrome. Retaining local playlists.',
        type: 'warning',
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [playlists, pingSubsonic, showToast, subsonicConfig.isConnected]);

  // Playlist management
  const createPlaylist = useCallback(
    async (name: string, description = ''): Promise<Playlist> => {
      const finalName = name.trim() || 'My Playlist';
      const cleanDesc = description.trim();
      const newPlaylist: Playlist = {
        id: `pl-${Date.now()}`,
        name: finalName,
        description: cleanDesc,
        coverArt: DEMO_ALBUMS[0]?.coverArt || DEMO_TRACKS[0]?.coverArt || '',
        owner: 'You',
        songCount: 0,
        duration: 0,
        isPinned: false,
        tracks: [],
        subsonicSyncStatus: subsonicConfig.isConnected ? 'syncing' : 'local_only',
      };

      setPlaylists((prev) => [newPlaylist, ...prev]);

      showToast({
        title: 'Playlist Created',
        message: `Created "${finalName}"`,
        type: 'success',
      });

      // If connected to Subsonic server and not in offline mode, sync to Navidrome with comment = description
      if (subsonicConfig.isConnected && !isOfflineMode) {
        subsonicClient.createPlaylist(finalName, [], cleanDesc).then((remoteId) => {
          if (remoteId) {
            setPlaylists((prev) =>
              prev.map((p) =>
                p.id === newPlaylist.id ? { ...p, id: remoteId, subsonicSyncStatus: 'synced' } : p
              )
            );
          }
        });
      }

      return newPlaylist;
    },
    [isOfflineMode, showToast, subsonicConfig.isConnected]
  );

  const updatePlaylist = useCallback(
    (playlistId: string, updates: { name?: string; description?: string; coverArt?: string }) => {
      let updatedTarget: Playlist | null = null;
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            const nextP: Playlist = {
              ...p,
              ...(updates.name !== undefined ? { name: updates.name.trim() || p.name } : {}),
              ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
              ...(updates.coverArt !== undefined ? { coverArt: updates.coverArt } : {}),
              subsonicSyncStatus: subsonicConfig.isConnected ? 'syncing' : p.subsonicSyncStatus,
            };
            updatedTarget = nextP;
            return nextP;
          }
          return p;
        })
      );

      showToast({
        title: 'Playlist Updated',
        message: updates.name ? `Renamed to "${updates.name}"` : 'Playlist details saved',
        type: 'success',
      });

      // Update Navidrome's corresponding playlist:
      // Map "description" -> "comment" in Navidrome!
      if (subsonicConfig.isConnected && !isOfflineMode && updatedTarget) {
        const p: Playlist = updatedTarget;
        const isRemoteId = !p.id.startsWith('pl-');
        if (isRemoteId) {
          subsonicClient
            .updatePlaylist({
              playlistId: p.id,
              name: updates.name !== undefined ? updates.name.trim() || p.name : undefined,
              comment: updates.description !== undefined ? updates.description.trim() : undefined,
            })
            .then((ok) => {
              if (ok) {
                setPlaylists((prev) =>
                  prev.map((item) => (item.id === p.id ? { ...item, subsonicSyncStatus: 'synced' } : item))
                );
              }
            });
        } else {
          // Create in Navidrome with tracks and description as comment
          subsonicClient
            .createPlaylist(p.name, p.tracks.map((t) => t.id), p.description)
            .then((remoteId) => {
              if (remoteId) {
                setPlaylists((prev) =>
                  prev.map((item) =>
                    item.id === p.id ? { ...item, id: remoteId, subsonicSyncStatus: 'synced' } : item
                  )
                );
              }
            });
        }
      }
    },
    [isOfflineMode, showToast, subsonicConfig.isConnected]
  );

  const createSmartPlaylist = useCallback(
    (name: string, type: 'recently_added' | 'most_played' | 'genre' | 'offline_cached', genre?: string) => {
      let filteredTracks: Track[] = [];
      if (type === 'most_played') {
        filteredTracks = [...allTracks].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10);
      } else if (type === 'genre' && genre) {
        filteredTracks = allTracks.filter((t) => t.genre?.toLowerCase() === genre.toLowerCase());
      } else if (type === 'offline_cached') {
        filteredTracks = cachedTracksList.length > 0 ? cachedTracksList : allTracks.filter((t) => cachedTrackIds.has(t.id));
      } else {
        filteredTracks = [...allTracks].reverse().slice(0, 10);
      }

      const smartPl: Playlist = {
        id: `pl-smart-${Date.now()}`,
        name,
        description: `Smart Auto-Sync Playlist • Rule: ${type} ${genre ? `(${genre})` : ''}`,
        coverArt: filteredTracks[0]?.coverArt || DEMO_ALBUMS[1]?.coverArt,
        owner: 'sesh engine',
        songCount: filteredTracks.length,
        duration: filteredTracks.reduce((acc, cur) => acc + cur.duration, 0),
        isSmart: true,
        smartRule: { type, genreFilter: genre },
        tracks: filteredTracks,
        subsonicSyncStatus: 'local_only',
      };

      setPlaylists((prev) => [smartPl, ...prev]);
    },
    [allTracks, cachedTrackIds, cachedTracksList]
  );

  const addTrackToPlaylist = useCallback(
    (playlistId: string, track: Track) => {
      let added = false;
      let targetName = 'Playlist';
      let targetPlaylist: Playlist | null = null;

      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            targetName = p.name;
            if (p.tracks.some((t) => t.id === track.id)) {
              return p;
            }
            added = true;
            const updated = [...p.tracks, track];
            const nextP: Playlist = {
              ...p,
              songCount: updated.length,
              duration: updated.reduce((acc, cur) => acc + cur.duration, 0),
              tracks: updated,
              coverArt: p.coverArt && p.coverArt !== DEMO_ALBUMS[0]?.coverArt ? p.coverArt : track.coverArt,
              subsonicSyncStatus: subsonicConfig.isConnected ? 'syncing' : p.subsonicSyncStatus,
            };
            targetPlaylist = nextP;
            return nextP;
          }
          return p;
        })
      );

      if (added) {
        showToast({
          title: 'Added to Playlist',
          message: `Added "${track.title}" to ${targetName}`,
          type: 'success',
        });

        // When updating a playlist to add a new song it should update Navidrome's corresponding playlist!
        if (subsonicConfig.isConnected && !isOfflineMode && targetPlaylist) {
          const p: Playlist = targetPlaylist;
          const isRemoteId = !p.id.startsWith('pl-');

          if (isRemoteId) {
            subsonicClient
              .updatePlaylist({
                playlistId: p.id,
                songIdsToAdd: [track.id],
                comment: p.description, // ensure description is synced as comment
              })
              .then((ok) => {
                if (ok) {
                  setPlaylists((prev) =>
                    prev.map((item) =>
                      item.id === p.id ? { ...item, subsonicSyncStatus: 'synced' } : item
                    )
                  );
                }
              });
          } else {
            // Local playlist: create on Navidrome with all tracks and description as comment
            subsonicClient
              .createPlaylist(p.name, p.tracks.map((t) => t.id), p.description)
              .then((remoteId) => {
                if (remoteId) {
                  setPlaylists((prev) =>
                    prev.map((item) =>
                      item.id === p.id ? { ...item, id: remoteId, subsonicSyncStatus: 'synced' } : item
                    )
                  );
                }
              });
          }
        }
      } else {
        showToast({
          title: 'Already in Playlist',
          message: `"${track.title}" is already in ${targetName}`,
          type: 'info',
        });
      }
    },
    [isOfflineMode, showToast, subsonicConfig.isConnected]
  );

  const removeTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      let targetPlaylist: Playlist | null = null;
      let removedIndex = -1;

      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            removedIndex = p.tracks.findIndex((t) => t.id === trackId);
            const updated = p.tracks.filter((t) => t.id !== trackId);
            const nextP: Playlist = {
              ...p,
              songCount: updated.length,
              duration: updated.reduce((acc, cur) => acc + cur.duration, 0),
              tracks: updated,
              subsonicSyncStatus: subsonicConfig.isConnected ? 'syncing' : p.subsonicSyncStatus,
            };
            targetPlaylist = nextP;
            return nextP;
          }
          return p;
        })
      );

      showToast({
        title: 'Song Removed',
        message: 'Removed track from playlist',
        type: 'info',
      });

      // Update Navidrome's playlist by index
      if (subsonicConfig.isConnected && !isOfflineMode && targetPlaylist && removedIndex >= 0) {
        const p: Playlist = targetPlaylist;
        const isRemoteId = !p.id.startsWith('pl-');
        if (isRemoteId) {
          subsonicClient
            .updatePlaylist({
              playlistId: p.id,
              songIndexesToRemove: [removedIndex],
              comment: p.description,
            })
            .then((ok) => {
              if (ok) {
                setPlaylists((prev) =>
                  prev.map((item) =>
                    item.id === p.id ? { ...item, subsonicSyncStatus: 'synced' } : item
                  )
                );
              }
            });
        }
      }
    },
    [isOfflineMode, showToast, subsonicConfig.isConnected]
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      const isRemoteId = !playlistId.startsWith('pl-');
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));

      if (subsonicConfig.isConnected && !isOfflineMode && isRemoteId) {
        subsonicClient.deletePlaylist(playlistId);
      }
    },
    [isOfflineMode, subsonicConfig.isConnected]
  );

  // Equalizer actions
  const setEqualizerBand = useCallback((freq: number, gainDb: number) => {
    audioEngine.setEqualizerBand(freq, gainDb);
    setEqualizerSettings(audioEngine.getEqualizerSettings());
  }, []);

  const setEqualizerPreset = useCallback((name: string, bands: { [f: number]: number }) => {
    audioEngine.setEqualizerPreset(name, bands);
    setEqualizerSettings(audioEngine.getEqualizerSettings());
  }, []);

  const toggleEqualizer = useCallback((enabled: boolean) => {
    audioEngine.toggleEqualizer(enabled);
    setEqualizerSettings(audioEngine.getEqualizerSettings());
  }, []);

  const toggleBassBoost = useCallback((enabled: boolean) => {
    audioEngine.toggleBassBoost(enabled);
    setEqualizerSettings(audioEngine.getEqualizerSettings());
  }, []);

  const setCrossfadeDuration = useCallback((sec: number) => {
    audioEngine.setCrossfadeDuration(sec);
    setEqualizerSettings(audioEngine.getEqualizerSettings());
  }, []);

  const toggleGapless = useCallback((enabled: boolean) => {
    audioEngine.toggleGapless(enabled);
    setEqualizerSettings(audioEngine.getEqualizerSettings());
  }, []);

  const playDiagnosticTestTone = useCallback(() => {
    audioEngine.playDiagnosticTestTone();
  }, []);

  const resumeAudioContext = useCallback(() => {
    return audioEngine.resumeContext();
  }, []);

  // Visible tracks adjusted by offline mode
  const effectiveTracks = useMemo(() => {
    if (!isOfflineMode) return allTracks;
    return allTracks.filter((t) => cachedTrackIds.has(t.id));
  }, [allTracks, cachedTrackIds, isOfflineMode]);

  return (
    <MusicContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedEntityId,
        setSelectedEntityId,
        viewHistory,
        navigateBack,

        currentTrack,
        playbackState,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        playTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,

        queue,
        setQueue,
        addToQueue,
        removeFromQueue,
        clearQueue,

        allTracks: effectiveTracks,
        albums,
        artists,
        playlists,
        likedTrackIds,
        toggleLike,
        createPlaylist,
        createSmartPlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        updatePlaylist,
        deletePlaylist,

        cachedTrackIds,
        cachedTracksList,
        downloadProgress,
        isOfflineMode,
        setIsOfflineMode,
        downloadTrack,
        downloadPlaylist,
        removeCachedTrack,
        cacheStorageEstimate,
        refreshCacheEstimate,
        clearCache,
        cacheAllDemoTracks,

        subsonicConfig,
        updateSubsonicConfig,
        pingSubsonic,
        syncWithSubsonic,
        isSyncing,

        equalizerSettings,
        setEqualizerBand,
        setEqualizerPreset,
        toggleEqualizer,
        toggleBassBoost,
        setCrossfadeDuration,
        toggleGapless,

        isLyricsOpen,
        setIsLyricsOpen,
        isQueueOpen,
        setIsQueueOpen,
        isEqualizerOpen,
        setIsEqualizerOpen,
        isSubsonicModalOpen,
        setIsSubsonicModalOpen,
        isSmartPlaylistModalOpen,
        setIsSmartPlaylistModalOpen,
        isMobilePlayerExpanded,
        setIsMobilePlayerExpanded,
        isDiagnosticOpen,
        setIsDiagnosticOpen,

        isCreatePlaylistModalOpen,
        setIsCreatePlaylistModalOpen,
        openCreatePlaylistModal,
        closeCreatePlaylistModal,
        isEditPlaylistModalOpen,
        editingPlaylist,
        openEditPlaylistModal,
        closeEditPlaylistModal,
        isAddToPlaylistModalOpen,
        trackToAddToPlaylist,
        openAddToPlaylistModal,
        closeAddToPlaylistModal,

        audioDiagnostics,
        playDiagnosticTestTone,
        resumeAudioContext,

        toast,
        showToast,
        hideToast,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
