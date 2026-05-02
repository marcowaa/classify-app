import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/child_provider.dart';

class ChildProgressScreen extends ConsumerWidget {
  const ChildProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final treeAsync = ref.watch(childGrowthTreeProvider);
    final pointsAsync = ref.watch(childPointsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(childGrowthTreeProvider);
            ref.invalidate(childPointsProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              AppColors.childProgress,
                              Color(0xFF34D399)
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.trending_up_rounded,
                            color: Colors.white, size: 28),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        l10n.progress,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Points card
                  pointsAsync.when(
                    data: (points) => Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
                        ),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.star_rounded,
                              size: 48, color: Colors.white),
                          const SizedBox(height: 8),
                          Text(
                            l10n.yourPoints,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$points',
                            style: const TextStyle(
                              fontSize: 48,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    loading: () => const SizedBox(
                      height: 150,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (_, _) => const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 24),

                  // Growth tree
                  treeAsync.when(
                    data: (tree) {
                      return Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Text(
                              l10n.growthTree,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 20),

                            // Tree visualization
                            SizedBox(
                              height: 200,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  // Background circle
                                  Container(
                                    width: 180,
                                    height: 180,
                                    decoration: BoxDecoration(
                                      color: AppColors.childProgress
                                          .withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  // Tree icon
                                  Icon(
                                    Icons.park_rounded,
                                    size: 100,
                                    color: AppColors.childProgress
                                        .withValues(alpha: 0.7 + (tree.progressPercentage / 100.0 * 0.3)),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Stage name
                            Text(
                              tree.stageName,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppColors.childProgress,
                              ),
                            ),
                            const SizedBox(height: 8),

                            // Level
                            Text(
                              '${l10n.treeLevel} ${tree.currentStage}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Progress bar
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: LinearProgressIndicator(
                                value: tree.progressPercentage / 100.0,
                                minHeight: 12,
                                backgroundColor: Colors.grey.shade200,
                                valueColor:
                                    const AlwaysStoppedAnimation<Color>(
                                  AppColors.childProgress,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${tree.progressPercentage.toStringAsFixed(0)}%',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Water button
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton.icon(
                                onPressed: () {
                                  // TODO: Water tree
                                },
                                icon: const Icon(Icons.water_drop_rounded),
                                label: Text(l10n.waterTree),
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.childProgress,
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 14),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    loading: () => const SizedBox(
                      height: 200,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (e, _) => Container(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          Icon(Icons.error_outline,
                              size: 48, color: Colors.red.shade300),
                          const SizedBox(height: 8),
                          Text(l10n.somethingWentWrong),
                          TextButton(
                            onPressed: () =>
                                ref.invalidate(childGrowthTreeProvider),
                            child: Text(l10n.tryAgain),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
