import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/data/models/child.dart';
import 'package:classify_flutter/data/models/task.dart';
import 'package:classify_flutter/data/models/game.dart';
import 'package:classify_flutter/data/models/gift.dart';
import 'package:classify_flutter/data/models/growth_tree.dart';
import 'package:classify_flutter/data/models/notification_model.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

// --- Child Data Providers ---

/// Child profile
final childProfileProvider = FutureProvider.autoDispose<Child>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getProfile();
  return response.dataOrThrow;
});

/// Child games
final childGamesProvider =
    FutureProvider.autoDispose<List<Game>>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getGames();
  return response.dataOrThrow;
});

/// Child tasks
final childTasksProvider =
    FutureProvider.autoDispose<List<Task>>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getTasks();
  return response.dataOrThrow;
});

/// Child pending tasks count
final childPendingTasksCountProvider =
    FutureProvider.autoDispose<int>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getTasks(status: 'pending');
  if (response.success && response.data != null) {
    return response.data!.length;
  }
  return 0;
});

/// Child gifts
final childGiftsProvider =
    FutureProvider.autoDispose<List<Gift>>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getGifts();
  return response.dataOrThrow;
});

/// Child notifications
final childNotificationsProvider =
    FutureProvider.autoDispose<List<NotificationModel>>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getNotifications();
  return response.dataOrThrow;
});

/// Child growth tree
final childGrowthTreeProvider =
    FutureProvider.autoDispose<GrowthTree>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getGrowthTree();
  return response.dataOrThrow;
});

/// Child points
final childPointsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getPoints();
  return response.dataOrThrow;
});

/// Child rewards
final childRewardsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(childRepositoryProvider);
  final response = await repo.getRewards();
  return response.dataOrThrow;
});
