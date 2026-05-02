import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/config/routes.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';
import 'package:classify_flutter/domain/providers/locale_provider.dart';
import 'package:classify_flutter/domain/providers/theme_provider.dart';

class ParentProfileScreen extends ConsumerWidget {
  const ParentProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5FF),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 16),

              // Avatar
              CircleAvatar(
                radius: 48,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                child: const Icon(
                  Icons.person_rounded,
                  size: 48,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),

              Text(
                l10n.profile,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 32),

              // Settings section
              _buildSection(
                children: [
                  _buildTile(
                    icon: Icons.edit_outlined,
                    title: l10n.editProfile,
                    onTap: () {
                      // TODO: Edit profile screen
                    },
                  ),
                  const Divider(height: 1),
                  _buildTile(
                    icon: Icons.lock_outline,
                    title: l10n.changePassword,
                    onTap: () {
                      // TODO: Change password
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // App settings
              _buildSection(
                children: [
                  // Language
                  _buildTile(
                    icon: Icons.language_rounded,
                    title: l10n.language,
                    trailing: Consumer(
                      builder: (context, ref, _) {
                        final locale = ref.watch(localeProvider);
                        return DropdownButton<String>(
                          value: locale.languageCode,
                          underline: const SizedBox.shrink(),
                          items: const [
                            DropdownMenuItem(
                                value: 'ar', child: Text('العربية')),
                            DropdownMenuItem(
                                value: 'en', child: Text('English')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              ref
                                  .read(localeProvider.notifier)
                                  .setLocale(val);
                            }
                          },
                        );
                      },
                    ),
                  ),
                  const Divider(height: 1),

                  // Theme
                  _buildTile(
                    icon: Icons.palette_outlined,
                    title: l10n.theme,
                    trailing: DropdownButton<ThemeMode>(
                      value: themeMode,
                      underline: const SizedBox.shrink(),
                      items: [
                        DropdownMenuItem(
                          value: ThemeMode.light,
                          child: Text(l10n.lightMode),
                        ),
                        DropdownMenuItem(
                          value: ThemeMode.dark,
                          child: Text(l10n.darkMode),
                        ),
                        DropdownMenuItem(
                          value: ThemeMode.system,
                          child: Text(l10n.systemMode),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          ref.read(themeModeProvider.notifier).setThemeMode(val);
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Logout
              _buildSection(
                children: [
                  _buildTile(
                    icon: Icons.logout_rounded,
                    title: l10n.logout,
                    iconColor: Colors.red,
                    titleColor: Colors.red,
                    onTap: () => _showLogoutDialog(context, ref, l10n),
                  ),
                ],
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildTile({
    required IconData icon,
    required String title,
    VoidCallback? onTap,
    Widget? trailing,
    Color? iconColor,
    Color? titleColor,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: (iconColor ?? AppColors.primary).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: iconColor ?? AppColors.primary, size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
          color: titleColor ?? AppColors.textPrimary,
        ),
      ),
      trailing: trailing ??
          (onTap != null
              ? const Icon(Icons.arrow_forward_ios_rounded, size: 16)
              : null),
      onTap: onTap,
    );
  }

  void _showLogoutDialog(
      BuildContext context, WidgetRef ref, AppLocalizations l10n) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(l10n.logoutTitle),
        content: Text(l10n.logoutConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authStateProvider.notifier).logout();
              context.go(RoutePaths.accountType);
            },
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: Text(l10n.confirmLogout),
          ),
        ],
      ),
    );
  }
}
