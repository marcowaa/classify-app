import 'package:shared_preferences/shared_preferences.dart';

/// SharedPreferences wrapper for non-sensitive data
class PreferencesService {
  SharedPreferences? _prefs;

  Future<SharedPreferences> get _instance async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  // --- Locale ---
  Future<String> getLocale() async {
    final prefs = await _instance;
    return prefs.getString('locale') ?? 'ar';
  }

  Future<void> setLocale(String locale) async {
    final prefs = await _instance;
    await prefs.setString('locale', locale);
  }

  // --- Theme ---
  Future<String> getThemeMode() async {
    final prefs = await _instance;
    return prefs.getString('theme_mode') ?? 'system';
  }

  Future<void> setThemeMode(String mode) async {
    final prefs = await _instance;
    await prefs.setString('theme_mode', mode);
  }

  // --- Onboarding ---
  Future<bool> isOnboardingCompleted() async {
    final prefs = await _instance;
    return prefs.getBool('onboarding_completed') ?? false;
  }

  Future<void> setOnboardingCompleted() async {
    final prefs = await _instance;
    await prefs.setBool('onboarding_completed', true);
  }

  // --- Saved child accounts ---
  Future<List<String>> getSavedChildAccounts() async {
    final prefs = await _instance;
    return prefs.getStringList('saved_child_accounts') ?? [];
  }

  Future<void> setSavedChildAccounts(List<String> accounts) async {
    final prefs = await _instance;
    await prefs.setStringList('saved_child_accounts', accounts);
  }

  // --- Generic ---
  Future<void> setString(String key, String value) async {
    final prefs = await _instance;
    await prefs.setString(key, value);
  }

  Future<String?> getString(String key) async {
    final prefs = await _instance;
    return prefs.getString(key);
  }

  Future<void> setBool(String key, bool value) async {
    final prefs = await _instance;
    await prefs.setBool(key, value);
  }

  Future<bool?> getBool(String key) async {
    final prefs = await _instance;
    return prefs.getBool(key);
  }

  Future<void> clear() async {
    final prefs = await _instance;
    await prefs.clear();
  }
}
