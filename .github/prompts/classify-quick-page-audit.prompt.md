---
name: Classify Quick Page Audit
description: "Quickly audit one Classify page/route for bugs, dead/live code, and SEO/ASO quality, then provide prioritized fixes."
argument-hint: "Page route or file path (for example: /download or client/src/pages/DownloadApp.tsx)"
agent: "Classify Bug Intelligence Agent"
---
Run a focused audit for the target page/route:

1. Trace navigation and related routes/APIs end-to-end.
2. Identify confirmed bugs and high-risk regressions.
3. Map dead code vs live code dependencies in touched scope.
4. Review SEO/ASO-relevant implementation for the page.
5. If safe and clear, apply minimal fixes and validate.

Return results in this order:
- Critical findings first (with file references)
- Fixes applied (if any)
- Validation results
- Remaining risks / follow-ups
