import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/config/routes.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/core/network/api_response.dart';
import 'package:classify_flutter/data/models/auth_models.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';

class ChildLinkScreen extends ConsumerStatefulWidget {
  const ChildLinkScreen({super.key});

  @override
  ConsumerState<ChildLinkScreen> createState() => _ChildLinkScreenState();
}

class _ChildLinkScreenState extends ConsumerState<ChildLinkScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _codeController = TextEditingController();
  final _pinController = TextEditingController();
  bool _showExistingLogin = false;

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleLink() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(authStateProvider.notifier).linkChild(
          ChildLinkRequest(
            name: _nameController.text.trim(),
            parentCode: _codeController.text.trim(),
            pin: _pinController.text.trim().isEmpty
                ? null
                : _pinController.text.trim(),
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
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => context.go(RoutePaths.accountType),
                        icon: const Icon(Icons.arrow_back_ios_rounded),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Child icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF10B981).withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.child_care_rounded,
                    size: 40,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),

                Text(
                  l10n.childLinking,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),

                // Toggle: new vs existing
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () =>
                              setState(() => _showExistingLogin = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: !_showExistingLogin
                                  ? const Color(0xFF10B981)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Center(
                              child: Text(
                                l10n.newChild,
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: !_showExistingLogin
                                      ? Colors.white
                                      : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () =>
                              setState(() => _showExistingLogin = true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _showExistingLogin
                                  ? const Color(0xFF10B981)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Center(
                              child: Text(
                                l10n.existingChild,
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: _showExistingLogin
                                      ? Colors.white
                                      : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                if (!_showExistingLogin) _buildNewChildForm(l10n, authState),
                if (_showExistingLogin) _buildExistingChildSection(l10n),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNewChildForm(AppLocalizations l10n, AuthState authState) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.linkAccountWithParent,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 24),

          // Child Name
          TextFormField(
            controller: _nameController,
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: l10n.childName,
              hintText: l10n.enterYourName,
              prefixIcon: const Icon(Icons.face_rounded),
              filled: true,
              fillColor: Colors.white,
            ),
            validator: (v) =>
                v == null || v.trim().isEmpty ? l10n.childName : null,
          ),
          const SizedBox(height: 16),

          // Parent Code
          TextFormField(
            controller: _codeController,
            textInputAction: TextInputAction.next,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              labelText: l10n.parentCode,
              hintText: l10n.exampleCode,
              prefixIcon: const Icon(Icons.link_rounded),
              helperText: l10n.askParentForCode,
              filled: true,
              fillColor: Colors.white,
            ),
            validator: (v) =>
                v == null || v.trim().isEmpty ? l10n.invalidCode : null,
          ),
          const SizedBox(height: 16),

          // PIN (optional)
          TextFormField(
            controller: _pinController,
            keyboardType: TextInputType.number,
            maxLength: 4,
            textInputAction: TextInputAction.done,
            decoration: InputDecoration(
              labelText: l10n.pinOptional,
              hintText: l10n.secretNumbers,
              prefixIcon: const Icon(Icons.pin_outlined),
              counterText: '',
              filled: true,
              fillColor: Colors.white,
            ),
          ),
          const SizedBox(height: 32),

          // Link button
          FilledButton(
            onPressed: authState.isLoading ? null : _handleLink,
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
                    l10n.startAdventure,
                    style: const TextStyle(fontSize: 16),
                  ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildExistingChildSection(AppLocalizations l10n) {
    return FutureBuilder<ApiResponse<List<Map<String, dynamic>>>>(
      future: ref.read(authRepositoryProvider).getChildrenForLogin(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(),
            ),
          );
        }

        final children = snapshot.data?.data ?? [];

        if (children.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Icon(Icons.child_care_rounded,
                    size: 64, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                Text(
                  l10n.noLinkedChildren,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => setState(() => _showExistingLogin = false),
                  child: Text(l10n.firstTimeLinkNew),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            Text(
              l10n.haveAccountLogin,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            ...children.map((child) {
              final name = child['name'] ?? '';
              final childId = child['id']?.toString() ?? '';
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: CircleAvatar(
                    backgroundColor:
                        const Color(0xFF10B981).withValues(alpha: 0.1),
                    radius: 28,
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF10B981),
                      ),
                    ),
                  ),
                  title: Text(
                    name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded,
                      size: 16),
                  onTap: () {
                    context.push(RoutePaths.childPinLogin, extra: {
                      'childId': childId,
                      'childName': name,
                    });
                  },
                ),
              );
            }),
            const SizedBox(height: 32),
          ],
        );
      },
    );
  }
}
