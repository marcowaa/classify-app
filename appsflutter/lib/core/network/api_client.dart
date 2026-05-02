import 'package:dio/dio.dart';
import 'package:classify_flutter/core/config/app_config.dart';
import 'package:classify_flutter/core/network/auth_interceptor.dart';
import 'package:classify_flutter/core/network/api_response.dart';
import 'package:logger/logger.dart';

final _logger = Logger(printer: PrettyPrinter(methodCount: 0));

class ApiClient {
  late final Dio _dio;
  final AuthInterceptor _authInterceptor;

  ApiClient({required AuthInterceptor authInterceptor})
      : _authInterceptor = authInterceptor {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBase,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      _authInterceptor,
      _LoggingInterceptor(),
    ]);
  }

  /// GET request
  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleError<T>(e);
    }
  }

  /// POST request
  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleError<T>(e);
    }
  }

  /// PUT request
  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleError<T>(e);
    }
  }

  /// DELETE request
  Future<ApiResponse<T>> delete<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.delete(
        path,
        queryParameters: queryParameters,
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleError<T>(e);
    }
  }

  /// PATCH request
  Future<ApiResponse<T>> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.patch(path, data: data);
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleError<T>(e);
    }
  }

  /// Upload file with multipart
  Future<ApiResponse<T>> upload<T>(
    String path, {
    required FormData formData,
    T Function(dynamic json)? fromJson,
    void Function(int, int)? onSendProgress,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: formData,
        onSendProgress: onSendProgress,
        options: Options(
          headers: {'Content-Type': 'multipart/form-data'},
        ),
      );
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      return _handleError<T>(e);
    }
  }

  /// Handle successful response
  ApiResponse<T> _handleResponse<T>(
    Response response,
    T Function(dynamic json)? fromJson,
  ) {
    final data = response.data;

    // API returns { success: true, data: {...}, message: "..." }
    if (data is Map<String, dynamic>) {
      if (data['success'] == false) {
        return ApiResponse.error(
          code: data['error'] ?? 'API_ERROR',
          message: data['message'] ?? 'Request failed',
          statusCode: response.statusCode ?? 500,
        );
      }

      final responseData = data['data'];
      if (fromJson != null && responseData != null) {
        return ApiResponse.success(
          data: fromJson(responseData),
          message: data['message'],
        );
      }

      return ApiResponse.success(
        data: responseData as T?,
        message: data['message'],
      );
    }

    return ApiResponse.success(data: data as T?);
  }

  /// Handle DioException
  ApiResponse<T> _handleError<T>(DioException e) {
    String code = 'NETWORK_ERROR';
    String message = 'Network error occurred';
    int statusCode = 0;

    if (e.response != null) {
      statusCode = e.response!.statusCode ?? 0;
      final data = e.response!.data;
      if (data is Map<String, dynamic>) {
        code = data['error'] ?? 'SERVER_ERROR';
        message = data['message'] ?? 'Server error';
      } else {
        code = 'HTTP_$statusCode';
        message = 'HTTP Error $statusCode';
      }
    } else {
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
          code = 'CONNECTION_TIMEOUT';
          message = 'Connection timed out';
          break;
        case DioExceptionType.receiveTimeout:
          code = 'RECEIVE_TIMEOUT';
          message = 'Response timed out';
          break;
        case DioExceptionType.connectionError:
          code = 'NO_CONNECTION';
          message = 'No internet connection';
          break;
        default:
          code = 'UNKNOWN_ERROR';
          message = e.message ?? 'Unknown error';
      }
    }

    return ApiResponse.error(
      code: code,
      message: message,
      statusCode: statusCode,
    );
  }
}

/// Logging interceptor for development
class _LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    _logger.d('→ ${options.method} ${options.path}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    _logger.d('← ${response.statusCode} ${response.requestOptions.path}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _logger.e('✗ ${err.response?.statusCode} ${err.requestOptions.path}');
    handler.next(err);
  }
}
