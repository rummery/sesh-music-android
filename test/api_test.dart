import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sesh_music/services/api.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    SharedPreferences.setMockInitialValues({});
  });
  test('Subsonic token uses the documented password plus salt digest', () {
    expect(SeshApi.token('secret', 'salt'), '99cd2e5a95d555ee7be3b038a4a84625');
  });
  test(
    'extension requests use authentication without exporting the password',
    () async {
      final requests = <http.Request>[];
      final api = SeshApi(
        client: MockClient((request) async {
          requests.add(request);
          return http.Response(jsonEncode({'apiVersion': '1'}), 200);
        }),
      );
      await api.connect(
        'https://music.example',
        'listener',
        'private-password',
        remember: false,
      );
      await api.post('/offline-acquisitions', {
        'trackIds': ['opaque'],
      }, idempotencyKey: 'stable-key');
      expect(requests.last.url.path, '/rest/sesh/v1/offline-acquisitions');
      expect(requests.last.url.queryParameters['u'], 'listener');
      expect(requests.last.url.queryParameters['c'], 'sesh-flutter');
      expect(requests.last.url.queryParameters.containsKey('p'), false);
      expect(requests.last.url.toString(), isNot(contains('private-password')));
      expect(requests.last.headers['Idempotency-Key'], 'stable-key');
      expect(
        requests.last.url.queryParameters['s'],
        isNot(requests.first.url.queryParameters['s']),
      );
      expect(
        requests.last.url.queryParameters['t'],
        SeshApi.token(
          'private-password',
          requests.last.url.queryParameters['s']!,
        ),
      );
    },
  );
  test(
    'credentials are never attached to arbitrary artwork or audio hosts',
    () {
      final api = SeshApi(baseUrl: 'https://music.example');
      for (final path in [
        'https://external.example/audio',
        '//external.example/rest/audio',
        '/other/audio',
        '/rest/../secrets',
      ]) {
        expect(() => api.authenticated(path), throwsA(isA<ApiFailure>()));
      }
    },
  );
  test('plain HTTP credentials are restricted to local development', () async {
    final api = SeshApi();
    await expectLater(
      api.connect('http://music.example', 'listener', 'secret'),
      throwsA(isA<ApiFailure>()),
    );
    await expectLater(
      api.connect('https://person:secret@music.example', 'listener', 'secret'),
      throwsA(isA<ApiFailure>()),
    );
  });
  test(
    'reverse-proxy errors do not leak unstructured response bodies',
    () async {
      final api = SeshApi(
        baseUrl: 'https://music.example',
        client: MockClient(
          (_) async => http.Response('private diagnostic body', 502),
        ),
      );
      try {
        await api.get('/search');
        fail('expected error');
      } on ApiFailure catch (error) {
        expect(error.retryable, true);
        expect(error.message, isNot(contains('private diagnostic')));
      }
    },
  );
  test('server error codes and retry instructions remain structured', () async {
    final api = SeshApi(
      baseUrl: 'https://music.example',
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'error': {
              'code': 'MEDIA_UNAVAILABLE',
              'message': 'This track is unavailable.',
              'retryable': false,
            },
          }),
          422,
        ),
      ),
    );
    try {
      await api.get('/tracks/example');
      fail('expected error');
    } on ApiFailure catch (error) {
      expect(error.code, 'MEDIA_UNAVAILABLE');
      expect(error.retryable, false);
    }
  });
  test(
    'server base paths are included exactly once for API and returned media paths',
    () async {
      final api = SeshApi(
        baseUrl: 'https://music.example/music',
        client: MockClient((request) async {
          expect(request.url.path, '/music/rest/sesh/v1/capabilities');
          return http.Response('{"apiVersion":"1"}', 200);
        }),
      );
      await api.get('/capabilities');
      expect(
        api.authenticated('/rest/sesh/v1/playbacks/id/audio').path,
        '/music/rest/sesh/v1/playbacks/id/audio',
      );
      expect(
        api.authenticated('/music/rest/sesh/v1/tracks/id/download').path,
        '/music/rest/sesh/v1/tracks/id/download',
      );
      expect(
        () => api.authenticated('/other/rest/sesh/v1/audio'),
        throwsA(isA<ApiFailure>()),
      );
    },
  );
  test(
    'uncertain creation failures retain their idempotency key across retries',
    () async {
      final keys = <String>[];
      final api = SeshApi(
        baseUrl: 'https://music.example',
        client: MockClient((request) async {
          keys.add(request.headers['Idempotency-Key']!);
          return keys.length == 1
              ? http.Response('{}', 503)
              : http.Response('{"id":"same-job"}', 202);
        }),
      );
      await expectLater(
        api.post('/offline-acquisitions', {
          'trackIds': ['one'],
        }, idempotencyKey: 'original-key'),
        throwsA(isA<ApiFailure>()),
      );
      expect(
        (await api.post('/offline-acquisitions', {
          'trackIds': ['one'],
        }, idempotencyKey: 'new-attempt-key'))['id'],
        'same-job',
      );
      expect(keys, ['original-key', 'original-key']);
    },
  );
  test(
    'account changes while loading an intent never send a mutation as the new user',
    () async {
      var requests = 0;
      final api = SeshApi(
        baseUrl: 'https://music.example',
        client: MockClient((request) async {
          requests++;
          return http.Response('{"id":"unexpected"}', 202);
        }),
      );
      api.username = 'first';
      final pending = api.post('/offline-acquisitions', {
        'trackIds': ['opaque'],
      }, idempotencyKey: 'intent');
      api.username = 'second';
      await expectLater(
        pending,
        throwsA(
          isA<ApiFailure>().having((e) => e.code, 'code', 'ACCOUNT_CHANGED'),
        ),
      );
      expect(requests, 0);
    },
  );
  test(
    'a late connection response cannot overwrite the latest account or preferences',
    () async {
      final firstResponse = Completer<http.Response>();
      final api = SeshApi(
        client: MockClient((request) async {
          if (request.url.queryParameters['u'] == 'first') {
            return firstResponse.future;
          }
          return http.Response('{"apiVersion":"1","marker":"second"}', 200);
        }),
      );
      final first = api.connect(
        'https://music.example',
        'first',
        'first-password',
        remember: false,
      );
      final rejected = expectLater(
        first,
        throwsA(
          isA<ApiFailure>().having((e) => e.code, 'code', 'ACCOUNT_CHANGED'),
        ),
      );
      await api.connect(
        'https://music.example',
        'second',
        'second-password',
        remember: false,
      );
      firstResponse.complete(
        http.Response('{"apiVersion":"1","marker":"first"}', 200),
      );
      await rejected;
      expect(api.username, 'second');
      expect(api.capabilities['marker'], 'second');
      expect(
        (await SharedPreferences.getInstance()).getString('sesh.username'),
        'second',
      );
    },
  );
}
