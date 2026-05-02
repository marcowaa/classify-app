import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/config/routes.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';
import 'package:classify_flutter/domain/providers/parent_provider.dart';

class ParentDashboardScreen extends ConsumerWidget {
  const ParentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final childrenAsync = ref.watch(childrenListProvider);
    final authState = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5FF),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(childrenListProvider);
            ref.invalidate(parentDashboardStatsProvider);
          },
          child: CustomScrollView(
            slivers: [
              // App bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Center(
                          child: Text(
                            'C',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.welcome,
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            Text(
                              l10n.dashboard,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () =>
                            context.go(RoutePaths.parentNotifications),
                        icon: const Badge(
                          smallSize: 8,
                          child: Icon(Icons.notifications_outlined),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Stats cards
              SliverToBoxAdapter(
                child: _buildStatsSection(context, ref, l10n),
              ),

              // Unique code card
              SliverToBoxAdapter(
                child: _buildUniqueCodeCard(context, l10n, authState),
              ),

              // Children section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                  child: Row(
                    children: [
                      Text(
                        l10n.linkedChildren,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const Spacer(),
                      FilledButton.icon(
                        onPressed: () {
                          // TODO: Add child dialog
                        },
                        icon: const Icon(Icons.add, size: 18),
                        label: Text(l10n.linkChild),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          textStyle: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Children list
              childrenAsync.when(
                data: (children) {
                  if (children.isEmpty) {
                    return SliverToBoxAdapter(
                      child: _buildEmptyChildren(l10n),
                    );
                  }
                  return SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    sliver: SliverList.separated(
                      itemCount: children.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final child = children[index];
                        return _ChildCard(child: child, l10n: l10n);
                      },
                    ),
                  );
                },
                loading: () => const SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: CircularProgressIndicator(),
                    ),
                  ),
                ),
                error: (e, _) => SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        children: [
                          Icon(Icons.error_outline,
                              size: 48, color: Colors.red.shade300),
                          const SizedBox(height: 8),
                          Text(l10n.somethingWentWrong),
                          TextButton(
                            onPressed: () =>
                                ref.invalidate(childrenListProvider),
                            child: Text(l10n.tryAgain),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsSection(
      BuildContext context, WidgetRef ref, AppLocalizations l10n) {
    final statsAsync = ref.watch(parentDashboardStatsProvider);

    return statsAsync.when(
      data: (stats) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          child: Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.people_rounded,
                  label: l10n.linkedChildren,
                  value: '${stats['childrenCount'] ?? 0}',
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.assignment_turned_in_rounded,
                  label: l10n.tasks,
                  value: '${stats['completedTasks'] ?? 0}',
                  color: const Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.star_rounded,
                  label: l10n.points,
                  value: '${stats['totalPoints'] ?? 0}',
                  color: const Color(0xFFF59E0B),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const Padding(
        padding: EdgeInsets.all(20),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, _) => const SizedBox.shrink(),
    );
  }

  Widget _buildUniqueCodeCard(
      BuildContext context, AppLocalizations l10n, AuthState authState) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.qr_code_rounded, color: Colors.white, size: 24),
              const SizedBox(width: 8),
              Text(
                l10n.shareThisCode,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withValues(alpha: 0.9),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                authState.userId ?? '---',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: 4,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyChildren(AppLocalizations l10n) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(Icons.child_care_rounded, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            l10n.noLinkedChildren,
            style: const TextStyle(
              fontSize: 16,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  final dynamic child;
  final AppLocalizations l10n;

  const _ChildCard({required this.child, required this.l10n});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
            backgroundImage: child.avatarUrl != null
                ? NetworkImage(child.avatarUrl!)
                : null,
            child: child.avatarUrl == null
                ? Text(
                    child.name.isNotEmpty ? child.name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  child.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        size: 16, color: Color(0xFFF59E0B)),
                    const SizedBox(width: 4),
                    Text(
                      '${child.totalPoints} ${l10n.points}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          FilledButton.tonal(
            onPressed: () {
              // TODO: Navigate to child management
            },
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            child: Text(
              l10n.manageTasksBtn,
              style: const TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
