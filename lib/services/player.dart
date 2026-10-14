import 'dart:async';

import 'package:audio_service/audio_service.dart';
import 'package:just_audio/just_audio.dart';

class SeshAudioHandler extends BaseAudioHandler with SeekHandler {
  final AudioPlayer player = AudioPlayer(useProxyForRequestHeaders: false);
  Future<void> Function()? onNext;
  Future<void> Function()? onPrevious;
  void Function(String)? onError;
  SeshAudioHandler() {
    player.playbackEventStream.listen(
      (event) {
        playbackState.add(
          PlaybackState(
            controls: [
              MediaControl.skipToPrevious,
              player.playing ? MediaControl.pause : MediaControl.play,
              MediaControl.skipToNext,
              MediaControl.stop,
            ],
            systemActions: const {
              MediaAction.seek,
              MediaAction.seekForward,
              MediaAction.seekBackward,
            },
            androidCompactActionIndices: const [0, 1, 2],
            processingState: switch (player.processingState) {
              ProcessingState.idle => AudioProcessingState.idle,
              ProcessingState.loading => AudioProcessingState.loading,
              ProcessingState.buffering => AudioProcessingState.buffering,
              ProcessingState.ready => AudioProcessingState.ready,
              ProcessingState.completed => AudioProcessingState.completed,
            },
            playing: player.playing,
            updatePosition: player.position,
            bufferedPosition: player.bufferedPosition,
            speed: player.speed,
          ),
        );
      },
      onError: (Object _) =>
          onError?.call('Audio playback failed. Please retry.'),
    );
  }
  @override
  Future<void> play() => player.play();
  @override
  Future<void> pause() => player.pause();
  @override
  Future<void> seek(Duration position) => player.seek(position);
  @override
  Future<void> skipToNext() async => onNext?.call();
  @override
  Future<void> skipToPrevious() async => onPrevious?.call();
  @override
  Future<void> stop() async {
    await player.stop();
    await super.stop();
  }

  Future<void> dispose() => player.dispose();
}
