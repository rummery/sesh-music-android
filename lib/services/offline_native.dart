import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../models/content.dart';
import 'offline_types.dart';

Future<OfflineStorage> openOfflineStorage(String scope) async {
  final root = await getApplicationSupportDirectory();
  final directory = Directory('${root.path}/offline/$scope');
  await directory.create(recursive: true);
  return NativeOfflineStorage(directory);
}

class NativeOfflineStorage implements OfflineStorage {
  final Directory directory;
  final http.Client Function() clientFactory;
  NativeOfflineStorage(this.directory, {http.Client Function()? clientFactory})
    : clientFactory = clientFactory ?? http.Client.new;
  String _key(String id) => sha256.convert(utf8.encode(id)).toString();
  File _metadata(String id) => File('${directory.path}/${_key(id)}.json');
  Future<Json?> _read(String id) async {
    try {
      return Map<String, dynamic>.from(
        jsonDecode(await _metadata(id).readAsString()),
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Future<List<Json>> records() async {
    final result = <Json>[];
    await for (final entry in directory.list()) {
      if (entry is File && entry.path.endsWith('.json')) {
        try {
          final record = Map<String, dynamic>.from(
            jsonDecode(await entry.readAsString()),
          );
          if (await File('${directory.path}/${record['file']}').exists()) {
            result.add(record);
          }
        } catch (_) {
          /* Ignore interrupted metadata; incomplete audio is never listed. */
        }
      }
    }
    return result;
  }

  @override
  Future<String?> playbackUri(String trackId) async {
    final record = await _read(trackId);
    if (record == null) return null;
    final file = File('${directory.path}/${record['file']}');
    return await file.exists() ? file.uri.toString() : null;
  }

  @override
  Future<void> remove(String trackId) async {
    final record = await _read(trackId);
    if (record != null) {
      final file = File('${directory.path}/${record['file']}');
      if (await file.exists()) await file.delete();
    }
    final metadata = _metadata(trackId);
    if (await metadata.exists()) await metadata.delete();
  }

  @override
  Future<void> download({
    required Json result,
    required MusicItem track,
    required Uri Function() url,
    required TransferToken token,
    required void Function(int bytes, int total) progress,
  }) async {
    final key = _key(track.id);
    final extension = audioExtension(result);
    final target = File('${directory.path}/$key.$extension');
    final partial = File('${target.path}.part');
    var offset = await partial.exists() ? await partial.length() : 0;
    final expectedSize = intValue(result['sizeBytes']);
    if (offset > expectedSize && expectedSize > 0) {
      await partial.delete();
      offset = 0;
    }
    final client = clientFactory();
    try {
      if (token.cancelled) throw TransferCancelled();
      if (offset != expectedSize || expectedSize <= 0) {
        final request = http.Request('GET', url())..followRedirects = false;
        if (offset > 0) request.headers['Range'] = 'bytes=$offset-';
        final response = await client
            .send(request)
            .timeout(const Duration(seconds: 45));
        if (response.statusCode == 200) {
          offset = 0;
        } else if (response.statusCode != 206 ||
            !(response.headers['content-range'] ?? '').startsWith(
              'bytes $offset-',
            )) {
          throw const FormatException(
            'The server could not resume this file. Retry the download.',
          );
        }
        final sink = partial.openWrite(
          mode: offset == 0 ? FileMode.write : FileMode.append,
        );
        try {
          await for (final chunk in response.stream.timeout(
            const Duration(seconds: 45),
          )) {
            if (token.cancelled) throw TransferCancelled();
            sink.add(chunk);
            offset += chunk.length;
            progress(offset, expectedSize);
          }
        } finally {
          await sink.close();
        }
      }
      if (token.cancelled) throw TransferCancelled();
      if (expectedSize > 0 && offset != expectedSize) {
        throw const FormatException(
          'The download was incomplete. Retry to resume.',
        );
      }
      final checksum = (await sha256.bind(partial.openRead()).first).toString();
      if (result['sha256'] == null || checksum != result['sha256']) {
        await partial.delete();
        throw const FormatException(
          'The downloaded file failed verification. Please retry.',
        );
      }
      await partial.rename(target.path);
      final metadata = _metadata(track.id);
      final staged = File('${metadata.path}.new');
      await staged.writeAsString(
        jsonEncode({
          'track': track.json,
          'libraryTrackId': result['libraryTrackId'],
          'file': '$key.$extension',
          'format': extension,
          'bytes': offset,
          'sha256': checksum,
        }),
        flush: true,
      );
      await staged.rename(metadata.path);
    } finally {
      client.close();
    }
  }

  @override
  Future<void> close() async {}
}
