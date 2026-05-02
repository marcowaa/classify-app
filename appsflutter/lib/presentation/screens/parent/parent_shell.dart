import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';

/// Parent bottom navigation shell wrapping all parent tabs
class ParentShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ParentShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (index) {
            navigationShell.goBranch(
              index,
              initialLocation: index == navigationShell.currentIndex,
            );
          },
          backgroundColor: Colors.white,
          indicatorColor: AppColors.primary.withValues(alpha: 0.1),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          height: 65,
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.dashboard_outlined),
              selectedIcon:
                  const Icon(Icons.dashboard_rounded, color: AppColors.primary),
              label: l10n.parentNavDashboard,
            ),
            NavigationDestination(
              icon: const Icon(Icons.assignment_outlined),
              selectedIcon: const Icon(Icons.assignment_rounded,
                  color: AppColors.primary),
              label: l10n.parentNavTasks,
            ),
            NavigationDestination(
              icon: const Icon(Icons.store_outlined),
              selectedIcon:
                  const Icon(Icons.store_rounded, color: AppColors.primary),
              label: l10n.parentNavStore,
            ),
            NavigationDestination(
              icon: const Icon(Icons.notifications_outlined),
              selectedIcon: const Icon(Icons.notifications_rounded,
                  color: AppColors.primary),
              label: l10n.parentNavNotifications,
            ),
            NavigationDestination(
              icon: const Icon(Icons.person_outline),
              selectedIcon:
                  const Icon(Icons.person_rounded, color: AppColors.primary),
              label: l10n.parentNavProfile,
            ),
          ],
        ),
      ),
    );
  }
}
