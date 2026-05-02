import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:classify_flutter/core/config/app_config.dart';

/// Secure storage for JWT tokens and sensitive data
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock,
          ),
        );

  // --- Parent Token ---
  Future<String?> getParentToken() async {
    return await _storage.read(key: AppConfig.parentTokenKey);
  }

  Future<void> setParentToken(String token) async {
    await _storage.write(key: AppConfig.parentTokenKey, value: token);
  }

  Future<void> deleteParentToken() async {
    await _storage.delete(key: AppConfig.parentTokenKey);
  }

  // --- Child Token ---
  Future<String?> getChildToken() async {
    return await _storage.read(key: AppConfig.childTokenKey);
  }

  Future<void> setChildToken(String token) async {
    await _storage.write(key: AppConfig.childTokenKey, value: token);
  }

  Future<void> deleteChildToken() async {
    await _storage.delete(key: AppConfig.childTokenKey);
  }

  // --- Admin Token ---
  Future<String?> getAdminToken() async {
    return await _storage.read(key: AppConfig.adminTokenKey);
  }

  Future<void> setAdminToken(String token) async {
    await _storage.write(key: AppConfig.adminTokenKey, value: token);
  }

  Future<void> deleteAdminToken() async {
    await _storage.delete(key: AppConfig.adminTokenKey);
  }

  // --- Active User Type ---
  Future<String?> getActiveUserType() async {
    return await _storage.read(key: AppConfig.activeUserTypeKey);
  }

  Future<void> setActiveUserType(String type) async {
    await _storage.write(key: AppConfig.activeUserTypeKey, value: type);
  }

  // --- Clear All ---
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  // --- Generic ---
  Future<void> write(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  Future<String?> read(String key) async {
    return await _storage.read(key: key);
  }

  Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }
}
