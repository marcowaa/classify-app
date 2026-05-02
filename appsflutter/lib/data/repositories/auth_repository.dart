import 'package:classify_flutter/core/network/api_client.dart';
import 'package:classify_flutter/core/network/api_response.dart';
import 'package:classify_flutter/data/models/auth_models.dart';
import 'package:classify_flutter/data/models/parent.dart';

/// Repository handling all auth-related API calls
/// Maps to server/routes/auth.ts endpoints
class AuthRepository {
  final ApiClient _api;

  AuthRepository({required ApiClient api}) : _api = api;

  /// POST /api/auth/register
  Future<ApiResponse<AuthResponse>> register(RegisterRequest request) async {
    return _api.post<AuthResponse>(
      '/auth/register',
      data: request.toJson(),
      fromJson: (json) => AuthResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  /// POST /api/auth/login
  Future<ApiResponse<AuthResponse>> login(LoginRequest request) async {
    return _api.post<AuthResponse>(
      '/auth/login',
      data: request.toJson(),
      fromJson: (json) => AuthResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  /// POST /api/auth/request-otp
  Future<ApiResponse<Map<String, dynamic>>> requestOtp(
    OtpRequest request,
  ) async {
    return _api.post<Map<String, dynamic>>(
      '/auth/request-otp',
      data: request.toJson(),
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// POST /api/auth/verify-otp
  Future<ApiResponse<AuthResponse>> verifyOtp(OtpVerifyRequest request) async {
    return _api.post<AuthResponse>(
      '/auth/verify-otp',
      data: request.toJson(),
      fromJson: (json) => AuthResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  /// POST /api/auth/logout
  Future<ApiResponse<void>> logout() async {
    return _api.post('/auth/logout');
  }

  /// POST /api/auth/forgot-password
  Future<ApiResponse<void>> forgotPassword(
    ForgotPasswordRequest request,
  ) async {
    return _api.post('/auth/forgot-password', data: request.toJson());
  }

  /// GET /api/auth/me — Get current parent profile
  Future<ApiResponse<Parent>> getProfile() async {
    return _api.get<Parent>(
      '/auth/me',
      fromJson: (json) => Parent.fromJson(json as Map<String, dynamic>),
    );
  }

  /// POST /api/auth/child-link — Link child with parent code
  Future<ApiResponse<ChildLinkResponse>> linkChild(
    ChildLinkRequest request,
  ) async {
    return _api.post<ChildLinkResponse>(
      '/auth/child-link',
      data: request.toJson(),
      fromJson: (json) =>
          ChildLinkResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  /// POST /api/auth/child-pin-login — Child login with PIN
  Future<ApiResponse<ChildLinkResponse>> childPinLogin(
    ChildPinLoginRequest request,
  ) async {
    return _api.post<ChildLinkResponse>(
      '/auth/child-pin-login',
      data: request.toJson(),
      fromJson: (json) =>
          ChildLinkResponse.fromJson(json as Map<String, dynamic>),
    );
  }

  /// GET /api/auth/children — List children for parent selection
  Future<ApiResponse<List<Map<String, dynamic>>>> getChildrenForLogin() async {
    return _api.get<List<Map<String, dynamic>>>(
      '/auth/children',
      fromJson: (json) => (json as List)
          .map((e) => e as Map<String, dynamic>)
          .toList(),
    );
  }

  /// POST /api/auth/change-password
  Future<ApiResponse<void>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    return _api.post('/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }
}
