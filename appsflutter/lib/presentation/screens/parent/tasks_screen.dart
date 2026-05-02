import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/parent_provider.dart';

class ParentTasksScreen extends ConsumerStatefulWidget {
  const ParentTasksScreen({super.key});

  @override
  ConsumerState<ParentTasksScreen> createState() => _ParentTasksScreenState();
}

class _ParentTasksScreenState extends ConsumerState<ParentTasksScreen> {
  String? _selectedChildId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final childrenAsync = ref.watch(childrenListProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5FF),
      appBar: AppBar(
        title: Text(l10n.tasks),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateTaskDialog(context, l10n),
        icon: const Icon(Icons.add),
        label: Text(l10n.createNewTask),
      ),
      body: Column(
        children: [
          // Child selector
          childrenAsync.when(
            data: (children) {
              if (children.isEmpty) return const SizedBox.shrink();
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: children.map((child) {
                    final isSelected =
                        _selectedChildId == child.id.toString();
                    return Padding(
                      padding: const EdgeInsetsDirectional.only(end: 8),
                      child: ChoiceChip(
                        label: Text(child.name),
                        selected: isSelected,
                        onSelected: (_) {
                          setState(() {
                            _selectedChildId = child.id.toString();
                          });
                        },
                        selectedColor: AppColors.primary.withValues(alpha: 0.2),
                      ),
                    );
                  }).toList(),
                ),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, _) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 16),

          // Tasks list
          Expanded(
            child: _selectedChildId == null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.assignment_outlined,
                            size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text(
                          l10n.selectChild,
                          style: const TextStyle(
                            fontSize: 16,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  )
                : _buildTasksList(l10n),
          ),
        ],
      ),
    );
  }

  Widget _buildTasksList(AppLocalizations l10n) {
    final tasksAsync =
        ref.watch(parentTasksProvider(_selectedChildId!));

    return tasksAsync.when(
      data: (tasks) {
        if (tasks.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.task_alt_rounded,
                    size: 64, color: Colors.grey.shade300),
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
            ref.invalidate(parentTasksProvider(_selectedChildId!));
          },
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: tasks.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final task = tasks[index];
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _getStatusColor(task.status)
                            .withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        _getStatusIcon(task.status),
                        color: _getStatusColor(task.status),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            task.question,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded,
                                  size: 14,
                                  color: Color(0xFFF59E0B)),
                              const SizedBox(width: 4),
                              Text(
                                '${task.points} ${l10n.pointsEarned}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(task.status)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _getStatusLabel(task.status, l10n),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: _getStatusColor(task.status),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.delete_outline,
                          color: Colors.red.shade300),
                      onPressed: () {
                        // TODO: Delete task
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red.shade300),
            const SizedBox(height: 8),
            Text(l10n.somethingWentWrong),
            TextButton(
              onPressed: () =>
                  ref.invalidate(parentTasksProvider(_selectedChildId!)),
              child: Text(l10n.tryAgain),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String? status) {
    return switch (status) {
      'completed' => const Color(0xFF10B981),
      'failed' => Colors.red.shade400,
      _ => const Color(0xFFF59E0B),
    };
  }

  IconData _getStatusIcon(String? status) {
    return switch (status) {
      'completed' => Icons.check_circle_rounded,
      'failed' => Icons.cancel_rounded,
      _ => Icons.pending_rounded,
    };
  }

  String _getStatusLabel(String? status, AppLocalizations l10n) {
    return switch (status) {
      'completed' => l10n.completed,
      'failed' => l10n.failed,
      _ => l10n.pending,
    };
  }

  void _showCreateTaskDialog(BuildContext context, AppLocalizations l10n) {
    final questionController = TextEditingController();
    final pointsController = TextEditingController(text: '10');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              l10n.createNewTask,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: questionController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: l10n.question,
                hintText: l10n.writeQuestion,
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: pointsController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: l10n.pointsReward,
                prefixIcon: const Icon(Icons.star_outline),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                // TODO: Create task via repo
                Navigator.pop(ctx);
              },
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(l10n.createNewTask),
            ),
          ],
        ),
      ),
    );
  }
}
