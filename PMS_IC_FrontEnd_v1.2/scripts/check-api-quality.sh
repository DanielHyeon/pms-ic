#!/usr/bin/env bash
# Phase 5 API Quality Gate
# Ensures no unsafe type casts remain in hook layer
# and tracks fetchWithFallback migration progress.

HOOKS_DIR="src/hooks/api"
API_FILE="src/services/api.ts"

# Gate 1: No unsafe casts in hooks
CAST_COUNT=$(grep -r 'as unknown as' "$HOOKS_DIR" 2>/dev/null | wc -l)
ANY_COUNT=$(grep -r 'as any' "$HOOKS_DIR" 2>/dev/null | wc -l)

# Gate 2: Track fetchWithFallback usage (informational)
FWF_COUNT=$(grep -c 'fetchWithFallback' "$API_FILE" 2>/dev/null || echo 0)
RESULT_COUNT=$(grep -c 'fetchResult' "$API_FILE" 2>/dev/null || echo 0)

echo "=== Phase 5 API Quality Gate ==="
echo ""
echo "Hook Layer Safety:"
echo "  'as unknown as' casts: $CAST_COUNT"
echo "  'as any' casts:        $ANY_COUNT (in hooks only)"
echo ""
echo "API Layer Migration:"
echo "  fetchWithFallback:     $FWF_COUNT calls"
echo "  fetchResult:           $RESULT_COUNT calls"
echo ""

FAILED=0

if [ "$CAST_COUNT" -gt 0 ]; then
  echo "FAIL: $CAST_COUNT 'as unknown as' casts found in $HOOKS_DIR"
  grep -rn 'as unknown as' "$HOOKS_DIR" 2>/dev/null || true
  FAILED=1
fi

if [ "$FAILED" -eq 0 ]; then
  echo "PASS: All quality gates passed"
else
  echo ""
  echo "FAIL: Quality gate failed"
  exit 1
fi
