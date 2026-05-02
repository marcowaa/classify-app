import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/core/storage/secure_storage.dart';
import 'package:classify_flutter/core/network/api_client.dart';
import 'package:classify_flutter/core/network/auth_interceptor.dart';
import 'package:classify_flutter/core/storage/preferences.dart';
import 'package:classify_flutter/data/models/auth_models.dart';
import 'package:classify_flutter/data/repositories/auth_repository.dart';
import 'package:classify_flutter/data/repositories/parent_repository.dart';
import 'package:classify_flutter/data/repositories/child_repository.dart';

// --- Singletons ---

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final preferencesProvider = Provider<PreferencesService>((ref) {
  return PreferencesService();
});

final authInterceptorProvider = Provider<AuthInterceptor>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return AuthInterceptor(storage: storage);
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final authInterceptor = ref.watch(authInterceptorProvider);
  return ApiClient(authInterceptor: authInterceptor);
});

// --- Repositories ---

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(api: ref.watch(apiClientProvider));
});

final parentRepositoryProvider = Provider<ParentRepository>((ref) {
  return ParentRepository(api: ref.watch(apiClientProvider));
});

final childRepositoryProvider = Provider<ChildRepository>((ref) {
  return ChildRepository(api: ref.watch(apiClientProvider));
});

// --- Auth State ---

enum UserType { parent, child, none }

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final UserType userType;
  final String? userId;
  final String? token;
  final String? errorMessage;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.userType = UserType.none,
    this.userId,
    this.token,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    UserType? userType,
    String? userId,
    String? token,
    String? errorMessage,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      userType: userType ?? this.userType,
      userId: userId ?? this.userId,
      token: token ?? this.token,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    // Wire up the unauthorized callback to break circular dependency
    final interceptor = ref.read(authInterceptorProvider);
    interceptor.onUnauthorized = () => logout();
    return const AuthState();
  }

  AuthRepository get _authRepo => ref.read(authRepositoryProvider);
  SecureStorageService get _storage => ref.read(secureStorageProvider);

  /// Check for existing tokens on app start
  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true);

    final parentToken = await _storage.getParentToken();
    final childToken = await _storage.getChildToken();
    final userType = await _storage.getActiveUserType();

    if (userType == 'child' && childToken != null) {
      state = AuthState(
        isAuthenticated: true,
        userType: UserType.child,
        token: childToken,
      );
    } else if (parentToken != null) {
      state = AuthState(
        isAuthenticated: true,
        userType: UserType.parent,
        token: parentToken,
      );
    } else {
      state = const AuthState(isAuthenticated: false);
    }
  }

  /// Parent Registration
  Future<AuthResponse?> register(RegisterRequest request) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final response = await _authRepo.register(request);

    if (response.success && response.data != null) {
      final authData = response.data!;
      await _storage.setParentToken(authData.token);
      await _storage.setActiveUserType('parent');

      state = AuthState(
        isAuthenticated: true,
        userType: UserType.parent,
        userId: authData.userId,
        token: authData.token,
      );
      return authData;
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.message ?? 'Registration failed',
      );
      return null;
    }
  }

  /// Parent Login
  Future<AuthResponse?> login(LoginRequest request) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final response = await _authRepo.login(request);

    if (response.success && response.data != null) {
      final authData = response.data!;

      // Check if 2FA is required
      if (authData.twoFAEnabled == true) {
        state = state.copyWith(isLoading: false);
        return authData; // Caller should navigate to OTP screen
      }

      await _storage.setParentToken(authData.token);
      await _storage.setActiveUserType('parent');

      state = AuthState(
        isAuthenticated: true,
        userType: UserType.parent,
        userId: authData.userId,
        token: authData.token,
      );
      return authData;
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.message ?? 'Login failed',
      );
      return null;
    }
  }

  /// OTP Verification
  Future<bool> verifyOtp(OtpVerifyRequest request) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final response = await _authRepo.verifyOtp(request);

    if (response.success && response.data != null) {
      await _storage.setParentToken(response.data!.token);
      await _storage.setActiveUserType('parent');

      state = AuthState(
        isAuthenticated: true,
        userType: UserType.parent,
        userId: response.data!.userId,
        token: response.data!.token,
      );
      return true;
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.message ?? 'OTP verification failed',
      );
      return false;
    }
  }

  /// Child Link (new account)
  Future<ChildLinkResponse?> linkChild(ChildLinkRequest request) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final response = await _authRepo.linkChild(request);

    if (response.success && response.data != null) {
      final data = response.data!;
      await _storage.setChildToken(data.token);
      await _storage.setActiveUserType('child');

      state = AuthState(
        isAuthenticated: true,
        userType: UserType.child,
        userId: data.childId,
        token: data.token,
      );
      return data;
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.message ?? 'Linking failed',
      );
      return null;
    }
  }

  /// Child PIN Login
  Future<bool> childPinLogin(ChildPinLoginRequest request) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    final response = await _authRepo.childPinLogin(request);

    if (response.success && response.data != null) {
      await _storage.setChildToken(response.data!.token);
      await _storage.setActiveUserType('child');

      state = AuthState(
        isAuthenticated: true,
        userType: UserType.child,
        userId: response.data!.childId,
        token: response.data!.token,
      );
      return true;
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.message ?? 'PIN login failed',
      );
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      await _authRepo.logout();
    } catch (_) {}
    await _storage.clearAll();
    state = const AuthState(isAuthenticated: false);
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

final authStateProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
