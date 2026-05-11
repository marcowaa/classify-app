// Smoke test for the Flutter app.
//
// Note: The real SplashScreen triggers async auth checks that depend on secure
// storage/plugins. In widget tests we override authStateProvider with a fake
// notifier to avoid platform/plugin calls.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:classify_flutter/app.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

class FakeAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthState(isAuthenticated: false);

  @override
  Future<void> checkAuthStatus() async {
    // Never touch secure storage in widget tests.
    state = const AuthState(isAuthenticated: false);
  }
}

void main() {
  testWidgets('Smoke test app builds', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith(() => FakeAuthNotifier()),
        ],
        child: const ClassifyApp(),
      ),
    );

    // SplashScreen waits 2s before calling checkAuthStatus().
    await tester.pump(const Duration(seconds: 3));

    // Verify a root widget exists (MaterialApp.router).
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
