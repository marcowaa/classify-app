import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';

/// Child bottom navigation shell with colorful tabs
class ChildShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ChildShell({super.key, required this.navigationShell});

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
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, -4),
            ),
          ],
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: NavigationBar(
            selectedIndex: navigationShell.currentIndex,
            onDestinationSelected: (index) {
              navigationShell.goBranch(
                index,
                initialLocation: index == navigationShell.currentIndex,
              );
            },
            backgroundColor: Colors.white,
            indicatorColor: Colors.transparent,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            height: 70,
            destinations: [
              NavigationDestination(
                icon: Icon(Icons.sports_esports_outlined,
                    color: Colors.grey.shade400),
                selectedIcon: const Icon(Icons.sports_esports_rounded,
                    color: AppColors.childGames),
                label: l10n.childNavGames,
              ),
              NavigationDestination(
                icon: Icon(Icons.assignment_outlined,
                    color: Colors.grey.shade400),
                selectedIcon: const Icon(Icons.assignment_rounded,
                    color: AppColors.childTasks),
                label: l10n.childNavTasks,
              ),
              NavigationDestination(
                icon: Icon(Icons.card_giftcard_outlined,
                    color: Colors.grey.shade400),
                selectedIcon: const Icon(Icons.card_giftcard_rounded,
                    color: AppColors.childGifts),
                label: l10n.childNavGifts,
              ),
              NavigationDestination(
                icon: Icon(Icons.trending_up_outlined,
                    color: Colors.grey.shade400),
                selectedIcon: const Icon(Icons.trending_up_rounded,
                    color: AppColors.childProgress),
                label: l10n.childNavProgress,
              ),
              NavigationDestination(
                icon:
                    Icon(Icons.face_rounded, color: Colors.grey.shade400),
                selectedIcon: const Icon(Icons.face_rounded,
                    color: AppColors.childProfile),
                label: l10n.childNavProfile,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
