#!/bin/bash
# Sync version from package.json to wails.json
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Change to project root to ensure relative paths work
cd "$PROJECT_ROOT"

# Read version from package.json (using relative path from project root)
VERSION=$(node -p "require('./frontend/package.json').version")

echo "📦 Syncing version: $VERSION"

# Update wails.json (now using relative path from project root)
if command -v jq &> /dev/null; then
  # Use jq if available
  jq --arg version "$VERSION" '.info.productVersion = $version' wails.json > wails.json.tmp
  mv wails.json.tmp wails.json
  echo "✓ Updated wails.json to version $VERSION"
else
  # Fallback to sed
  sed -i.bak "s/\"productVersion\": \".*\"/\"productVersion\": \"$VERSION\"/" wails.json
  rm -f wails.json.bak
  echo "✓ Updated wails.json to version $VERSION (using sed)"
fi

echo "✓ Version sync complete"

