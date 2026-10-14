import 'package:audio_service/audio_service.dart';
import 'package:audio_session/audio_session.dart';
import 'package:flutter/material.dart';

import 'services/api.dart';
import 'services/controller.dart';
import 'services/player.dart';
import 'ui/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Keep browser accessibility nodes available for keyboard users and preview automation.
  WidgetsBinding.instance.ensureSemantics();
  final handler = await AudioService.init<SeshAudioHandler>(
    builder: SeshAudioHandler.new,
    config: const AudioServiceConfig(
      androidNotificationChannelId: 'music.sesh.playback',
      androidNotificationChannelName: 'Sesh Music playback',
      androidNotificationOngoing: true,
      androidStopForegroundOnPause: true,
    ),
  );
  final session = await AudioSession.instance;
  await session.configure(const AudioSessionConfiguration.music());
  final controller = SeshController(SeshApi(), handler);
  runApp(SeshApp(controller: controller));
  await controller.initialize();
}
