import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/core/storage/preferences.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);

class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    _loadTheme();
    return ThemeMode.system;
  }

  PreferencesService get _prefs => ref.read(preferencesProvider);

  Future<void> _loadTheme() async {
    final saved = await _prefs.getThemeMode();
    switch (saved) {
      case 'light':
        state = ThemeMode.light;
      case 'dark':
        state = ThemeMode.dark;
      default:
        state = ThemeMode.system;
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = mode;
    String value;
    switch (mode) {
      case ThemeMode.light:
        value = 'light';
      case ThemeMode.dark:
        value = 'dark';
      default:
        value = 'system';
    }
    await _prefs.setThemeMode(value);
  }

  void toggleTheme() {
    if (state == ThemeMode.dark) {
      setThemeMode(ThemeMode.light);
    } else {
      setThemeMode(ThemeMode.dark);
    }
  }
}
