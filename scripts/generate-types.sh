#!/usr/bin/env bash
# Generate Swift / Kotlin types from packages/shared-types.
#
# Implementation arrives in Phase 9 (Swift) and Phase 14 (Kotlin).
# Likely tooling: ts-morph or quicktype.
#
# Output targets:
#   ios/SimpleJournal/Models/Generated/*.swift
#   android/app/src/main/java/com/simplejournal/generated/*.kt

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED_TYPES_DIR="$ROOT/packages/shared-types/src"

echo "[generate-types] source: $SHARED_TYPES_DIR"
echo "[generate-types] not yet implemented — placeholder for Phase 9 / 14"

exit 0
