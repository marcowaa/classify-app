import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pin_code_fields/pin_code_fields.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/data/models/auth_models.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

class ChildPinLoginScreen extends ConsumerStatefulWidget {
  final String childId;
  final String childName;

  const ChildPinLoginScreen({
    super.key,
    required this.childId,
    required this.childName,
  });

  @override
  ConsumerState<ChildPinLoginScreen> createState() =>
      _ChildPinLoginScreenState();
}

class _ChildPinLoginScreenState extends ConsumerState<ChildPinLoginScreen> {
  String _pin = '';

  Future<void> _handlePinLogin() async {
    if (_pin.length != 4) return;

    await ref.read(authStateProvider.notifier).childPinLogin(
          ChildPinLoginRequest(
            childId: widget.childId,
            pin: _pin,
          ),
        );
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
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFF0FFF4),
              Color(0xFFE0FFE8),
              Color(0xFFF0FFF4),
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                // Back button
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back_ios_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Avatar
                CircleAvatar(
                  radius: 48,
                  backgroundColor:
                      const Color(0xFF10B981).withValues(alpha: 0.15),
                  child: Text(
                    widget.childName.isNotEmpty
                        ? widget.childName[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF10B981),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                Text(
                  '${l10n.welcome} ${widget.childName}!',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.yourPin,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 48),

                // PIN input
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: MaterialPinField(
                    length: 4,
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    theme: MaterialPinTheme(
                      shape: MaterialPinShape.circle,
                      cellSize: const Size(64, 64),
                      borderColor: Colors.grey.shade300,
                      focusedBorderColor: const Color(0xFF10B981),
                      filledBorderColor: const Color(0xFF10B981),
                      fillColor: Colors.grey.shade50,
                      focusedFillColor: Colors.white,
                      filledFillColor: Colors.white,
                      obscuringCharacter: '●',
                      entryAnimation: MaterialPinAnimation.scale,
                    ),
                    onChanged: (value) {
                      setState(() => _pin = value);
                    },
                    onCompleted: (_) => _handlePinLogin(),
                  ),
                ),
                const SizedBox(height: 32),

                // Login button
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: authState.isLoading || _pin.length != 4
                        ? null
                        : _handlePinLogin,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
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
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
