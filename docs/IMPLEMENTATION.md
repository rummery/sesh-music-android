# Flutter implementation notes

- Original application revision: `907460f` (React/TypeScript web export).
- Matching Sesh backend implementation: `edda8e32`; API contract copied unchanged
  from its `docs/sesh/mobile-api-v1.openapi.yaml` into `docs/api/`.
- Feature branch: `feature/flutter-sesh-v1`; original files moved intact to `web-reference/`.
- Flutter toolchain: stable 3.47.7, upstream revision `abaf9c523780a608bd46686fd5e53740a07077f8`.
- One Go backend is supplied by the Sesh Music server repository. This repository
  contains the Flutter client and no additional backend.
- API authentication uses existing Subsonic `u/t/s/v/c` parameters. Each request
  gets a fresh cryptographically random salt and the existing Subsonic token scheme.
  Paths supplied by the server are restricted to same-server `/rest/` paths before
  credentials are attached.
- Native passwords use `flutter_secure_storage`; browser passwords live only in
  process memory. Server URL, username, capability snapshot and pending nonsecret
  job metadata use preferences. Android backup is disabled for private credentials.
- Content IDs are opaque. Playlist entry identity is distinct from track identity.
  No title-only deduplication occurs in the client.
- `SeshController` owns playback across view navigation. A custom `AudioHandler`
  routes next/previous actions through preparation-aware playback. Audio preparation
  and acquisition are server operations, not client provider protocol implementations.
- Native downloads stream to partial files, validate resume ranges, verify size and
  SHA-256, atomically publish audio, then atomically publish metadata. Cancellation
  keeps resumable native partials and never publishes incomplete audio.
- Browser storage is a conditional IndexedDB implementation; `dart:io` is excluded
  from web compilation. Browser downloads verify all bytes before committing.
- Concurrency is bounded to two device transfers. Server acquisition jobs are
  independent of client file-transfer progress.
- Retryable creation keys persist across uncertain responses. Offline creation
  intents (tracks plus key) are stored before the POST, replayed after reconnect,
  then replaced by acknowledged job IDs. Pending jobs outside the latest list page
  are fetched explicitly so old offline requests can resume.
- Configured URL base paths are normalised once for API, audio, artwork and download
  paths. Credentials are never attached to other origins.

Validation results are recorded by the final implementation milestone. Native
Android device checks remain distinct from Flutter analysis, unit tests and web
browser checks.
