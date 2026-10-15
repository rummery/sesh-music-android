import 'dart:async';
import 'dart:convert';
import 'package:audio_service/audio_service.dart';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/content.dart';
import 'api.dart';
import 'offline.dart';
import 'player.dart';

class SeshController extends ChangeNotifier {
  final SeshApi api;
  final SeshAudioHandler audio;
  OfflineStorage? offline;
  bool starting = true;
  bool busy = false;
  bool offlineMode = false;
  String? message;
  String? playbackError;
  String? playbackNotice;
  String playbackState = 'idle';
  String? _playbackId;
  int _playGeneration = 0;
  int _accountGeneration = 0;
  Timer? _lease;
  Timer? _jobsTimer;
  bool _pollingJobs = false;
  List<MusicItem> queue = [];
  int queueIndex = 0;
  List<MusicItem> playlists = [];
  List<Json> jobs = [];
  List<Json> offlineRecords = [];
  final Map<String, Json> transfers = {};
  final Map<String, TransferToken> _tokens = {};
  final Map<String, List<MusicItem>> _offlineJobs = {};
  final Map<String, List<MusicItem>> _offlineIntents = {};
  final Map<String, String> _offlineIntentAlbums = {};
  final Set<String> _notifiedJobs = {};
  bool _loadedJobs = false;
  final Map<String, bool> favorites = {};

  SeshController(this.api, this.audio) {
    audio.onNext = next;
    audio.onPrevious = previous;
    audio.onError = (error) {
      playbackState = 'failed';
      playbackError = error;
      notifyListeners();
    };
    audio.player.playerStateStream.listen((state) {
      notifyListeners();
      if (state.processingState == ProcessingState.completed &&
          queueIndex + 1 < queue.length) {
        unawaited(next());
      }
    });
  }
  MusicItem? get current => queue.isEmpty ? null : queue[queueIndex];
  bool isFavorite(MusicItem item) =>
      favorites[item.id] ?? item.json['starred'] == true;
  Json? offlineRecord(String id) {
    for (final record in offlineRecords) {
      if ((record['track'] as Map?)?['id'] == id ||
          record['libraryTrackId'] == id) {
        return record;
      }
    }
    return null;
  }

  bool isOffline(String id) => offlineRecord(id) != null;
  void _resetAccount() {
    _accountGeneration++;
    _jobsTimer?.cancel();
    for (final token in _tokens.values) {
      token.cancelled = true;
    }
    _tokens.clear();
    transfers.clear();
    favorites.clear();
    _offlineJobs.clear();
    _offlineIntents.clear();
    _offlineIntentAlbums.clear();
    _notifiedJobs.clear();
    _loadedJobs = false;
    _pollingJobs = false;
    playlists = [];
    jobs = [];
    offlineRecords = [];
  }

  Future<void> initialize() async {
    try {
      if (await api.restore()) {
        offlineMode = api.restoredOffline;
        await _connected();
      }
    } catch (_) {
      message = 'Reconnect to your server to continue.';
    }
    starting = false;
    notifyListeners();
  }

