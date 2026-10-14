import { Album, Artist, Playlist, SubsonicConfig, Track } from '../types/music';

// Minimal fast RFC 1321 MD5 implementation for Subsonic token calculation
function md5(input: string): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }

  function bitRotateLeft(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }

  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function binlMD5(x: number[], len: number): number[] {
    x[len >> 5] |= 0x80 << len % 32;
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let i = 0; i < x.length; i += 16) {
      const olda = a;
      const oldb = b;
      const oldc = c;
      const oldd = d;

      a = md5ff(a, b, c, d, x[i], 7, -680876936);
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5gg(b, c, d, a, x[i], 20, -373897302);
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

      a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
      d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = md5hh(d, a, b, c, x[i], 11, -358537222);
      c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

      a = md5ii(a, b, c, d, x[i], 6, -198630844);
      d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

      a = safeAdd(a, olda);
      b = safeAdd(b, oldb);
      c = safeAdd(c, oldc);
      d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  }

  function rstr2binl(input: string): number[] {
    const output: number[] = [];
    for (let i = 0; i < input.length * 8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << i % 32;
    }
    return output;
  }

  function binl2hex(binarray: number[]): string {
    const hexTab = '0123456789abcdef';
    let str = '';
    for (let i = 0; i < binarray.length * 4; i++) {
      str +=
        hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0x0f) +
        hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0x0f);
    }
    return str;
  }

  return binl2hex(binlMD5(rstr2binl(input), input.length * 8));
}

