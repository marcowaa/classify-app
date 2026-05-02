import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/data/models/child.dart';
import 'package:classify_flutter/data/models/task.dart';
import 'package:classify_flutter/data/models/notification_model.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

// --- Parent Data Providers ---

/// Children list
final childrenListProvider =
    FutureProvider.autoDispose<List<Child>>((ref) async {
  final repo = ref.watch(parentRepositoryProvider);
  final response = await repo.getChildren();
  return response.dataOrThrow;
});

/// Parent tasks
final parentTasksProvider =
    FutureProvider.autoDispose.family<List<Task>, String?>((ref, childId) async {
  final repo = ref.watch(parentRepositoryProvider);
  final response = await repo.getTasks(childId: childId);
  return response.dataOrThrow;
});

/// Parent notifications
final parentNotificationsProvider =
    FutureProvider.autoDispose<List<NotificationModel>>((ref) async {
  final repo = ref.watch(parentRepositoryProvider);
  final response = await repo.getNotifications();
  return response.dataOrThrow;
});

/// Parent dashboard stats
final parentDashboardStatsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(parentRepositoryProvider);
  final response = await repo.getDashboardStats();
  return response.dataOrThrow;
});

/// Parent wallet
final parentWalletProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(parentRepositoryProvider);
  final response = await repo.getWallet();
  return response.dataOrThrow;
});
