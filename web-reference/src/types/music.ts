export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  coverArt: string;
  duration: number; // in seconds
  streamUrl: string;
  year?: number;
  genre?: string;
  trackNumber?: number;
  bitRate?: number;
  suffix?: string;
  starred?: boolean;
  playCount?: number;
  dateAdded?: string;
  lyrics?: TimedLyricLine[];
  isLocalCached?: boolean;
}

export interface TimedLyricLine {
  time: number; // seconds
  text: string;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  coverArt: string;
  year?: number;
  songCount: number;
  duration: number;
  genre?: string;
  tracks?: Track[];
}

export interface Artist {
  id: string;
  name: string;
  coverArt: string;
  albumCount?: number;
  albums?: Album[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverArt?: string;
  owner?: string;
  songCount: number;
  duration: number;
  isSmart?: boolean;
  smartRule?: SmartPlaylistRule;
  isPinned?: boolean;
  isDownloaded?: boolean;
  tracks: Track[];
  subsonicSyncStatus?: 'synced' | 'local_only' | 'syncing';
}

export interface SmartPlaylistRule {
  type: 'recently_added' | 'most_played' | 'liked_songs' | 'genre' | 'offline_cached' | 'similar_artist';
  genreFilter?: string;
  limit?: number;
  minPlayCount?: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface EqualizerSettings {
  enabled: boolean;
  preset: string;
  bands: { [frequency: number]: number }; // frequency Hz -> gain dB (-12 to +12)
  bassBoost: boolean;
  crossfadeDuration: number; // 0 to 12 seconds
  gaplessEnabled: boolean;
}

export interface SubsonicConfig {
  serverUrl: string;
  username: string;
  password?: string;
  tokenAuth: boolean;
  apiVersion: string;
  clientName: string;
  isConnected: boolean;
  serverName?: string;
  serverType?: string; // e.g. 'Navidrome', 'LMS', 'Subsonic'
  lastSyncTimestamp?: number;
  latencyMs?: number;
}

export interface CacheStorageInfo {
  usedBytes: number;
  totalTracks: number;
  isQuotaAvailable: boolean;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type?: 'warning' | 'info' | 'success' | 'error';
  durationMs?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    primary?: boolean;
  }>;
}
