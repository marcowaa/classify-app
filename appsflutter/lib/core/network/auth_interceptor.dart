import 'package:dio/dio.dart';
import 'package:classify_flutter/core/storage/secure_storage.dart';

/// Dio interceptor that injects JWT token based on route type
class AuthInterceptor extends Interceptor {
  final SecureStorageService _storage;
  void Function()? onUnauthorized;

  AuthInterceptor({
    required SecureStorageService storage,
    this.onUnauthorized,
  }) : _storage = storage;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final path = options.path;
    String? token;

    // Select token based on route
    if (path.startsWith('/admin')) {
      token = await _storage.getAdminToken();
      token ??= await _storage.getParentToken();
    } else if (path.startsWith('/child')) {
      token = await _storage.getChildToken();
      token ??= await _storage.getParentToken();
    } else {
      token = await _storage.getParentToken();
      token ??= await _storage.getChildToken();
    }

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired or invalid
      onUnauthorized?.call();
    }
    handler.next(err);
  }
}
