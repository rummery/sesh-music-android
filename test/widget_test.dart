import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sesh_music/ui/app.dart';

void main() {
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
