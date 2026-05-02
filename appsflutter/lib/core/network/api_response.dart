/// Generic API response wrapper matching backend format:
/// Success: { "success": true, "data": {...}, "message": "..." }
/// Error: { "success": false, "error": "ERROR_CODE", "message": "..." }
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final String? errorCode;
  final int? statusCode;

  const ApiResponse._({
    required this.success,
    this.data,
    this.message,
    this.errorCode,
    this.statusCode,
  });

  factory ApiResponse.success({T? data, String? message}) {
    return ApiResponse._(
      success: true,
      data: data,
      message: message,
    );
  }

  factory ApiResponse.error({
    required String code,
    required String message,
    int statusCode = 0,
  }) {
    return ApiResponse._(
      success: false,
      errorCode: code,
      message: message,
      statusCode: statusCode,
    );
  }

  bool get isError => !success;

  /// Unwrap data or throw
  T get dataOrThrow {
    if (!success || data == null) {
      throw ApiException(
        code: errorCode ?? 'NO_DATA',
        message: message ?? 'No data available',
        statusCode: statusCode ?? 0,
      );
    }
    return data as T;
  }

  /// Map success data to a different type
  ApiResponse<R> map<R>(R Function(T data) mapper) {
    if (success && data != null) {
      return ApiResponse.success(
        data: mapper(data as T),
        message: message,
      );
    }
    return ApiResponse.error(
      code: errorCode ?? 'ERROR',
      message: message ?? 'Error',
      statusCode: statusCode ?? 0,
    );
  }
}

class ApiException implements Exception {
  final String code;
  final String message;
  final int statusCode;

  const ApiException({
    required this.code,
    required this.message,
    required this.statusCode,
  });

  @override
  String toString() => 'ApiException($code): $message';

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isRateLimited => statusCode == 429;
  bool get isServerError => statusCode >= 500;
}
