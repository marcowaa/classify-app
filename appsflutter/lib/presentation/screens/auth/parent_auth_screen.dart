import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:classify_flutter/core/config/routes.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/data/models/auth_models.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

class ParentAuthScreen extends ConsumerStatefulWidget {
  const ParentAuthScreen({super.key});

  @override
  ConsumerState<ParentAuthScreen> createState() => _ParentAuthScreenState();
}

class _ParentAuthScreenState extends ConsumerState<ParentAuthScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _loginFormKey = GlobalKey<FormState>();
  final _registerFormKey = GlobalKey<FormState>();

  // Login fields
  final _loginEmail = TextEditingController();
  final _loginPassword = TextEditingController();

  // Register fields
  final _regName = TextEditingController();
  final _regEmail = TextEditingController();
  final _regPassword = TextEditingController();
  final _regPhone = TextEditingController();
  final _regGovernorate = TextEditingController();
  final _regPin = TextEditingController();
  final _regReferral = TextEditingController();

  bool _obscureLoginPass = true;
  bool _obscureRegPass = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginEmail.dispose();
    _loginPassword.dispose();
    _regName.dispose();
    _regEmail.dispose();
    _regPassword.dispose();
    _regPhone.dispose();
    _regGovernorate.dispose();
    _regPin.dispose();
    _regReferral.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_loginFormKey.currentState!.validate()) return;

    final result = await ref.read(authStateProvider.notifier).login(
          LoginRequest(
            email: _loginEmail.text.trim(),
            password: _loginPassword.text,
          ),
        );

    if (!mounted) return;

    if (result != null && result.twoFAEnabled == true) {
      context.push(RoutePaths.otp, extra: {
        'email': _loginEmail.text.trim(),
        'parentId': result.userId,
      });
    }
    // If login succeeded without 2FA, router redirect handles navigation
  }

  Future<void> _handleRegister() async {
    if (!_registerFormKey.currentState!.validate()) return;

    await ref.read(authStateProvider.notifier).register(
          RegisterRequest(
            name: _regName.text.trim(),
            email: _regEmail.text.trim(),
            password: _regPassword.text,
            phoneNumber:
                _regPhone.text.trim().isEmpty ? null : _regPhone.text.trim(),
            governorate: _regGovernorate.text.trim().isEmpty
                ? null
                : _regGovernorate.text.trim(),
            pin: _regPin.text.trim().isEmpty ? null : _regPin.text.trim(),
            referralCode: _regReferral.text.trim().isEmpty
                ? null
                : _regReferral.text.trim(),
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final authState = ref.watch(authStateProvider);

    // Show error snackbar
    ref.listen<AuthState>(authStateProvider, (prev, next) {
      if (next.errorMessage != null && prev?.errorMessage != next.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: Colors.red.shade700,
          ),
        );
        ref.read(authStateProvider.notifier).clearError();
      }
    });

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFF8F0FF), Colors.white],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.go(RoutePaths.accountType),
                      icon: const Icon(Icons.arrow_back_ios_rounded),
                    ),
                    const Spacer(),
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Center(
                        child: Text(
                          'C',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const Spacer(),
                    const SizedBox(width: 48),
                  ],
                ),
              ),

              // Tab bar
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 24),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: Colors.white,
                  unselectedLabelColor: AppColors.textSecondary,
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                  dividerHeight: 0,
                  tabs: [
                    Tab(text: l10n.login),
                    Tab(text: l10n.register),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Tab content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildLoginForm(l10n, authState),
                    _buildRegisterForm(l10n, authState),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm(AppLocalizations l10n, AuthState authState) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Form(
        key: _loginFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.welcomeBack,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.enterNow,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 32),

            // Email
            TextFormField(
              controller: _loginEmail,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: l10n.email,
                prefixIcon: const Icon(Icons.email_outlined),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return l10n.email;
                if (!v.contains('@')) return l10n.invalidCredentials;
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Password
            TextFormField(
              controller: _loginPassword,
              obscureText: _obscureLoginPass,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _handleLogin(),
              decoration: InputDecoration(
                labelText: l10n.password,
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscureLoginPass
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined),
                  onPressed: () =>
                      setState(() => _obscureLoginPass = !_obscureLoginPass),
                ),
              ),
              validator: (v) =>
                  v == null || v.isEmpty ? l10n.password : null,
            ),

            // Forgot password
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: () => context.push(RoutePaths.forgotPassword),
                child: Text(l10n.forgotPassword),
              ),
            ),
            const SizedBox(height: 16),

            // Login button
            FilledButton(
              onPressed: authState.isLoading ? null : _handleLogin,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: authState.isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      l10n.login,
                      style: const TextStyle(fontSize: 16),
                    ),
            ),
            const SizedBox(height: 16),

            // Switch to register
            TextButton(
              onPressed: () => _tabController.animateTo(1),
              child: Text(l10n.createNewAccount),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRegisterForm(AppLocalizations l10n, AuthState authState) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Form(
        key: _registerFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.registerNewParent,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 24),

            // Name
            TextFormField(
              controller: _regName,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: l10n.name,
                prefixIcon: const Icon(Icons.person_outline),
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? l10n.name : null,
            ),
            const SizedBox(height: 16),

            // Email
            TextFormField(
              controller: _regEmail,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: l10n.email,
                prefixIcon: const Icon(Icons.email_outlined),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return l10n.email;
                if (!v.contains('@')) return l10n.invalidCredentials;
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Password
            TextFormField(
              controller: _regPassword,
              obscureText: _obscureRegPass,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: l10n.password,
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscureRegPass
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined),
                  onPressed: () =>
                      setState(() => _obscureRegPass = !_obscureRegPass),
                ),
              ),
              validator: (v) =>
                  v == null || v.length < 6 ? l10n.password : null,
            ),
            const SizedBox(height: 16),

            // Phone (optional)
            TextFormField(
              controller: _regPhone,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: l10n.phoneNumber,
                prefixIcon: const Icon(Icons.phone_outlined),
              ),
            ),
            const SizedBox(height: 16),

            // Governorate (optional)
            TextFormField(
              controller: _regGovernorate,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: l10n.governorate,
                prefixIcon: const Icon(Icons.location_on_outlined),
              ),
            ),
            const SizedBox(height: 16),

            // PIN (optional)
            TextFormField(
              controller: _regPin,
              keyboardType: TextInputType.number,
              maxLength: 4,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: l10n.pinOptional,
                prefixIcon: const Icon(Icons.pin_outlined),
                counterText: '',
              ),
            ),
            const SizedBox(height: 16),

            // Referral code (optional)
            TextFormField(
              controller: _regReferral,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                labelText: l10n.referralCode,
                prefixIcon: const Icon(Icons.card_giftcard_outlined),
              ),
            ),
            const SizedBox(height: 24),

            // Register button
            FilledButton(
              onPressed: authState.isLoading ? null : _handleRegister,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: authState.isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      l10n.register,
                      style: const TextStyle(fontSize: 16),
                    ),
            ),
            const SizedBox(height: 16),

            // Switch to login
            TextButton(
              onPressed: () => _tabController.animateTo(0),
              child: Text(l10n.alreadyHaveAccount),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
