import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/content.dart';

/// Only these environments are presented in the connection UI.
class SeshEnvironment {
  static const live = 'https://sesh.b33r.us';
  static const development = 'https://vmi3662398.contaboserver.net';
  static String url(String environment) =>
      environment == 'live' ? live : development;
  static String forServer(String base) =>
      Uri.tryParse(base)?.host == Uri.parse(live).host ? 'live' : 'development';
}

class ApiFailure implements Exception {
  final String code;
  final String message;
  final bool retryable;
  const ApiFailure(this.code, this.message, {this.retryable = false});
  @override
  String toString() => message;
}

class SeshApi {
  static const prefix = '/rest/sesh/v1';
  final http.Client client;
  String baseUrl;
  String username = '';
  String _password = '';
  Json capabilities = {};
  bool restoredOffline = false;
  int _connectionGeneration = 0;
  final Map<String, Uri> _mediaUris = {};
  final FlutterSecureStorage _secure = const FlutterSecureStorage();
  SeshApi({http.Client? client, String? baseUrl})
    : client = client ?? http.Client(),
      baseUrl =
          baseUrl ??
          const String.fromEnvironment('SESH_SERVER', defaultValue: '') {
    if (this.baseUrl.isEmpty) {
      this.baseUrl = kIsWeb ? Uri.base.origin : SeshEnvironment.live;
    }
  }
  bool get connected => username.isNotEmpty && capabilities.isNotEmpty;
  String get scope =>
      sha256.convert(utf8.encode('$baseUrl\n$username')).toString();
  static String token(String password, String salt) =>
      md5.convert(utf8.encode(password + salt)).toString();
  static String newKey() => List.generate(
    24,
    (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();

  Future<bool> restore() async {
    final generation = ++_connectionGeneration;
    final prefs = await SharedPreferences.getInstance();
    if (generation != _connectionGeneration) return false;
    baseUrl = prefs.getString('sesh.server') ?? baseUrl;
    username = prefs.getString('sesh.username') ?? '';
    // Browser previews never persist passwords. Native credentials use Android-backed storage.
    if (kIsWeb || username.isEmpty) return false;
    final connectionScope = scope;
    final password =
        await _secure.read(key: 'sesh.credentials.$connectionScope') ?? '';
    _checkConnection(generation, connectionScope);
    _password = password;
    if (_password.isEmpty) return false;
    try {
      final restoredCapabilities = await get('/capabilities');
      _checkConnection(generation, connectionScope);
      capabilities = restoredCapabilities;
      await prefs.setString(
        'sesh.capabilities.$connectionScope',
        jsonEncode(capabilities),
      );
    } catch (_) {
      _checkConnection(generation, connectionScope);
      final cached = prefs.getString('sesh.capabilities.$connectionScope');
      if (cached == null) rethrow;
      capabilities = Map<String, dynamic>.from(jsonDecode(cached));
      restoredOffline = true;
    }
    return true;
  }

  Future<void> connect(
    String base,
    String user,
    String password, {
    bool remember = true,
  }) async {
    final parsed = Uri.tryParse(base.trim());
    if (parsed == null ||
        parsed.host.isEmpty ||
        parsed.userInfo.isNotEmpty ||
        parsed.hasQuery ||
        parsed.hasFragment ||
        !(parsed.scheme == 'https' ||
            parsed.scheme == 'http' &&
                ['localhost', '127.0.0.1', '10.0.2.2'].contains(parsed.host))) {
      throw const ApiFailure(
        'INVALID_SERVER',
        'Use an HTTPS server URL, or localhost for development.',
      );
    }
    final generation = ++_connectionGeneration;
    baseUrl = base.trim().replaceFirst(RegExp(r'/+$'), '');
    username = user.trim();
    _password = password;
    _mediaUris.clear();
    capabilities = {};
    final connectionScope = scope;
    final connectedBase = baseUrl;
    final connectedUser = username;
    final connectedCapabilities = await get('/capabilities');
    _checkConnection(generation, connectionScope);
    capabilities = connectedCapabilities;
    restoredOffline = false;
    final prefs = await SharedPreferences.getInstance();
    _checkConnection(generation, connectionScope);
    await prefs.setString('sesh.server', connectedBase);
    _checkConnection(generation, connectionScope);
    await prefs.setString('sesh.username', connectedUser);
    _checkConnection(generation, connectionScope);
    await prefs.setString(
      'sesh.capabilities.$connectionScope',
      jsonEncode(connectedCapabilities),
    );
    _checkConnection(generation, connectionScope);
    if (!kIsWeb) {
      if (remember) {
        await _secure.write(
          key: 'sesh.credentials.$connectionScope',
          value: password,
        );
      } else {
        await _secure.delete(key: 'sesh.credentials.$connectionScope');
      }
    }
  }

  Future<void> logout() async {
    final oldScope = scope;
    _connectionGeneration++;
    capabilities = {};
    _password = '';
    _mediaUris.clear();
    username = '';
    if (!kIsWeb) await _secure.delete(key: 'sesh.credentials.$oldScope');
  }

  void _checkConnection(int generation, String connectionScope) {
    if (generation != _connectionGeneration || connectionScope != scope) {
      throw const ApiFailure(
        'ACCOUNT_CHANGED',
        'The account changed. Please retry this action.',
      );
    }
  }

  Uri authenticated(String path, [Map<String, String> parameters = const {}]) {
    final base = Uri.parse(baseUrl);
    final relative = Uri.parse(path);
    final basePath = base.path.replaceFirst(RegExp(r'/+$'), '');
    final relativePath =
        basePath.isNotEmpty && relative.path.startsWith('$basePath/rest/')
        ? relative.path.substring(basePath.length)
        : relative.path;
    // Never attach credentials to a URL outside this configured server.
    if (relative.hasScheme ||
        relative.hasAuthority ||
        relative.path.contains('..') ||
        !relativePath.startsWith('/rest/')) {
      throw const ApiFailure(
        'INVALID_PATH',
        'The server returned an invalid media path.',
      );
    }
    final salt = newKey();
    return base.replace(
      path: '$basePath$relativePath',
      queryParameters: {
        ...relative.queryParameters,
        ...parameters,
        'u': username,
        't': token(_password, salt),
        's': salt,
        'v': '1.16.1',
        'c': 'sesh-flutter',
      },
    );
  }

  // A logical image keeps its URL across widget rebuilds. Browser-issued range
  // requests similarly reuse the authenticated URL of their audio resource.
  Uri mediaUri(String path) {
    if (_mediaUris.length > 2048) _mediaUris.clear();
    return _mediaUris.putIfAbsent(path, () => authenticated(path));
  }

  Future<Json> get(String path, [Map<String, String> parameters = const {}]) =>
      request('GET', path, parameters: parameters);
  Future<Json> post(String path, Json body, {String? idempotencyKey}) async {
    if (idempotencyKey == null) return request('POST', path, body: body);
    final generation = _connectionGeneration;
    final connectionScope = scope;
    final intent =
        'sesh.intent.$scope.${sha256.convert(utf8.encode(jsonEncode({'path': path, 'body': body})))}';
    final prefs = await SharedPreferences.getInstance();
    final key = prefs.getString(intent) ?? idempotencyKey;
    await prefs.setString(intent, key);
    _checkConnection(generation, connectionScope);
    try {
      final data = await request('POST', path, body: body, key: key);
      await prefs.remove(intent);
      return data;
    } on ApiFailure catch (error) {
      if (!error.retryable) await prefs.remove(intent);
      rethrow;
    }
  }

  Future<Json> patch(String path, Json body) =>
      request('PATCH', path, body: body);
  Future<Json> delete(String path, [Json? body]) =>
      request('DELETE', path, body: body);

  Future<Json> request(
    String method,
    String path, {
    Json? body,
    Map<String, String> parameters = const {},
    String? key,
  }) async {
    final configuredPath = Uri.parse(
      baseUrl,
    ).path.replaceFirst(RegExp(r'/+$'), '');
    final fullPath =
        path.startsWith('/rest/') ||
            configuredPath.isNotEmpty &&
                path.startsWith('$configuredPath/rest/')
        ? path
        : '$prefix$path';
    final request = http.Request(method, authenticated(fullPath, parameters))
      ..followRedirects = false
      ..headers['Accept'] = 'application/json';
    if (key != null) request.headers['Idempotency-Key'] = key;
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    try {
      final response = await http.Response.fromStream(
        await client.send(request).timeout(const Duration(seconds: 45)),
      );
      Json data = {};
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map) data = Map<String, dynamic>.from(decoded);
      } catch (_) {
        /* A reverse-proxy error page is not exposed to the interface. */
      }
      if (response.statusCode >= 400 ||
          response.statusCode >= 300 ||
          data['error'] != null) {
        final error = data['error'] is Map ? data['error'] as Map : {};
        throw ApiFailure(
          '${error['code'] ?? 'HTTP_${response.statusCode}'}',
          '${error['message'] ?? (response.statusCode == 401 ? 'Please check your account details.' : 'The server request failed.')} ',
          retryable: error['retryable'] == true || response.statusCode >= 500,
        );
      }
      if (data.isEmpty && response.statusCode != 204) {
        throw const ApiFailure(
          'INVALID_RESPONSE',
          'This server did not return a Sesh API response.',
        );
      }
      return data;
    } on ApiFailure {
      rethrow;
    } catch (_) {
      throw const ApiFailure(
        'NETWORK',
        'Unable to reach the server. Check your connection and retry.',
        retryable: true,
      );
    }
  }

  void close() => client.close();
}
