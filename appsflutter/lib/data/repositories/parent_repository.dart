import 'package:classify_flutter/core/network/api_client.dart';
import 'package:classify_flutter/core/network/api_response.dart';
import 'package:classify_flutter/data/models/child.dart';
import 'package:classify_flutter/data/models/task.dart';
import 'package:classify_flutter/data/models/notification_model.dart';

/// Repository for parent-related API calls
/// Maps to server/routes/parent.ts endpoints
class ParentRepository {
  final ApiClient _api;

  ParentRepository({required ApiClient api}) : _api = api;

  // --- Children ---

  /// GET /api/family/children
  Future<ApiResponse<List<Child>>> getChildren() async {
    return _api.get<List<Child>>(
      '/family/children',
      fromJson: (json) =>
          (json as List).map((e) => Child.fromJson(e)).toList(),
    );
  }

  /// POST /api/family/children
  Future<ApiResponse<Child>> addChild(Map<String, dynamic> data) async {
    return _api.post<Child>(
      '/family/children',
      data: data,
      fromJson: (json) => Child.fromJson(json),
    );
  }

  /// PUT /api/family/children/:id
  Future<ApiResponse<Child>> updateChild(
    String childId,
    Map<String, dynamic> data,
  ) async {
    return _api.put<Child>(
      '/family/children/$childId',
      data: data,
      fromJson: (json) => Child.fromJson(json),
    );
  }

  /// DELETE /api/family/children/:id
  Future<ApiResponse<void>> deleteChild(String childId) async {
    return _api.delete('/family/children/$childId');
  }

  // --- Tasks ---

  /// GET /api/parent/tasks
  Future<ApiResponse<List<Task>>> getTasks({
    String? childId,
    String? status,
    int? page,
    int? limit,
  }) async {
    final params = <String, dynamic>{};
    if (childId != null) params['childId'] = childId;
    if (status != null) params['status'] = status;
    if (page != null) params['page'] = page;
    if (limit != null) params['limit'] = limit;

    return _api.get<List<Task>>(
      '/parent/tasks',
      queryParameters: params,
      fromJson: (json) =>
          (json as List).map((e) => Task.fromJson(e)).toList(),
    );
  }

  /// POST /api/parent/tasks
  Future<ApiResponse<Task>> createTask(Map<String, dynamic> data) async {
    return _api.post<Task>(
      '/parent/tasks',
      data: data,
      fromJson: (json) => Task.fromJson(json),
    );
  }

  /// DELETE /api/parent/tasks/:id
  Future<ApiResponse<void>> deleteTask(String taskId) async {
    return _api.delete('/parent/tasks/$taskId');
  }

  // --- Notifications ---

  /// GET /api/notifications
  Future<ApiResponse<List<NotificationModel>>> getNotifications({
    int? page,
    int? limit,
  }) async {
    return _api.get<List<NotificationModel>>(
      '/notifications',
      queryParameters: {
        'page': ?page,
        'limit': ?limit,
      },
      fromJson: (json) => (json as List)
          .map((e) => NotificationModel.fromJson(e))
          .toList(),
    );
  }

  /// PUT /api/notifications/:id — Mark as read
  Future<ApiResponse<void>> markNotificationRead(String notificationId) async {
    return _api.put('/notifications/$notificationId');
  }

  /// DELETE /api/notifications/:id
  Future<ApiResponse<void>> deleteNotification(String notificationId) async {
    return _api.delete('/notifications/$notificationId');
  }

  // --- Profile ---

  /// PUT /api/parent/profile
  Future<ApiResponse<void>> updateProfile(Map<String, dynamic> data) async {
    return _api.put('/parent/profile', data: data);
  }

  // --- Wallet ---

  /// GET /api/parent/wallet
  Future<ApiResponse<Map<String, dynamic>>> getWallet() async {
    return _api.get<Map<String, dynamic>>(
      '/parent/wallet',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  // --- Gifts ---

  /// POST /api/gifts
  Future<ApiResponse<void>> sendGift(Map<String, dynamic> data) async {
    return _api.post('/gifts', data: data);
  }

  /// GET /api/gifts/:childId
  Future<ApiResponse<List<Map<String, dynamic>>>> getChildGifts(
    String childId,
  ) async {
    return _api.get<List<Map<String, dynamic>>>(
      '/gifts/$childId',
      fromJson: (json) =>
          (json as List).map((e) => e as Map<String, dynamic>).toList(),
    );
  }

  // --- Dashboard Stats ---

  /// GET /api/parent/dashboard-stats
  Future<ApiResponse<Map<String, dynamic>>> getDashboardStats() async {
    return _api.get<Map<String, dynamic>>(
      '/parent/dashboard-stats',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }
}
