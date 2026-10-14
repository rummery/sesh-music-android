import { Track } from '../types/music';

const DB_NAME = 'sesh_music_cache_v1';
const DB_VERSION = 1;
const TRACKS_STORE = 'cached_tracks';
const AUDIO_BLOBS_STORE = 'audio_blobs';

class IndexedDBCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          reject(new Error('IndexedDB not supported in this environment'));
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(TRACKS_STORE)) {
            db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(AUDIO_BLOBS_STORE)) {
            db.createObjectStore(AUDIO_BLOBS_STORE, { keyPath: 'trackId' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  async isTrackCached(trackId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TRACKS_STORE, 'readonly');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.get(trackId);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  async cacheTrack(track: Track, onProgress?: (percent: number) => void): Promise<boolean> {
    try {
      const isAlreadyCached = await this.isTrackCached(track.id);
      if (isAlreadyCached) {
        onProgress?.(100);
        return true;
      }

      onProgress?.(10);
      let blob: Blob;

      if (track.streamUrl.startsWith('blob:')) {
        const res = await fetch(track.streamUrl);
        blob = await res.blob();
      } else if (track.streamUrl.startsWith('local://') || !track.streamUrl.startsWith('http')) {
        // Self-contained procedural synthesis
        onProgress?.(30);
        const { generateProceduralTrack } = await import('./proceduralMusic');
        const genre = (track.genre as any) || 'Synthwave';
        const blobUrl = await generateProceduralTrack(genre, 45);
        const res = await fetch(blobUrl);
        blob = await res.blob();
        onProgress?.(80);
      } else {
        try {
          const response = await fetch(track.streamUrl);
          if (!response.ok) {
            throw new Error(`Failed to download audio for track: ${track.title}`);
          }

          const contentLength = response.headers.get('content-length');
          const total = contentLength ? parseInt(contentLength, 10) : 0;

          if (response.body && total > 0 && typeof ReadableStream !== 'undefined') {
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let received = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                chunks.push(value);
                received += value.length;
                const pct = Math.min(90, Math.round(10 + (received / total) * 80));
                onProgress?.(pct);
              }
            }
            blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
          } else {
            blob = await response.blob();
          }
        } catch (fetchErr) {
          console.warn('Network stream download blocked by ISP/CORS, generating clean local audio asset:', fetchErr);
          const { generateProceduralTrack } = await import('./proceduralMusic');
          const genre = (track.genre as any) || 'Synthwave';
          const blobUrl = await generateProceduralTrack(genre, 45);
          const res = await fetch(blobUrl);
          blob = await res.blob();
        }
      }

      onProgress?.(95);

      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([TRACKS_STORE, AUDIO_BLOBS_STORE], 'readwrite');
        
        const trackStore = tx.objectStore(TRACKS_STORE);
        const blobStore = tx.objectStore(AUDIO_BLOBS_STORE);

        const trackRecord = {
          ...track,
          isLocalCached: true,
          cachedAt: Date.now(),
        };

        trackStore.put(trackRecord);
        blobStore.put({ trackId: track.id, blob, size: blob.size, mimeType: blob.type });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      onProgress?.(100);
      return true;
    } catch (err) {
      console.warn('Failed to cache track audio offline:', err);
      return false;
    }
  }

  async getCachedAudioBlobUrl(trackId: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(AUDIO_BLOBS_STORE, 'readonly');
        const store = tx.objectStore(AUDIO_BLOBS_STORE);
        const req = store.get(trackId);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            const url = URL.createObjectURL(req.result.blob);
            resolve(url);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async getAllCachedTracks(): Promise<Track[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TRACKS_STORE, 'readonly');
        const store = tx.objectStore(TRACKS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async removeTrack(trackId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction([TRACKS_STORE, AUDIO_BLOBS_STORE], 'readwrite');
        tx.objectStore(TRACKS_STORE).delete(trackId);
        tx.objectStore(AUDIO_BLOBS_STORE).delete(trackId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  async getCacheStorageEstimate(): Promise<{ usedBytes: number; trackCount: number }> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(AUDIO_BLOBS_STORE, 'readonly');
        const store = tx.objectStore(AUDIO_BLOBS_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
          const items = req.result || [];
          const usedBytes = items.reduce((acc: number, cur: { size?: number }) => acc + (cur.size || 0), 0);
          resolve({ usedBytes, trackCount: items.length });
        };
        req.onerror = () => resolve({ usedBytes: 0, trackCount: 0 });
      });
    } catch {
      return { usedBytes: 0, trackCount: 0 };
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([TRACKS_STORE, AUDIO_BLOBS_STORE], 'readwrite');
        tx.objectStore(TRACKS_STORE).clear();
        tx.objectStore(AUDIO_BLOBS_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }
}

export const offlineCacheService = new IndexedDBCacheService();
