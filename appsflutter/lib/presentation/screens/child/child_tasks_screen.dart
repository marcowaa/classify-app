import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/child_provider.dart';

class ChildTasksScreen extends ConsumerWidget {
  const ChildTasksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final tasksAsync = ref.watch(childTasksProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFFF7ED),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.childTasks, Color(0xFFFBBF24)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.assignment_rounded,
                        color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    l10n.tasks,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  // Pending count badge
                  Consumer(
                    builder: (context, ref, _) {
                      final countAsync =
                          ref.watch(childPendingTasksCountProvider);
                      return countAsync.when(
                        data: (count) => count > 0
                            ? Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppColors.childTasks
                                      .withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '$count ${l10n.mustCompleteTasks}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.childTasks,
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(),
                        loading: () => const SizedBox.shrink(),
                        error: (_, _) => const SizedBox.shrink(),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Tasks list
            Expanded(
              child: tasksAsync.when(
                data: (tasks) {
                  if (tasks.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.task_alt_rounded,
                              size: 72, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text(
                            l10n.noTasks,
                            style: const TextStyle(
                              fontSize: 16,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(childTasksProvider);
                    },
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: tasks.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final task = tasks[index];
                        return _TaskCard(task: task, l10n: l10n);
                      },
                    ),
                  );
                },
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline,
                          size: 48, color: Colors.red.shade300),
                      const SizedBox(height: 8),
                      Text(l10n.somethingWentWrong),
                      TextButton(
                        onPressed: () => ref.invalidate(childTasksProvider),
                        child: Text(l10n.tryAgain),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final dynamic task;
  final AppLocalizations l10n;

  const _TaskCard({required this.task, required this.l10n});

  @override
  Widget build(BuildContext context) {
    final isPending = task.isPending;
    final isCompleted = task.isCompleted;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: isPending
            ? Border.all(
                color: AppColors.childTasks.withValues(alpha: 0.3), width: 2)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status badge + points
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_statusIcon, size: 14, color: _statusColor),
                    const SizedBox(width: 4),
                    Text(
                      _statusLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _statusColor,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  const Icon(Icons.star_rounded,
                      size: 16, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 4),
                  Text(
                    '+${task.points}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFF59E0B),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Question
          Text(
            task.question,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isCompleted
                  ? AppColors.textSecondary
                  : AppColors.textPrimary,
              decoration: isCompleted ? TextDecoration.lineThrough : null,
            ),
          ),

          // Answer options for pending tasks
          if (isPending && task.answers != null && task.answers!.isNotEmpty) ...[
            const SizedBox(height: 16),
            ...task.answers!.map<Widget>((answer) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: OutlinedButton(
                  onPressed: () {
                    // TODO: Submit answer
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    side: BorderSide(
                      color: AppColors.childTasks.withValues(alpha: 0.3),
                    ),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: Text(
                      answer.text,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Color get _statusColor {
    if (task.isCompleted) return const Color(0xFF10B981);
    if (task.isFailed) return Colors.red.shade400;
    return AppColors.childTasks;
  }

  IconData get _statusIcon {
    if (task.isCompleted) return Icons.check_circle_rounded;
    if (task.isFailed) return Icons.cancel_rounded;
    return Icons.pending_rounded;
  }

  String get _statusLabel {
    if (task.isCompleted) return l10n.completed;
    if (task.isFailed) return l10n.failed;
    return l10n.pending;
  }
}
