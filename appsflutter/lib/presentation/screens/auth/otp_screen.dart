import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pin_code_fields/pin_code_fields.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/config/routes.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/data/models/auth_models.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String email;
  final String parentId;

  const OtpScreen({
    super.key,
    required this.email,
    required this.parentId,
  });

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  String _otpCode = '';
  bool _isResending = false;

  Future<void> _verifyOtp() async {
    if (_otpCode.length != 6) return;

    final success = await ref.read(authStateProvider.notifier).verifyOtp(
          OtpVerifyRequest(
            email: widget.email,
            code: _otpCode,
            parentId: widget.parentId,
          ),
        );

    if (success && mounted) {
      context.go(RoutePaths.parentDashboard);
    }
  }

  Future<void> _resendOtp() async {
    setState(() => _isResending = true);

    final repo = ref.read(authRepositoryProvider);
    await repo.requestOtp(OtpRequest(
      email: widget.email,
      parentId: widget.parentId,
    ));

    if (mounted) {
      setState(() => _isResending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.otpResent),
          backgroundColor: Colors.green.shade700,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final authState = ref.watch(authStateProvider);

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
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                // Header
                Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_ios_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Lock icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Icon(
                    Icons.verified_user_rounded,
                    size: 40,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 24),

                Text(
                  l10n.otpVerification,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.enterOtpCode,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.email,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 40),

                // OTP Input
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: MaterialPinField(
                    length: 6,
                    keyboardType: TextInputType.number,
                    theme: MaterialPinTheme(
                      shape: MaterialPinShape.outlined,
                      borderRadius: BorderRadius.circular(14),
                      cellSize: const Size(48, 56),
                      borderColor: Colors.grey.shade300,
                      focusedBorderColor: AppColors.primary,
                      filledBorderColor: AppColors.primary,
                      fillColor: Colors.grey.shade50,
                      focusedFillColor: Colors.white,
                      filledFillColor: Colors.white,
                      entryAnimation: MaterialPinAnimation.fade,
                    ),
                    onChanged: (value) {
                      setState(() => _otpCode = value);
                    },
                    onCompleted: (_) => _verifyOtp(),
                  ),
                ),
                const SizedBox(height: 32),

                // Verify button
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: authState.isLoading || _otpCode.length != 6
                        ? null
                        : _verifyOtp,
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
                            l10n.verifyOtp,
                            style: const TextStyle(fontSize: 16),
                          ),
                  ),
                ),
                const SizedBox(height: 16),

                // Resend
                TextButton(
                  onPressed: _isResending ? null : _resendOtp,
                  child: _isResending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(l10n.resendOtp),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
