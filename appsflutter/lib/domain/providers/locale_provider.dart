import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/core/storage/preferences.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

final localeProvider = NotifierProvider<LocaleNotifier, Locale>(LocaleNotifier.new);

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() {
    _loadLocale();
    return const Locale('ar');
  }

  PreferencesService get _prefs => ref.read(preferencesProvider);

  Future<void> _loadLocale() async {
    final saved = await _prefs.getLocale();
    state = Locale(saved);
  }

  Future<void> setLocale(String languageCode) async {
    state = Locale(languageCode);
    await _prefs.setLocale(languageCode);
  }

  bool get isRtl => state.languageCode == 'ar';
}
