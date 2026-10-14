import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:web/web.dart' as web;

import '../models/content.dart';
import 'offline_types.dart';

Future<JSAny?> _request(web.IDBRequest request) {
  final completer = Completer<JSAny?>();
  request.onsuccess = ((web.Event event) {
    if (!completer.isCompleted) completer.complete(request.result);
  }).toJS;
  request.onerror = ((web.Event event) {
    if (!completer.isCompleted) {
      completer.completeError(
        StateError(
          'Browser storage operation failed. Check available storage.',
        ),
      );
    }
  }).toJS;
  return completer.future;
}

Future<void> _committed(web.IDBTransaction transaction) {
  final completer = Completer<void>();
  transaction.oncomplete = ((web.Event event) {
    if (!completer.isCompleted) completer.complete();
  }).toJS;
  void failed(web.Event event) {
    if (!completer.isCompleted) {
      completer.completeError(
        StateError('Browser storage could not commit this download.'),
      );
    }
  }

  transaction.onerror = failed.toJS;
  transaction.onabort = failed.toJS;
  return completer.future;
}

Future<OfflineStorage> openOfflineStorage(String scope) async {
  final request = web.window.indexedDB.open('sesh-offline-v2-$scope', 1);
  request.onupgradeneeded = ((web.Event event) {
    final database = request.result as web.IDBDatabase;
    database.createObjectStore('metadata');
    database.createObjectStore('audio');
  }).toJS;
  final database = await _request(request).timeout(const Duration(seconds: 15));
  return WebOfflineStorage(database as web.IDBDatabase);
}

class WebOfflineStorage implements OfflineStorage {
  final web.IDBDatabase database;
  final Map<String, String> _urls = {};
  WebOfflineStorage(this.database);

  @override
  Future<List<Json>> records() async {
    final transaction = database.transaction('metadata'.toJS, 'readonly');
    final values =
        await _request(transaction.objectStore('metadata').getAll()) as JSArray;
    return values.toDart
        .map(
          (value) =>
              Map<String, dynamic>.from(jsonDecode((value as JSString).toDart)),
        )
        .toList();
  }

  @override
  Future<String?> playbackUri(String trackId) async {
    if (_urls.containsKey(trackId)) return _urls[trackId];
    final transaction = database.transaction('audio'.toJS, 'readonly');
    final value = await _request(
      transaction.objectStore('audio').get(trackId.toJS),
    );
    if (value == null || value.isUndefinedOrNull) return null;
    return _urls[trackId] = web.URL.createObjectURL(value as web.Blob);
  }

  @override
  Future<void> remove(String trackId) async {
    final old = _urls.remove(trackId);
    if (old != null) web.URL.revokeObjectURL(old);
    final transaction = database.transaction(
      ['metadata'.toJS, 'audio'.toJS].toJS,
      'readwrite',
    );
    final committed = _committed(transaction);
    transaction.objectStore('metadata').delete(trackId.toJS);
    transaction.objectStore('audio').delete(trackId.toJS);
    await committed;
  }

  @override
  Future<void> download({
    required Json result,
    required MusicItem track,
    required Uri Function() url,
    required TransferToken token,
    required void Function(int bytes, int total) progress,
  }) async {
    final format = audioExtension(result);
    final client = http.Client();
    try {
      final response = await client.send(
        http.Request('GET', url())..followRedirects = false,
      );
      if (response.statusCode != 200) {
        throw const FormatException('The file download failed. Please retry.');
      }
      final builder = BytesBuilder(copy: false);
      final total = intValue(result['sizeBytes']);
      await for (final chunk in response.stream.timeout(
        const Duration(seconds: 45),
      )) {
        if (token.cancelled) throw TransferCancelled();
        builder.add(chunk);
        progress(builder.length, total);
      }
      if (token.cancelled) throw TransferCancelled();
      final bytes = builder.takeBytes();
      if ((total > 0 && bytes.length != total) ||
          result['sha256'] == null ||
          sha256.convert(bytes).toString() != result['sha256']) {
        throw const FormatException(
          'The downloaded file failed verification. Please retry.',
        );
      }
      final blob = web.Blob(
        [bytes.toJS].toJS,
        web.BlobPropertyBag(type: audioMime(format)),
      );
      final metadata = jsonEncode({
        'id': track.id,
        'track': track.json,
        'libraryTrackId': result['libraryTrackId'],
        'format': format,
        'bytes': bytes.length,
        'sha256': result['sha256'],
      });
      final transaction = database.transaction(
        ['metadata'.toJS, 'audio'.toJS].toJS,
        'readwrite',
      );
      final committed = _committed(transaction);
      transaction.objectStore('audio').put(blob, track.id.toJS);
      transaction.objectStore('metadata').put(metadata.toJS, track.id.toJS);
      await committed;
    } finally {
      client.close();
    }
  }

  @override
  Future<void> close() async {
    for (final url in _urls.values) {
      web.URL.revokeObjectURL(url);
    }
    _urls.clear();
    database.close();
  }
}