function generateRandomSalt(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

export class SubsonicApiClient {
  private config: SubsonicConfig;

  constructor(config?: Partial<SubsonicConfig>) {
    this.config = {
      serverUrl: config?.serverUrl || 'https://demo.navidrome.org',
      username: config?.username || 'demo',
      password: config?.password || 'demo',
      tokenAuth: config?.tokenAuth ?? true,
      apiVersion: config?.apiVersion || '1.16.1',
      clientName: config?.clientName || 'sesh-music',
      isConnected: false,
      ...config,
    };
  }

  updateConfig(newConfig: Partial<SubsonicConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfigToStorage();
  }

  getConfig(): SubsonicConfig {
    return { ...this.config };
  }

  private saveConfigToStorage() {
    try {
      localStorage.setItem('sesh_subsonic_config', JSON.stringify({
        serverUrl: this.config.serverUrl,
        username: this.config.username,
        password: this.config.password,
        tokenAuth: this.config.tokenAuth,
        apiVersion: this.config.apiVersion,
        clientName: this.config.clientName,
        isConnected: this.config.isConnected,
        serverName: this.config.serverName,
        serverType: this.config.serverType,
        lastSyncTimestamp: this.config.lastSyncTimestamp,
      }));
    } catch {
      // ignore
    }
  }

  static loadConfigFromStorage(): Partial<SubsonicConfig> | null {
    try {
      const saved = localStorage.getItem('sesh_subsonic_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  }

  private buildAuthParams(): URLSearchParams {
    const params = new URLSearchParams();
    params.set('u', this.config.username);
    params.set('v', this.config.apiVersion);
    params.set('c', this.config.clientName);
    params.set('f', 'json');

    if (this.config.tokenAuth && this.config.password) {
      const salt = generateRandomSalt(10);
      const token = md5(this.config.password + salt);
      params.set('t', token);
      params.set('s', salt);
    } else if (this.config.password) {
      params.set('p', this.config.password);
    }

    return params;
  }

  private getUrl(
    endpoint: string,
    extraParams?: Record<string, string | string[] | number | boolean | undefined | null>
  ): string {
    let base = this.config.serverUrl.trim();
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
    if (!base.endsWith('/rest')) {
      base = `${base}/rest`;
    }

    const params = this.buildAuthParams();
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          if (Array.isArray(v)) {
            v.forEach((val) => {
              if (val !== undefined && val !== null) {
                params.append(k, String(val));
              }
            });
          } else {
            params.set(k, String(v));
          }
        }
      });
    }

    return `${base}/${endpoint}.view?${params.toString()}`;
  }

  async ping(): Promise<{ ok: boolean; latency: number; version?: string; type?: string; error?: string }> {
    const startTime = performance.now();
    try {
      const url = this.getUrl('ping');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - startTime);

      if (!res.ok) {
        return { ok: false, latency, error: `HTTP ${res.status}: ${res.statusText}` };
      }

      const json = await res.json();
      const subResp = json['subsonic-response'];

      if (subResp && subResp.status === 'ok') {
        this.config.isConnected = true;
        this.config.latencyMs = latency;
        this.config.serverType = subResp.type || (subResp.serverVersion ? 'Subsonic' : 'OpenSubsonic');
        this.config.serverName = subResp.serverVersion ? `Navidrome / Subsonic (${subResp.serverVersion})` : 'Subsonic Server';
        this.config.lastSyncTimestamp = Date.now();
        this.saveConfigToStorage();

        return {
          ok: true,
          latency,
          version: subResp.version || subResp.serverVersion,
          type: this.config.serverType,
        };
      } else {
        const errorMsg = subResp?.error?.message || 'Authentication or server error';
        return { ok: false, latency, error: errorMsg };
      }
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - startTime);
      const message = err instanceof Error ? err.message : 'Connection failed';
      return { ok: false, latency, error: message };
    }
  }

  getStreamUrl(trackId: string): string {
    return this.getUrl('stream', { id: trackId, maxBitRate: '320' });
  }

  getCoverArtUrl(coverArtId?: string, size = 500): string {
    if (!coverArtId) return '';
    if (coverArtId.startsWith('http') || coverArtId.startsWith('/src') || coverArtId.startsWith('data:')) {
      return coverArtId;
    }
    return this.getUrl('getCoverArt', { id: coverArtId, size: size.toString() });
  }

  async getPlaylists(): Promise<Playlist[]> {
    try {
      const url = this.getUrl('getPlaylists');
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const items = json['subsonic-response']?.playlists?.playlist || [];
      return items.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.comment || '',
        coverArt: p.coverArt ? this.getCoverArtUrl(p.coverArt) : '',
        owner: p.owner,
        songCount: p.songCount || 0,
        duration: p.duration || 0,
        tracks: [],
        subsonicSyncStatus: 'synced',
      }));
    } catch {
      return [];
    }
  }

  async getPlaylist(id: string): Promise<Playlist | null> {
    try {
      const url = this.getUrl('getPlaylist', { id });
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const p = json['subsonic-response']?.playlist;
      if (!p) return null;

      const tracks: Track[] = (p.entry || []).map((t: any) => this.mapSubsonicTrack(t));

      return {
        id: p.id,
        name: p.name,
        description: p.comment || '',
        coverArt: p.coverArt ? this.getCoverArtUrl(p.coverArt) : (tracks[0]?.coverArt || ''),
        owner: p.owner,
        songCount: p.songCount || tracks.length,
        duration: p.duration || tracks.reduce((a, b) => a + b.duration, 0),
        tracks,
        subsonicSyncStatus: 'synced',
      };
    } catch {
      return null;
    }
  }

  async createPlaylist(name: string, songIds: string[] = [], comment = ''): Promise<string | null> {
    try {
      const params: Record<string, any> = { name };
      if (comment) {
        params.comment = comment;
      }
      if (songIds.length > 0) {
        params.songId = songIds;
      }
      const url = this.getUrl('createPlaylist', params);
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const subResp = json['subsonic-response'];
      if (subResp && subResp.status === 'ok') {
        return subResp.playlist?.id || 'new_id';
      }
      return null;
    } catch {
      return null;
    }
  }

  async updatePlaylist(options: {
    playlistId: string;
    name?: string;
    comment?: string;
    public?: boolean;
    songIdsToAdd?: string[];
    songIndexesToRemove?: number[];
  }): Promise<boolean> {
    try {
      const params: Record<string, any> = {
        playlistId: options.playlistId,
      };
      if (options.name !== undefined) {
        params.name = options.name;
      }
      if (options.comment !== undefined) {
        params.comment = options.comment;
      }
      if (options.public !== undefined) {
        params.public = options.public ? 'true' : 'false';
      }
      if (options.songIdsToAdd && options.songIdsToAdd.length > 0) {
        params.songIdToAdd = options.songIdsToAdd;
      }
      if (options.songIndexesToRemove && options.songIndexesToRemove.length > 0) {
        params.songIndexToRemove = options.songIndexesToRemove.map(String);
      }
      const url = this.getUrl('updatePlaylist', params);
      const res = await fetch(url);
      if (!res.ok) return false;
      const json = await res.json();
      return json['subsonic-response']?.status === 'ok';
    } catch {
      return false;
    }
  }

  async deletePlaylist(playlistId: string): Promise<boolean> {
    try {
      const url = this.getUrl('deletePlaylist', { id: playlistId });
      const res = await fetch(url);
      if (!res.ok) return false;
      const json = await res.json();
      return json['subsonic-response']?.status === 'ok';
    } catch {
      return false;
    }
  }

  async search(query: string): Promise<{ tracks: Track[]; albums: Album[]; artists: Artist[] }> {
    try {
      const url = this.getUrl('search3', { query, songCount: '25', albumCount: '15', artistCount: '10' });
      const res = await fetch(url);
      if (!res.ok) return { tracks: [], albums: [], artists: [] };
      const json = await res.json();
      const searchResult = json['subsonic-response']?.searchResult3 || {};

      const tracks = (searchResult.song || []).map((t: any) => this.mapSubsonicTrack(t));
      const albums = (searchResult.album || []).map((a: any) => ({
        id: a.id,
        name: a.name || a.title,
        artist: a.artist,
        artistId: a.artistId,
        coverArt: this.getCoverArtUrl(a.coverArt),
        year: a.year,
        songCount: a.songCount || 0,
        duration: a.duration || 0,
        genre: a.genre,
      }));
      const artists = (searchResult.artist || []).map((ar: any) => ({
        id: ar.id,
        name: ar.name,
        coverArt: this.getCoverArtUrl(ar.coverArt || ar.artistImageUrl),
        albumCount: ar.albumCount || 0,
      }));

      return { tracks, albums, artists };
    } catch {
      return { tracks: [], albums: [], artists: [] };
    }
  }

  async scrobble(trackId: string, submission = false): Promise<void> {
    try {
      const url = this.getUrl('scrobble', { id: trackId, submission: submission ? 'true' : 'false', time: Date.now().toString() });
      await fetch(url);
    } catch {
      // non-blocking
    }
  }

  async toggleStar(trackId: string, star: boolean): Promise<boolean> {
    try {
      const endpoint = star ? 'star' : 'unstar';
      const url = this.getUrl(endpoint, { id: trackId });
      const res = await fetch(url);
      return res.ok;
    } catch {
      return false;
    }
  }

  private mapSubsonicTrack(t: any): Track {
    return {
      id: t.id,
      title: t.title,
      artist: t.artist || 'Unknown Artist',
      artistId: t.artistId,
      album: t.album || 'Unknown Album',
      albumId: t.albumId,
      coverArt: this.getCoverArtUrl(t.coverArt),
      duration: t.duration || 180,
      streamUrl: this.getStreamUrl(t.id),
      year: t.year,
      genre: t.genre,
      trackNumber: t.track,
      bitRate: t.bitRate,
      suffix: t.suffix,
      starred: !!t.starred,
      playCount: t.playCount || 0,
    };
  }
}

export const subsonicClient = new SubsonicApiClient(SubsonicApiClient.loadConfigFromStorage() || {});
