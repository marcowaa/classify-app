import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/child_provider.dart';

class ChildGiftsScreen extends ConsumerWidget {
  const ChildGiftsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final giftsAsync = ref.watch(childGiftsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFDF2F8),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.childGifts, Color(0xFFF472B6)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.card_giftcard_rounded,
                        color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    l10n.gifts,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Gifts grid
            Expanded(
              child: giftsAsync.when(
                data: (gifts) {
                  if (gifts.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.card_giftcard_outlined,
                              size: 72, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text(
                            l10n.noGifts,
                            style: const TextStyle(
                              fontSize: 16,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(childGiftsProvider);
                    },
                    child: GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 14,
                        crossAxisSpacing: 14,
                        childAspectRatio: 0.85,
                      ),
                      itemCount: gifts.length,
                      itemBuilder: (context, index) {
                        final gift = gifts[index];
                        return Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.childGifts
                                    .withValues(alpha: 0.1),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Expanded(
                                flex: 3,
                                child: ClipRRect(
                                  borderRadius: const BorderRadius.vertical(
                                      top: Radius.circular(20)),
                                  child: gift.imageUrl != null
                                      ? Image.network(
                                          gift.imageUrl!,
                                          fit: BoxFit.cover,
                                          width: double.infinity,
                                          errorBuilder: (_, _, _) =>
                                              _giftPlaceholder(),
                                        )
                                      : _giftPlaceholder(),
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Column(
                                    children: [
                                      Text(
                                        gift.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const Spacer(),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _statusColor(gift.status)
                                              .withValues(alpha: 0.1),
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                        child: Text(
                                          gift.status ?? '',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: _statusColor(gift.status),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  );
                },
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline,
                          size: 48, color: Colors.red.shade300),
                      const SizedBox(height: 8),
                      Text(l10n.somethingWentWrong),
                      TextButton(
                        onPressed: () => ref.invalidate(childGiftsProvider),
                        child: Text(l10n.tryAgain),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _giftPlaceholder() {
    return Container(
      color: AppColors.childGifts.withValues(alpha: 0.1),
      child: const Center(
        child: Icon(
          Icons.card_giftcard_rounded,
          size: 40,
          color: AppColors.childGifts,
        ),
      ),
    );
  }

  Color _statusColor(String? status) {
    return switch (status) {
      'delivered' => const Color(0xFF10B981),
      'pending' => const Color(0xFFF59E0B),
      _ => AppColors.childGifts,
    };
  }
}
