import 'package:flutter_test/flutter_test.dart';
import 'package:sesh_music/models/content.dart';

void main() {
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
