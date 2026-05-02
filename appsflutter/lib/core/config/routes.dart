import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';
import 'package:classify_flutter/presentation/screens/splash_screen.dart';
import 'package:classify_flutter/presentation/screens/auth/parent_auth_screen.dart';
import 'package:classify_flutter/presentation/screens/auth/otp_screen.dart';
import 'package:classify_flutter/presentation/screens/auth/forgot_password_screen.dart';
import 'package:classify_flutter/presentation/screens/auth/child_link_screen.dart';
import 'package:classify_flutter/presentation/screens/auth/child_pin_login_screen.dart';
import 'package:classify_flutter/presentation/screens/auth/account_type_screen.dart';
import 'package:classify_flutter/presentation/screens/parent/parent_shell.dart';
import 'package:classify_flutter/presentation/screens/parent/dashboard_screen.dart';
import 'package:classify_flutter/presentation/screens/parent/tasks_screen.dart';
import 'package:classify_flutter/presentation/screens/parent/store_screen.dart';
import 'package:classify_flutter/presentation/screens/parent/notifications_screen.dart';
import 'package:classify_flutter/presentation/screens/parent/profile_screen.dart';
import 'package:classify_flutter/presentation/screens/child/child_shell.dart';
import 'package:classify_flutter/presentation/screens/child/games_screen.dart';
import 'package:classify_flutter/presentation/screens/child/child_tasks_screen.dart';
import 'package:classify_flutter/presentation/screens/child/gifts_screen.dart';
import 'package:classify_flutter/presentation/screens/child/progress_screen.dart';
import 'package:classify_flutter/presentation/screens/child/child_profile_screen.dart';
import 'package:classify_flutter/presentation/screens/child/game_webview_screen.dart';

/// Route path constants
class RoutePaths {
  RoutePaths._();

  static const String splash = '/';
  static const String accountType = '/account-type';

  // Auth - Parent
  static const String parentAuth = '/parent-auth';
  static const String otp = '/otp';
  static const String forgotPassword = '/forgot-password';

  // Auth - Child
  static const String childLink = '/child-link';
  static const String childPinLogin = '/child-pin-login';

  // Parent
  static const String parentDashboard = '/parent/dashboard';
  static const String parentTasks = '/parent/tasks';
  static const String parentStore = '/parent/store';
  static const String parentNotifications = '/parent/notifications';
  static const String parentProfile = '/parent/profile';

  // Child
  static const String childGames = '/child/games';
  static const String childTasks = '/child/tasks';
  static const String childGifts = '/child/gifts';
  static const String childProgress = '/child/progress';
  static const String childProfile = '/child/profile';
  static const String childGamePlay = '/child/game/:gameId';
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: RoutePaths.splash,
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isAuthRoute = state.matchedLocation == RoutePaths.parentAuth ||
          state.matchedLocation == RoutePaths.childLink ||
          state.matchedLocation == RoutePaths.childPinLogin ||
          state.matchedLocation == RoutePaths.accountType ||
          state.matchedLocation == RoutePaths.otp ||
          state.matchedLocation == RoutePaths.forgotPassword;
      final isSplash = state.matchedLocation == RoutePaths.splash;

      // Allow splash screen always
      if (isSplash) return null;

      // If not logged in and not on auth route, redirect to account type
      if (!isLoggedIn && !isAuthRoute) {
        return RoutePaths.accountType;
      }

      // If logged in and on auth route, redirect to appropriate dashboard
      if (isLoggedIn && isAuthRoute) {
        if (authState.userType == UserType.child) {
          return RoutePaths.childGames;
        }
        return RoutePaths.parentDashboard;
      }

      return null;
    },
    routes: [
      // Splash
      GoRoute(
        path: RoutePaths.splash,
        builder: (context, state) => const SplashScreen(),
      ),

      // Account Type Selection
      GoRoute(
        path: RoutePaths.accountType,
        builder: (context, state) => const AccountTypeScreen(),
      ),

      // Auth Routes
      GoRoute(
        path: RoutePaths.parentAuth,
        builder: (context, state) => const ParentAuthScreen(),
      ),
      GoRoute(
        path: RoutePaths.otp,
        builder: (context, state) {
          final extras = state.extra as Map<String, dynamic>?;
          return OtpScreen(
            email: extras?['email'] ?? '',
            parentId: extras?['parentId'] ?? '',
          );
        },
      ),
      GoRoute(
        path: RoutePaths.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: RoutePaths.childLink,
        builder: (context, state) => const ChildLinkScreen(),
      ),
      GoRoute(
        path: RoutePaths.childPinLogin,
        builder: (context, state) {
          final extras = state.extra as Map<String, dynamic>?;
          return ChildPinLoginScreen(
            childId: extras?['childId'] ?? '',
            childName: extras?['childName'] ?? '',
          );
        },
      ),

      // Parent Shell with bottom navigation
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ParentShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.parentDashboard,
                builder: (context, state) => const ParentDashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.parentTasks,
                builder: (context, state) => const ParentTasksScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.parentStore,
                builder: (context, state) => const ParentStoreScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.parentNotifications,
                builder: (context, state) =>
                    const ParentNotificationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.parentProfile,
                builder: (context, state) => const ParentProfileScreen(),
              ),
            ],
          ),
        ],
      ),

      // Child Shell with bottom navigation
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ChildShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.childGames,
                builder: (context, state) => const ChildGamesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.childTasks,
                builder: (context, state) => const ChildTasksScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.childGifts,
                builder: (context, state) => const ChildGiftsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.childProgress,
                builder: (context, state) => const ChildProgressScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.childProfile,
                builder: (context, state) => const ChildProfileScreen(),
              ),
            ],
          ),
        ],
      ),

      // Game WebView (full screen, outside shell)
      GoRoute(
        path: RoutePaths.childGamePlay,
        builder: (context, state) {
          final gameId = state.pathParameters['gameId'] ?? '';
          return GameWebViewScreen(
            gameId: gameId,
          );
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page not found: ${state.matchedLocation}'),
      ),
    ),
  );
});
