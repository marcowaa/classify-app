import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:classify_flutter/core/config/app_config.dart';
import 'package:classify_flutter/core/config/theme.dart';
import 'package:classify_flutter/core/l10n/generated/app_localizations.dart';
import 'package:classify_flutter/domain/providers/auth_provider.dart';
import 'package:classify_flutter/domain/providers/child_provider.dart';

class GameWebViewScreen extends ConsumerStatefulWidget {
  final String gameId;

  const GameWebViewScreen({super.key, required this.gameId});

  @override
  ConsumerState<GameWebViewScreen> createState() => _GameWebViewScreenState();
}

class _GameWebViewScreenState extends ConsumerState<GameWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _gameCompleted = false;
  int _loadingProgress = 0;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            setState(() => _isLoading = true);
          },
          onProgress: (progress) {
            setState(() => _loadingProgress = progress);
          },
          onPageFinished: (_) {
            setState(() => _isLoading = false);
          },
          onWebResourceError: (error) {
            debugPrint('WebView error: ${error.description}');
          },
        ),
      )
      ..addJavaScriptChannel(
        'ClassifyGame',
        onMessageReceived: (message) {
          _handleGameMessage(message.message);
        },
      )
      ..loadRequest(
        Uri.parse('${AppConfig.gamesBaseUrl}/${widget.gameId}/index.html'),
      );
  }

  void _handleGameMessage(String message) {
    // Game sends "completed" when finished
    if (message == 'completed' || message == 'finish') {
      _completeGame();
    }
  }

  Future<void> _completeGame() async {
    if (_gameCompleted) return;
    setState(() => _gameCompleted = true);

    final repo = ref.read(childRepositoryProvider);
    final response = await repo.completeGame(gameId: widget.gameId);

    if (mounted) {
      final l10n = AppLocalizations.of(context)!;
      final points = response.data?['pointsEarned'] ?? 0;

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.celebration_rounded,
                size: 64,
                color: Color(0xFFF59E0B),
              ),
              const SizedBox(height: 16),
              Text(
                l10n.wellDone,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.earnedPoints(points as int),
                style: const TextStyle(
                  fontSize: 18,
                  color: Color(0xFFF59E0B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          actions: [
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                  ref.invalidate(childPointsProvider);
                  ref.invalidate(childGamesProvider);
                },
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(l10n.close),
              ),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.childGames,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(l10n.educationalGames),
        actions: [
          if (!_gameCompleted)
            TextButton(
              onPressed: _completeGame,
              child: Text(
                l10n.finishedGame,
                style: const TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            Container(
              color: Colors.white,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: _loadingProgress > 0
                          ? _loadingProgress / 100.0
                          : null,
                      color: AppColors.childGames,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      l10n.loading,
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
