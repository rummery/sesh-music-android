import 'package:flutter_test/flutter_test.dart';
import 'package:sesh_music/models/content.dart';
import 'package:sesh_music/services/api.dart';

void main() {
  test('album subtitles include available release year and artist', () {
    const album = MusicItem({
      'kind': 'album',
      'title': 'Album',
      'artist': {'name': 'Asura'},
      'year': 2009,
    });
    expect(album.subtitle, 'Asura · 2009');
    expect(
      const MusicItem({
        'kind': 'album',
        'artist': {'name': 'Asura'},
      }).subtitle,
      'Asura',
    );
    expect(
      SeshEnvironment.url('development'),
      'https://vmi3662398.contaboserver.net',
    );
  });

  test('opaque identities and millisecond durations are preserved', () {
    const item = MusicItem({
      'id': 'item:opaque',
      'kind': 'track',
      'source': 'upstream',
      'title': 'Track',
      'artist': {'id': 'artist:opaque', 'name': 'Artist'},
      'durationMs': 262000,
    });
    expect(item.id, 'item:opaque');
    expect(item.artistName, 'Artist');
    expect(durationLabel(item.durationMs), '4:22');
    expect(item.source, 'upstream');
  });
  test('playlist entries preserve separate occurrence identity', () {
    final first = PlaylistEntry.fromJson({
      'entryId': 'first',
      'track': {'id': 'same'},
    });
    final second = PlaylistEntry.fromJson({
      'entryId': 'second',
      'track': {'id': 'same'},
    });
    expect(first.track.id, second.track.id);
    expect(first.id, isNot(second.id));
  });
}
