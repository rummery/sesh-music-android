import '../models/content.dart';

class TransferCancelled implements Exception {}

class TransferToken {
  bool cancelled = false;
}

String audioExtension(Json result) {
  final format = '${result['format'] ?? ''}'.toLowerCase();
  const formats = {
    'mp3',
    'flac',
    'm4a',
    'aac',
    'ogg',
    'opus',
    'wav',
    'aiff',
    'aif',
    'wma',
    'alac',
    'oga',
  };
  if (!formats.contains(format)) {
    throw const FormatException(
      'This audio file format is not supported for offline storage.',
    );
  }
  return format;
}

String audioMime(String extension) => switch (extension) {
  'flac' => 'audio/flac',
  'm4a' || 'alac' => 'audio/mp4',
  'aac' => 'audio/aac',
  'ogg' || 'oga' || 'opus' => 'audio/ogg',
  'wav' => 'audio/wav',
  'aif' || 'aiff' => 'audio/aiff',
  'wma' => 'audio/x-ms-wma',
  _ => 'audio/mpeg',
};

abstract class OfflineStorage {
  Future<List<Json>> records();
  Future<String?> playbackUri(String trackId);
  Future<void> remove(String trackId);
  Future<void> download({
    required Json result,
    required MusicItem track,
    required Uri Function() url,
    required TransferToken token,
    required void Function(int bytes, int total) progress,
  });
  Future<void> close();
}
