typedef Json = Map<String, dynamic>;

int intValue(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;

class MusicItem {
  final Json json;
  const MusicItem(this.json);
  String get id => '${json['id'] ?? ''}';
  String get kind => '${json['kind'] ?? 'track'}';
  String get source => '${json['source'] ?? 'library'}';
  String get title => '${json['title'] ?? json['name'] ?? 'Untitled'}';
  Json get artist =>
      json['artist'] is Map ? Map<String, dynamic>.from(json['artist']) : {};
  Json get album =>
      json['album'] is Map ? Map<String, dynamic>.from(json['album']) : {};
  String get artistName =>
      '${artist['name'] ?? json['artistName'] ?? json['creator'] ?? ''}';
  String get artworkPath => '${json['artworkPath'] ?? ''}';
  int get durationMs => intValue(json['durationMs']);
  int get trackCount => intValue(json['trackCount'] ?? json['songCount']);
  bool get isTrack => kind == 'track';
  String get subtitle => isTrack || kind == 'album'
      ? artistName
      : kind == 'playlist'
      ? '${trackCount > 0 ? '$trackCount tracks · ' : ''}${json['owner'] ?? source}'
      : source;
}

class PlaylistEntry {
  final String id;
  final MusicItem track;
  const PlaylistEntry(this.id, this.track);
  factory PlaylistEntry.fromJson(Json json) => PlaylistEntry(
    '${json['entryId'] ?? json['id'] ?? ''}',
    MusicItem(Map<String, dynamic>.from(json['track'] ?? json)),
  );
}

String durationLabel(int milliseconds) {
  final seconds = milliseconds ~/ 1000;
  return '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';
}

List<Json> jsonList(dynamic value) => value is List
    ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
    : [];