  Future<void> connect(
    String base,
    String user,
    String password,
    bool remember,
  ) async {
    busy = true;
    notifyListeners();
    try {
      await stop();
      _resetAccount();
      await offline?.close();
      offline = null;
      await api.connect(base, user, password, remember: remember);
      await _connected();
      message = 'Connected to Sesh Music';
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> _connected() async {
    _resetAccount();
    final generation = _accountGeneration;
    final connectionScope = api.scope;
    await offline?.close();
    if (generation != _accountGeneration) return;
    final storage = await openOfflineStorage(connectionScope);
    if (generation != _accountGeneration) {
      await storage.close();
      return;
    }
    final records = await storage.records();
    if (generation != _accountGeneration) {
      await storage.close();
      return;
    }
    offline = storage;
    offlineRecords = records;
    final prefs = await SharedPreferences.getInstance();
    if (generation != _accountGeneration) return;
    try {
      final stored =
          jsonDecode(prefs.getString('sesh.pending.${api.scope}') ?? '{}')
              as Map;
      stored.forEach((key, value) {
        _offlineJobs['$key'] = jsonList(value).map(MusicItem.new).toList();
      });
      final intents =
          jsonDecode(
                prefs.getString('sesh.offline-intents.${api.scope}') ?? '{}',
              )
              as Map;
      final albums =
          jsonDecode(
                prefs.getString('sesh.offline-albums.${api.scope}') ?? '{}',
              )
              as Map;
      albums.forEach((key, value) => _offlineIntentAlbums['$key'] = '$value');
      intents.forEach((key, value) {
        _offlineIntents['$key'] = jsonList(value).map(MusicItem.new).toList();
      });
    } catch (_) {
      /* Invalid metadata never marks an incomplete download complete. */
    }
    _jobsTimer = Timer.periodic(
      const Duration(seconds: 3),
      (_) => unawaited(refreshJobs()),
    );
    await Future.wait([refreshPlaylists().catchError((_) {}), refreshJobs()]);
    if (generation != _accountGeneration) return;
    for (final entry in _offlineIntents.entries.toList()) {
      unawaited(
        _submitOfflineIntent(
          entry.key,
          entry.value,
          albumId: _offlineIntentAlbums[entry.key],
        ).catchError((_) {}),
      );
    }
  }

  Future<void> logout() async {
    await stop();
    _resetAccount();
    await offline?.close();
    offline = null;
    await api.logout();
    notifyListeners();
  }

  void toast(String text) {
    message = text;
    notifyListeners();
  }

  Future<void> refreshPlaylists() async {
    if (!api.connected) {
      return;
    }
    final generation = _accountGeneration;
    final items = <MusicItem>[];
    String? cursor;
    do {
      final data = await api.get('/playlists', {
        'limit': '100',
        'cursor': ?cursor,
      });
      if (generation != _accountGeneration) {
        return;
      }
      items.addAll(jsonList(data['items']).map(MusicItem.new));
      cursor = data['nextCursor'] as String?;
    } while (cursor != null && items.length < 10000);
    playlists = items;
    notifyListeners();
  }

  Future<List<MusicItem>> collectionTracks(MusicItem collection) async {
    final generation = _accountGeneration;
    final result = <MusicItem>[];
    String? cursor;
    do {
      final path = collection.kind == 'playlist'
          ? '/playlists/${Uri.encodeComponent(collection.id)}/entries'
          : '/albums/${Uri.encodeComponent(collection.id)}/tracks';
      final data = await api.get(path, {'limit': '100', 'cursor': ?cursor});
      if (generation != _accountGeneration) {
        throw const ApiFailure(
          'ACCOUNT_CHANGED',
          'The account changed. Please reopen this collection.',
        );
      }
      result.addAll(
        jsonList(data['items']).map(
          (e) => MusicItem(
            e['track'] is Map ? Map<String, dynamic>.from(e['track']) : e,
          ),
        ),
      );
      cursor = data['nextCursor'] as String?;
    } while (cursor != null && result.length < 10000);
    return result;
  }

  Future<void> play(
    MusicItem track, {
    List<MusicItem>? tracks,
    int? index,
  }) async {
    queue = tracks ?? [track];
    queueIndex = index ?? queue.indexWhere((e) => e.id == track.id);
    if (queueIndex < 0 || queueIndex >= queue.length) {
      queue = [track];
      queueIndex = 0;
    }
    await _playCurrent();
  }

  Future<void> _playCurrent() async {
    final track = current;
    if (track == null) {
      return;
    }
    final generation = ++_playGeneration;
    playbackError = null;
    playbackNotice = null;
    playbackState = 'preparing';
    _lease?.cancel();
    final old = _playbackId;
    _playbackId = null;
    if (old != null && api.connected) {
      unawaited(
        api.delete('/playbacks/$old').catchError((_) => <String, dynamic>{}),
      );
    }
    await audio.player.stop();
    notifyListeners();
    try {
      final record = offlineRecord(track.id);
      final local = await offline?.playbackUri(
        '${(record?['track'] as Map?)?['id'] ?? track.id}',
      );
      String uri;
      if (local != null) {
        uri = local;
      } else {
        if (offlineMode) {
          throw const ApiFailure(
            'OFFLINE',
            'This track is not downloaded on this device.',
          );
        }
        var data = await api.post('/playbacks', {
          'trackId': track.id,
        }, idempotencyKey: SeshApi.newKey());
        final id = '${data['id']}';
        if (generation != _playGeneration) {
          unawaited(
            api.delete('/playbacks/$id').catchError((_) => <String, dynamic>{}),
          );
          return;
        }
        _playbackId = id;
        while (data['state'] == 'preparing') {
          await Future<void>.delayed(const Duration(milliseconds: 800));
          if (generation != _playGeneration) {
            return;
          }
          data = await api.get('/playbacks/${Uri.encodeComponent(id)}');
        }
        if (generation != _playGeneration) {
          return;
        }
        if (data['state'] != 'ready' || data['audioPath'] == null) {
          final error = data['error'];
          throw ApiFailure(
            'PLAYBACK_FAILED',
            error is Map
                ? '${error['message'] ?? 'This track could not be prepared.'}'
                : 'This track could not be prepared.',
          );
        }
        final notices = jsonList(data['notices']);
        if (notices.isNotEmpty) {
          playbackNotice = notices.map((e) => e['message']).join(' ');
        }
        uri = api.authenticated('${data['audioPath']}').toString();
        _lease = Timer.periodic(const Duration(seconds: 25), (_) {
          unawaited(
            api
                .post('/playbacks/$id/lease', {})
                .catchError((_) => <String, dynamic>{}),
          );
        });
      }
      if (generation != _playGeneration) {
        return;
      }
      audio.queue.add(queue.map(_mediaItem).toList());
      audio.mediaItem.add(_mediaItem(track));
      await audio.player.setAudioSource(
        AudioSource.uri(Uri.parse(uri), tag: _mediaItem(track)),
      );
      if (generation != _playGeneration) {
        return;
      }
      playbackState = 'ready';
      notifyListeners();
      _resumeReady();
    } catch (error) {
      if (generation == _playGeneration) {
        playbackState = 'failed';
        playbackError = '$error';
        notifyListeners();
      }
    }
  }

  MediaItem _mediaItem(MusicItem track) => MediaItem(
    id: track.id,
    title: track.title,
    artist: track.artistName,
    album: '${track.album['title'] ?? ''}',
    duration: Duration(milliseconds: track.durationMs),
    artUri: track.artworkPath.isEmpty || offlineMode
        ? null
        : api.mediaUri(track.artworkPath),
  );
  Future<void> togglePlay() async {
    if (audio.player.playing) {
      await audio.pause();
    } else if (playbackState == 'failed' || playbackState == 'idle') {
      await _playCurrent();
    } else {
      _resumeReady();
    }
  }

  void _resumeReady() {
    final generation = _playGeneration;
    playbackError = null;
    // Start synchronously while a browser click still carries its user gesture.
    final resumed = audio.play();
    notifyListeners();
    unawaited(
      resumed.catchError((Object _) {
        if (generation != _playGeneration) return;
        playbackError ??=
            'Playback was blocked or interrupted. Press Play to retry.';
        notifyListeners();
      }),
    );
  }

  Future<void> next() async {
    if (queueIndex + 1 < queue.length) {
      queueIndex++;
      await _playCurrent();
    }
  }

  Future<void> previous() async {
    if (audio.player.position.inSeconds > 3) {
      await audio.seek(Duration.zero);
    } else if (queueIndex > 0) {
      queueIndex--;
      await _playCurrent();
    }
  }

  Future<void> stop() async {
    _playGeneration++;
    _lease?.cancel();
    await audio.stop();
    if (_playbackId != null && api.connected) {
      try {
        await api.delete('/playbacks/$_playbackId');
      } catch (_) {}
    }
    _playbackId = null;
    playbackState = 'idle';
    queue = [];
    notifyListeners();
  }

  Future<void> setFavorite(MusicItem item) async {
    final generation = _accountGeneration;
    final starred = !isFavorite(item);
    await api.post('/tracks/${Uri.encodeComponent(item.id)}/favorite', {
      'starred': starred,
    });
    if (generation != _accountGeneration) return;
    favorites[item.id] = starred;
    notifyListeners();
  }

  Future<void> createPlaylist(String name, bool public) async {
    final generation = _accountGeneration;
    await api.post('/playlists', {
      'name': name,
      'public': public,
    }, idempotencyKey: SeshApi.newKey());
    if (generation != _accountGeneration) return;
    await refreshPlaylists();
  }

  Future<void> addToPlaylist(MusicItem playlist, List<MusicItem> tracks) async {
    final generation = _accountGeneration;
    final current = await api.get(
      '/playlists/${Uri.encodeComponent(playlist.id)}',
    );
    if (generation != _accountGeneration) {
      throw const ApiFailure(
        'ACCOUNT_CHANGED',
        'The account changed. Please retry this action.',
      );
    }
    await api.post('/playlists/${Uri.encodeComponent(playlist.id)}/entries', {
      'revision': current['revision'],
      'trackIds': tracks.map((e) => e.id).toList(),
    }, idempotencyKey: SeshApi.newKey());
    if (generation != _accountGeneration) return;
    toast('Added to ${playlist.title}');
    await refreshPlaylists();
  }

  Future<void> importPlaylist(MusicItem playlist) async {
    final generation = _accountGeneration;
    final job = await api.post('/playlist-imports', {
      'playlistId': playlist.id,
      'public': false,
    }, idempotencyKey: SeshApi.newKey());
    if (generation != _accountGeneration) return;
    if (job['id'] != null) {
      _notifiedJobs.remove('${job['id']}');
    }
    toast('Saving ${playlist.title} to your server library');
    await refreshJobs();
  }

  Future<void> downloadOffline(
    List<MusicItem> tracks, {
    MusicItem? album,
  }) async {
    final generation = _accountGeneration;
    final pending = tracks.where((t) => !isOffline(t.id)).toList();
    if (pending.isEmpty && album == null) {
      toast('Already downloaded on this device');
      return;
    }
    final fingerprint = jsonEncode(pending.map((e) => e.id).toList());
    final existing = _offlineIntents.entries.where(
      (entry) =>
          jsonEncode(entry.value.map((e) => e.id).toList()) == fingerprint &&
          _offlineIntentAlbums[entry.key] == album?.id,
    );
    final key = existing.isEmpty ? SeshApi.newKey() : existing.first.key;
    _offlineIntents[key] = pending;
    if (album != null) _offlineIntentAlbums[key] = album.id;
    await _persistPending();
    if (generation != _accountGeneration) return;
    await _submitOfflineIntent(key, pending, albumId: album?.id);
    toast('Preparing permanent server copies before device download');
    await refreshJobs();
  }

  Future<void> _submitOfflineIntent(
    String key,
    List<MusicItem> pending, {
    String? albumId,
  }) async {
    final generation = _accountGeneration;
    final job = await api.post('/offline-acquisitions', {
      if (albumId != null)
        'albumId': albumId
      else
        'trackIds': pending.map((e) => e.id).toList(),
    }, idempotencyKey: key);
    if (generation != _accountGeneration) return;
    _offlineJobs['${job['id']}'] = pending;
    // Persist the acknowledged job before removing its retryable creation intent.
    await _persistPending();
    _offlineIntents.remove(key);
    _offlineIntentAlbums.remove(key);
    await _persistPending();
  }

  Future<void> _persistPending() async {
    final scope = api.scope;
    final pending = jsonEncode(
      _offlineJobs.map(
        (id, tracks) => MapEntry(id, tracks.map((t) => t.json).toList()),
      ),
    );
    final intents = jsonEncode(
      _offlineIntents.map(
        (id, tracks) => MapEntry(id, tracks.map((t) => t.json).toList()),
      ),
    );
    final albums = jsonEncode(_offlineIntentAlbums);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('sesh.offline-albums.$scope', albums);
    await prefs.setString('sesh.pending.$scope', pending);
    await prefs.setString('sesh.offline-intents.$scope', intents);
  }

  Future<void> refreshJobs() async {
    if (!api.connected || _pollingJobs) {
      return;
    }
    final generation = _accountGeneration;
    _pollingJobs = true;
    try {
      final data = await api.get('/jobs');
      if (generation != _accountGeneration) {
        return;
      }
      jobs = jsonList(data['items'] ?? data['jobs']);
      final visibleIds = jobs.map((job) => '${job['id']}').toSet();
      for (final id in _offlineJobs.keys.toList()) {
        if (!visibleIds.contains(id)) {
          try {
            final pendingJob = await api.get(
              '/jobs/${Uri.encodeComponent(id)}',
            );
            if (generation != _accountGeneration) return;
            jobs.add(pendingJob);
          } on ApiFailure catch (error) {
            if (error.code != 'NOT_FOUND') rethrow;
          }
        }
      }
      for (final job in jobs) {
        final id = '${job['id']}';
        if (job['state'] == 'complete') {
          if (_loadedJobs && _notifiedJobs.add(id)) {
            message = job['type'] == 'playlist-import'
                ? 'Playlist saved to your library'
                : 'Server acquisition complete';
            unawaited(refreshPlaylists().catchError((_) {}));
          }
          _notifiedJobs.add(id);
        }
        if (_offlineJobs.containsKey(id) &&
            ['complete', 'failed', 'interrupted'].contains(job['state'])) {
          final detail = await api.get('/jobs/${Uri.encodeComponent(id)}');
          if (generation != _accountGeneration) {
            return;
          }
          final results = jsonList(detail['results']);
          for (final track in _offlineJobs[id]!) {
            if (_tokens.length >= 2) {
              break;
            }
            if (isOffline(track.id) ||
                _tokens.containsKey(track.id) ||
                transfers[track.id]?['state'] == 'failed' ||
                transfers[track.id]?['state'] == 'cancelled') {
              continue;
            }
            final matches = results.where(
              (r) =>
                  r['requestedTrackId'] == track.id &&
                  r['downloadPath'] != null,
            );
            if (matches.isNotEmpty) {
              unawaited(_downloadResult(track, matches.first));
            }
          }
        }
      }
      _loadedJobs = true;
      notifyListeners();
    } catch (_) {
      /* Preserve last known progress while disconnected. */
    } finally {
      if (generation == _accountGeneration) {
        _pollingJobs = false;
      }
    }
  }

  Future<void> _downloadResult(MusicItem track, Json result) async {
    final generation = _accountGeneration;
    final storage = offline;
    if (storage == null) {
      return;
    }
    final token = TransferToken();
    _tokens[track.id] = token;
    transfers[track.id] = {
      'state': 'downloading',
      'title': track.title,
      'bytes': 0,
      'total': result['sizeBytes'],
      'result': result,
      'track': track.json,
    };
    notifyListeners();
    try {
      await storage.download(
        result: result,
        track: track,
        url: () => api.authenticated('${result['downloadPath']}'),
        token: token,
        progress: (bytes, total) {
          if (generation != _accountGeneration) {
            return;
          }
          transfers[track.id]!['bytes'] = bytes;
          transfers[track.id]!['total'] = total;
          notifyListeners();
        },
      );
      if (generation != _accountGeneration) {
        return;
      }
      offlineRecords = await storage.records();
      transfers[track.id]!['state'] = 'complete';
      message = '${track.title} is available offline';
      final finished = _offlineJobs.entries
          .where((e) => e.value.every((t) => isOffline(t.id)))
          .map((e) => e.key)
          .toList();
      for (final id in finished) {
        _offlineJobs.remove(id);
      }
      await _persistPending();
    } on TransferCancelled {
      if (generation == _accountGeneration) {
        transfers[track.id]?['state'] = 'cancelled';
      }
    } catch (error) {
      if (generation == _accountGeneration) {
        transfers[track.id]?['state'] = 'failed';
        transfers[track.id]?['error'] = '$error';
      }
    } finally {
      if (generation == _accountGeneration) {
        _tokens.remove(track.id);
        notifyListeners();
      }
    }
  }

  void cancelTransfer(String id) {
    _tokens[id]?.cancelled = true;
  }

  Future<void> retryTransfer(String id) async {
    final transfer = transfers[id];
    if (transfer != null) {
      await _downloadResult(
        MusicItem(Map<String, dynamic>.from(transfer['track'])),
        Map<String, dynamic>.from(transfer['result']),
      );
    }
  }

  Future<void> jobAction(String id, String action) async {
    await api.post('/jobs/${Uri.encodeComponent(id)}/$action', {});
    await refreshJobs();
  }

  @override
  void dispose() {
    _lease?.cancel();
    _jobsTimer?.cancel();
    for (final token in _tokens.values) {
      token.cancelled = true;
    }
    unawaited(audio.dispose());
    unawaited(offline?.close() ?? Future.value());
    api.close();
    super.dispose();
  }
}
