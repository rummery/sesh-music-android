import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sesh_music/models/content.dart';
import 'package:sesh_music/services/offline_native.dart';
import 'package:sesh_music/services/offline_types.dart';

void main() {
  late Directory directory;
  final bytes = List.generate(200, (i) => i % 251);
  const track = MusicItem({
    'id': 'original-opaque-id',
    'kind': 'track',
    'title': 'Generated fixture',
  });
  late Json result;
  setUp(() async {
    directory = await Directory.systemTemp.createTemp('sesh-offline-test-');
    result = {
      'libraryTrackId': 'saved-id',
      'sizeBytes': bytes.length,
      'sha256': sha256.convert(bytes).toString(),
      'format': 'mp3',
    };
  });
  tearDown(() async {
    await directory.delete(recursive: true);
  });
  File partial() => File(
    '${directory.path}/${sha256.convert(utf8.encode(track.id))}.mp3.part',
  );
  test(
    'resumes partial audio and only publishes verified complete files',
    () async {
      await partial().writeAsBytes(bytes.take(42).toList());
      final storage = NativeOfflineStorage(
        directory,
        clientFactory: () => MockClient((request) async {
          expect(request.headers['Range'], 'bytes=42-');
          return http.Response.bytes(
            bytes.sublist(42),
            206,
            headers: {'content-range': 'bytes 42-199/200'},
          );
        }),
      );
      await storage.download(
        result: result,
        track: track,
        url: () => Uri.parse('https://music.example/rest/download'),
        token: TransferToken(),
        progress: (_, total) => expect(total, 200),
      );
      expect(await partial().exists(), false);
      final reopened = NativeOfflineStorage(directory);
      expect((await reopened.records()).single['libraryTrackId'], 'saved-id');
      expect(
        await File.fromUri(
          Uri.parse((await reopened.playbackUri(track.id))!),
        ).readAsBytes(),
        bytes,
      );
    },
  );
  test(
    'a full response replaces an existing partial instead of appending',
    () async {
      await partial().writeAsBytes([4, 5, 6]);
      final storage = NativeOfflineStorage(
        directory,
        clientFactory: () =>
            MockClient((_) async => http.Response.bytes(bytes, 200)),
      );
      await storage.download(
        result: result,
        track: track,
        url: () => Uri.parse('https://music.example/rest/download'),
        token: TransferToken(),
        progress: (_, _) {},
      );
      expect((await storage.records()).length, 1);
    },
  );
  test('checksum failures never become offline tracks', () async {
    final storage = NativeOfflineStorage(
      directory,
      clientFactory: () => MockClient(
        (_) async => http.Response.bytes(List.filled(200, 0), 200),
      ),
    );
    await expectLater(
      storage.download(
        result: result,
        track: track,
        url: () => Uri.parse('https://music.example/rest/download'),
        token: TransferToken(),
        progress: (_, _) {},
      ),
      throwsFormatException,
    );
    expect(await storage.records(), isEmpty);
    expect(await partial().exists(), false);
  });
  test('cancellation preserves resumable data but does not publish it', () async {
    final token = TransferToken();
    final storage = NativeOfflineStorage(
      directory,
      clientFactory: () =>
          MockClient((_) async => http.Response.bytes(bytes, 200)),
    );
    await expectLater(
      storage.download(
        result: result,
        track: track,
        url: () => Uri.parse('https://music.example/rest/download'),
        token: token,
        progress: (_, _) {
          token.cancelled = true;
        },
      ),
      throwsA(isA<TransferCancelled>()),
    );
    expect(await storage.records(), isEmpty);
    expect(await partial().exists(), true);
    // A fully received partial can be verified after restart without requesting an invalid EOF range.
    await storage.download(
      result: result,
      track: track,
      url: () => Uri.parse('https://music.example/rest/download'),
      token: TransferToken(),
      progress: (_, _) {},
    );
    expect((await storage.records()).length, 1);
  });
}
