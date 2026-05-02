import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/parent_provider.dart';

class ParentNotificationsScreen extends ConsumerWidget {
  const ParentNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final notificationsAsync = ref.watch(parentNotificationsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5FF),
      appBar: AppBar(
        title: Text(l10n.notifications),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () {
              // TODO: Mark all read
            },
            child: Text(l10n.markAllRead),
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (notifications) {
          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined,
                      size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text(
                    l10n.noNotifications,
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
              ref.invalidate(parentNotificationsProvider);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: notifications.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final notif = notifications[index];
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: notif.read == true
                        ? Colors.white
                        : AppColors.primary.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: notif.read != true
                        ? Border.all(
                            color: AppColors.primary.withValues(alpha: 0.2),
                          )
                        : null,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: _getNotifColor(notif.type)
                              .withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _getNotifIcon(notif.type),
                          size: 20,
                          color: _getNotifColor(notif.type),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              notif.title,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: notif.read
                                    ? FontWeight.w500
                                    : FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            ...[
                              const SizedBox(height: 4),
                              Text(
                                notif.message,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (!notif.read)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
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
                    ref.invalidate(parentNotificationsProvider),
                child: Text(l10n.tryAgain),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getNotifColor(String? type) {
    return switch (type) {
      'gift' => const Color(0xFFF59E0B),
      'task' || 'task_completed' => const Color(0xFF10B981),
      'link' || 'link_request' => AppColors.primary,
      _ => Colors.blue,
    };
  }

  IconData _getNotifIcon(String? type) {
    return switch (type) {
      'gift' => Icons.card_giftcard_rounded,
      'task' || 'task_completed' => Icons.assignment_turned_in_rounded,
      'link' || 'link_request' => Icons.link_rounded,
      _ => Icons.notifications_rounded,
    };
  }
}
