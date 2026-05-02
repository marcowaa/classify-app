/// App-wide configuration constants
class AppConfig {
  AppConfig._();

  /// Base API URL — change for production
  static const String baseUrl = 'https://classi-fy.com';
  static const String apiBase = '$baseUrl/api';

  /// Auth
  static const String parentTokenKey = 'parent_token';
  static const String childTokenKey = 'child_token';
  static const String adminTokenKey = 'admin_token';
  static const String activeUserTypeKey = 'active_user_type';

  /// Token expiry
  static const Duration tokenExpiry = Duration(days: 30);

  /// OTP
  static const int otpLength = 6;
  static const Duration otpCooldown = Duration(seconds: 60);

  /// PIN
  static const int pinLength = 4;

  /// Timeouts
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);

  /// Pagination
  static const int defaultPageSize = 20;

  /// App info
  static const String appName = 'Classify';
  static const String appVersion = '1.0.0';
  static const String packageName = 'com.classi_fy.app';

  /// Games base URL (served from same server)
  static const String gamesBaseUrl = '$baseUrl/games';
}
