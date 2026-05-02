#!/usr/bin/env bash
# ============================================================
# Classify — Google Play Screenshot Capture Script
# يحوّل ملفات HTML إلى صور PNG بالأبعاد الصحيحة
# ============================================================
# المتطلبات: Google Chrome أو Chromium
# التثبيت: sudo apt install chromium-browser
# الاستخدام: chmod +x capture-screenshots.sh && ./capture-screenshots.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$ROOT_DIR/screenshots/png"

# Find Chrome/Chromium
CHROME=""
for bin in google-chrome chromium-browser chromium google-chrome-stable; do
  if command -v "$bin" &>/dev/null; then
    CHROME="$bin"
    break
  fi
done

if [ -z "$CHROME" ]; then
  echo "❌ Chrome/Chromium not found. Install with: sudo apt install chromium-browser"
  exit 1
fi

echo "✅ Using browser: $CHROME"

# Create output directories
mkdir -p "$OUTPUT_DIR/phone"
mkdir -p "$OUTPUT_DIR/tablet7"
mkdir -p "$OUTPUT_DIR/tablet10"
mkdir -p "$OUTPUT_DIR/feature-graphic"

# ── Helper: capture HTML → PNG ──────────────────────────────
capture() {
  local html_file="$1"
  local out_file="$2"
  local width="$3"
  local height="$4"

  "$CHROME" \
    --headless \
    --disable-gpu \
    --no-sandbox \
    --disable-dev-shm-usage \
    --screenshot="$out_file" \
    --window-size="${width},${height}" \
    --hide-scrollbars \
    "file://$html_file"

  echo "  ✓ $(basename "$out_file")"
}

echo ""
echo "📱 Phone screenshots (1080×1920)..."
for f in "$ROOT_DIR/screenshots/phone/"*.html; do
  name="$(basename "$f" .html)"
  capture "$f" "$OUTPUT_DIR/phone/${name}.png" 1080 1920
done

echo ""
echo "📱 Tablet 7\" screenshots (1200×1920)..."
for f in "$ROOT_DIR/screenshots/tablet7/"*.html; do
  name="$(basename "$f" .html)"
  capture "$f" "$OUTPUT_DIR/tablet7/${name}.png" 1200 1920
done

echo ""
echo "📱 Tablet 10\" screenshots (1920×1200)..."
for f in "$ROOT_DIR/screenshots/tablet10/"*.html; do
  name="$(basename "$f" .html)"
  capture "$f" "$OUTPUT_DIR/tablet10/${name}.png" 1920 1200
done

echo ""
echo "🖼️  Feature Graphic (1024×500)..."
capture \
  "$ROOT_DIR/feature-graphic/feature-graphic-1024x500.html" \
  "$OUTPUT_DIR/feature-graphic/feature-graphic-1024x500.png" \
  1024 500

echo ""
echo "✅ All done! PNGs saved to: $OUTPUT_DIR"
echo ""
echo "📋 File counts:"
echo "  Phone:          $(ls "$OUTPUT_DIR/phone/"*.png 2>/dev/null | wc -l) files"
echo "  Tablet 7\":      $(ls "$OUTPUT_DIR/tablet7/"*.png 2>/dev/null | wc -l) files"
echo "  Tablet 10\":     $(ls "$OUTPUT_DIR/tablet10/"*.png 2>/dev/null | wc -l) files"
echo "  Feature Graphic:$(ls "$OUTPUT_DIR/feature-graphic/"*.png 2>/dev/null | wc -l) files"
