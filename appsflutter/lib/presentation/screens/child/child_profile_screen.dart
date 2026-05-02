import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/config/routes.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';
import 'package:classify_flutter/domain/providers/child_provider.dart';
import 'package:classify_flutter/domain/providers/locale_provider.dart';
import 'package:classify_flutter/domain/providers/theme_provider.dart';

class ChildProfileScreen extends ConsumerWidget {
  const ChildProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final profileAsync = ref.watch(childProfileProvider);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.childProfile, Color(0xFFA78BFA)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.face_rounded,
                        color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    l10n.profile,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Profile card
              profileAsync.when(
                data: (profile) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.childProfile, Color(0xFFA78BFA)],
                      ),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 48,
                          backgroundColor:
                              Colors.white.withValues(alpha: 0.2),
                          backgroundImage: profile.avatarUrl != null
                              ? NetworkImage(profile.avatarUrl!)
                              : null,
                          child: profile.avatarUrl == null
                              ? Text(
                                  profile.name.isNotEmpty
                                      ? profile.name[0].toUpperCase()
                                      : '?',
                                  style: const TextStyle(
                                    fontSize: 40,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          profile.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        if (profile.age > 0) ...[
                          const SizedBox(height: 4),
                          Text(
                            '${profile.age} years',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                        ],
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star_rounded,
                                  size: 20, color: Colors.white),
                              const SizedBox(width: 6),
                              Text(
                                '${profile.totalPoints} ${l10n.points}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
                loading: () => const SizedBox(
                  height: 200,
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (_, _) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 24),

              // Settings
              _buildSection(
                children: [
                  _buildTile(
                    icon: Icons.edit_outlined,
                    title: l10n.editProfile,
                    color: AppColors.childProfile,
                    onTap: () {
                      // TODO: Edit profile
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),

              _buildSection(
                children: [
                  // Language
                  _buildTile(
                    icon: Icons.language_rounded,
                    title: l10n.language,
                    color: AppColors.childGames,
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
                    color: AppColors.childTasks,
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
                    color: Colors.red,
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
    required Color color,
    VoidCallback? onTap,
    Widget? trailing,
  }) {
    return ListTile(
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
          color: color == Colors.red ? Colors.red : AppColors.textPrimary,
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
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: Text(l10n.confirmLogout),
          ),
        ],
      ),
    );
  }
}
