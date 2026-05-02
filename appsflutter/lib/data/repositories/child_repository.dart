import 'package:classify_flutter/core/network/api_client.dart';
import 'package:classify_flutter/core/network/api_response.dart';
import 'package:classify_flutter/data/models/child.dart';
import 'package:classify_flutter/data/models/task.dart';
import 'package:classify_flutter/data/models/game.dart';
import 'package:classify_flutter/data/models/gift.dart';
import 'package:classify_flutter/data/models/growth_tree.dart';
import 'package:classify_flutter/data/models/notification_model.dart';

/// Repository for child-related API calls
/// Maps to server/routes/child.ts endpoints
class ChildRepository {
  final ApiClient _api;

  ChildRepository({required ApiClient api}) : _api = api;

  // --- Profile ---

  /// GET /api/child/profile
  Future<ApiResponse<Child>> getProfile() async {
    return _api.get<Child>(
      '/child/profile',
      fromJson: (json) => Child.fromJson(json as Map<String, dynamic>),
    );
  }

  /// PUT /api/child/profile
  Future<ApiResponse<void>> updateProfile(Map<String, dynamic> data) async {
    return _api.put('/child/profile', data: data);
  }

  // --- Games ---

  /// GET /api/child/games
  Future<ApiResponse<List<Game>>> getGames() async {
    return _api.get<List<Game>>(
      '/child/games',
      fromJson: (json) =>
          (json as List).map((e) => Game.fromJson(e)).toList(),
    );
  }

  /// POST /api/child/complete-game
  Future<ApiResponse<Map<String, dynamic>>> completeGame({
    required String gameId,
    int? score,
  }) async {
    return _api.post<Map<String, dynamic>>(
      '/child/complete-game',
      data: {
        'gameId': gameId,
        'score': ?score,
      },
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  // --- Tasks ---

  /// GET /api/child/tasks
  Future<ApiResponse<List<Task>>> getTasks({String? status}) async {
    return _api.get<List<Task>>(
      '/child/tasks',
      queryParameters: {
        'status': ?status,
      },
      fromJson: (json) =>
          (json as List).map((e) => Task.fromJson(e)).toList(),
    );
  }

  /// POST /api/child/tasks/:id/answer
  Future<ApiResponse<Map<String, dynamic>>> submitAnswer({
    required String taskId,
    required String answer,
  }) async {
    return _api.post<Map<String, dynamic>>(
      '/child/tasks/$taskId/answer',
      data: {'answer': answer},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  // --- Points ---

  /// GET /api/child/points
  Future<ApiResponse<Map<String, dynamic>>> getPoints() async {
    return _api.get<Map<String, dynamic>>(
      '/child/points',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  // --- Gifts ---

  /// GET /api/child/gifts
  Future<ApiResponse<List<Gift>>> getGifts() async {
    return _api.get<List<Gift>>(
      '/child/gifts',
      fromJson: (json) =>
          (json as List).map((e) => Gift.fromJson(e)).toList(),
    );
  }

  // --- Notifications ---

  /// GET /api/child/notifications
  Future<ApiResponse<List<NotificationModel>>> getNotifications() async {
    return _api.get<List<NotificationModel>>(
      '/child/notifications',
      fromJson: (json) => (json as List)
          .map((e) => NotificationModel.fromJson(e))
          .toList(),
    );
  }

  /// PUT /api/child/notifications/:id/read
  Future<ApiResponse<void>> markNotificationRead(String id) async {
    return _api.put('/child/notifications/$id/read');
  }

  // --- Growth Tree ---

  /// GET /api/child/growth-tree
  Future<ApiResponse<GrowthTree>> getGrowthTree() async {
    return _api.get<GrowthTree>(
      '/child/growth-tree',
      fromJson: (json) => GrowthTree.fromJson(json as Map<String, dynamic>),
    );
  }

  /// POST /api/child/growth-tree/water
  Future<ApiResponse<GrowthTree>> waterTree() async {
    return _api.post<GrowthTree>(
      '/child/growth-tree/water',
      fromJson: (json) => GrowthTree.fromJson(json as Map<String, dynamic>),
    );
  }

  // --- Store ---

  /// GET /api/child/store
  Future<ApiResponse<List<Map<String, dynamic>>>> getStore() async {
    return _api.get<List<Map<String, dynamic>>>(
      '/child/store',
      fromJson: (json) =>
          (json as List).map((e) => e as Map<String, dynamic>).toList(),
    );
  }

  /// POST /api/child/store/purchase
  Future<ApiResponse<void>> purchaseProduct(String productId) async {
    return _api.post('/child/store/purchase', data: {'productId': productId});
  }

  // --- Rewards ---

  /// GET /api/child/rewards
  Future<ApiResponse<Map<String, dynamic>>> getRewards() async {
    return _api.get<Map<String, dynamic>>(
      '/child/rewards',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  // --- Discover (social) ---

  /// GET /api/child/discover
  Future<ApiResponse<List<Map<String, dynamic>>>> discover() async {
    return _api.get<List<Map<String, dynamic>>>(
      '/child/discover',
      fromJson: (json) =>
          (json as List).map((e) => e as Map<String, dynamic>).toList(),
    );
  }
}
