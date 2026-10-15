# Sesh Music — Flutter client

Flutter Android application and responsive browser preview for the Sesh Music server.
The original React/TypeScript export is preserved in `web-reference/`, and its original
Git history remains on this branch. It is a visual reference, not a runtime dependency.

The client uses one server connection and the authenticated `/rest/sesh/v1` API.
The matching backend implementation is `edda8e32`. The approved API contract is
included at [docs/api/mobile-api-v1.openapi.yaml](docs/api/mobile-api-v1.openapi.yaml);
the server repository's corresponding file is its source of truth.
No upstream account credentials are held by the app. Provider implementation names
are absent from the client API, baked-in labels, routes and identifiers; original
catalogue descriptions and credits are displayed as supplied.

## Try the browser preview

The native Sesh server serves the Flutter release at:

**https://vmi3662398.contaboserver.net/mobile/**

Connect using your normal Sesh username and password. Select **development** for this VPS, or **live** for the production server.
The connection form shows environment names rather than hostnames. Passwords are kept in browser memory only, so refresh requires
reconnecting. The original server frontend remains at `/`.

For local development through VS Code port forwarding, forward server port 4533 and
open **http://127.0.0.1:4533/mobile/**. It uses the same backend and database.

## Build and checks

Use the pinned Flutter stable SDK recorded in `docs/IMPLEMENTATION.md` and the committed
`pubspec.lock`. Standard Flutter tooling is sufficient on another machine:

```sh
flutter pub get
flutter analyze
flutter test
flutter build web --release --base-href /mobile/ --no-web-resources-cdn
```

The VPS toolchain lives outside Git. Its invocation is:

```sh
export PATH=/home/aria/projects/toolchains/flutter-prereqs/usr/bin:/home/aria/projects/toolchains/flutter/bin:$PATH
export PUB_CACHE=/home/aria/projects/toolchains/pub-cache
export XDG_CONFIG_HOME=/home/aria/projects/toolchains/flutter-config
flutter pub get
flutter analyze
flutter test
flutter build web --release --base-href /mobile/ --no-web-resources-cdn
```

The native server's `Sesh.MobileWebFolder` setting points at this checkout's
`build/web`. Rebuild the Flutter web files and refresh the page; Docker rebuilds
are not needed. See the server's Sesh setup documentation for enabling this mount.
Build output, runtime credentials, offline audio, SDKs and signing keys are ignored
by Git.

The connection selector maps **live** to `https://sesh.b33r.us` and
**development** to `https://vmi3662398.contaboserver.net`. Android defaults to live;
the preview on the development host selects development. Saved connections retain
their environment selection. There is no editable hostname field.

Cross-origin browser previews require explicit server CORS support. The installed
same-origin `/mobile/` preview avoids this requirement. A standalone development
web server can be started with `flutter run -d web-server --web-hostname=127.0.0.1
--web-port=4540`, but still needs an appropriate API connection/CORS arrangement.

## Android development

Install a supported Android SDK and Java toolchain, then run:

```sh
flutter doctor -v
flutter devices
flutter run -d <android-device-id>
flutter build apk --debug
```

Debug APKs are for development. Release signing and store publication require your
own signing configuration and are not performed by this project.

The Android minimum SDK is 24 for the pinned Flutter toolchain. Network access, wake lock and media-playback service
permissions are declared. Audio uses `just_audio`, `audio_service` and `audio_session`
for persistent playback, notifications, headset/lock-screen controls and audio focus.
Screen-off playback, phone-call interruptions and vendor battery restrictions must
be verified on a real device; browser tests do not prove Android behavior.

## Implemented flow

- Search tracks, artists, albums and playlists across Library / Upstream / All,
  with independent result pagination, artwork and source labels.
- Browse artist albums and ordered album/playlist tracks. Playback preparation
  polls the server and renews temporary-cache leases; playback survives navigation.
- Create, rename, change visibility, add entries, reorder, remove and delete server
  playlists. Unsaved upstream references persist server-side and repeated tracks
  retain separate entry identities. Revision conflicts are reported instead of
  overwriting another device's edits.
- Save Entire Playlist creates a private server playlist after acquisition/indexing.
  Server activity shows progress, errors, cancellation and retry.
- Album Download for Offline creates/reuses a private playlist named after the
  album, containing permanent library tracks in album order.
- Artist pages show plain-text biographies where metadata is available; album
  cards include release years where known. Playlist removal lives in Track actions.
- Download for Offline first creates/reuses permanent server-library audio. Only
  after that succeeds does the client fetch and SHA-256 verify its device copy.
  Server copies survive device-transfer failures and cancellation.
- Android offline files are private to the app and scoped by server/account.
  Interrupted `.part` files resume with HTTP Range. Pending acquisitions survive
  application restart; completed files appear only after checksum verification.
- Browser offline audio uses IndexedDB with checksum verification. It is real audio,
  with no synthetic or sample-track substitution on errors. Browser transfers must
  restart if the page is closed mid-transfer, and browser storage may be evicted.

## Current boundaries

- Device transfers run while the application process is alive; Android OS-scheduled
  background downloading after process termination is not implemented. Reopening
  resumes pending transfers from retained native partial files.
- The browser preview cannot validate Android media notifications or background
  execution. Native playback behavior still needs physical-device testing.
- Flutter web playback depends on browser codec support and autoplay policy. If
  playback is blocked after preparation, press Play again.
- Favourites are supported for permanent library tracks. Upstream favourites are
  not fabricated as local-library favourites.
- Previous demo-only smart-playlist, procedural-audio, lyrics and equalizer widgets
  are retained in the React reference rather than presented as working integrations.

Dependency licence texts and versions are recorded in `docs/dependencies/`.
