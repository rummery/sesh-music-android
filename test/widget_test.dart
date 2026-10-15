import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sesh_music/ui/app.dart';
import 'package:sesh_music/services/api.dart';
import 'package:sesh_music/services/controller.dart';
import 'package:sesh_music/models/content.dart';

class WidgetController extends ChangeNotifier implements SeshController {
  @override
  final SeshApi api = SeshApi(baseUrl: SeshEnvironment.development);
  String? connectedServer;
  @override
  bool get busy => false;
  @override
  bool get offlineMode => false;
  @override
  MusicItem? get current => null;
  @override
  bool isOffline(String id) => false;
  @override
  bool isFavorite(MusicItem item) => false;
  @override
  Future<void> connect(
    String base,
    String user,
    String password,
    bool remember,
  ) async {
    connectedServer = base;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('playlist removal is in the shared menu at phone width', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    bool removed = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TrackRow(
            item: const MusicItem({
              'id': 'entry',
              'title': 'A long playlist track title',
              'artist': {'name': 'An artist'},
            }),
            controller: WidgetController(),
            onPlay: () {},
            onAdd: (_) async {},
            onRemove: () async {
              removed = true;
            },
          ),
        ),
      ),
    );
    expect(find.byIcon(Icons.remove_circle_outline), findsNothing);
    expect(find.text('Remove from playlist'), findsNothing);
    await tester.tap(find.byTooltip('Track actions'));
    await tester.pumpAndSettle();
    expect(find.text('Download for Offline'), findsOneWidget);
    await tester.tap(find.text('Remove from playlist'));
    await tester.pumpAndSettle();
    expect(removed, true);
    expect(tester.takeException(), isNull);
  });
  testWidgets('connection offers environment labels without hostname fields', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final controller = WidgetController();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: ConnectionPanel(controller: controller)),
      ),
    );
    expect(find.byKey(const Key('server-url')), findsNothing);
    expect(find.textContaining('vmi3662398'), findsNothing);
    expect(find.textContaining('sesh.b33r.us'), findsNothing);
    await tester.tap(find.byKey(const Key('server-environment')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('live').last);
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Connect'));
    await tester.tap(find.text('Connect'));
    await tester.pumpAndSettle();
    expect(controller.connectedServer, 'https://sesh.b33r.us');
    expect(tester.takeException(), isNull);
  });

  testWidgets('offline empty state explains permanent server acquisition', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: EmptyState(
            icon: Icons.download,
            title: 'Take your music with you',
            message:
                'Download for Offline saves a permanent server copy first.',
          ),
        ),
      ),
    );
    expect(find.text('Take your music with you'), findsOneWidget);
    expect(find.textContaining('permanent server copy'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
