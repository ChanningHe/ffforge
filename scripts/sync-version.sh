#!/bin/bash
# Sync version from package.json to wails.json
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Read version from package.json
VERSION=$(node -p "require('$PROJECT_ROOT/frontend/package.json').version")

echo "📦 Syncing version: $VERSION"

# Update wails.json
if command -v jq &> /dev/null; then
  # Use jq if available
  jq --arg version "$VERSION" '.info.productVersion = $version' "$PROJECT_ROOT/wails.json" > "$PROJECT_ROOT/wails.json.tmp"
  mv "$PROJECT_ROOT/wails.json.tmp" "$PROJECT_ROOT/wails.json"
  echo "✓ Updated wails.json to version $VERSION"
else
  # Fallback to sed
  sed -i.bak "s/\"productVersion\": \".*\"/\"productVersion\": \"$VERSION\"/" "$PROJECT_ROOT/wails.json"
  rm -f "$PROJECT_ROOT/wails.json.bak"
  echo "✓ Updated wails.json to version $VERSION (using sed)"
fi

echo "✓ Version sync complete"

