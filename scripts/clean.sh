#!/usr/bin/env bash
set -euo pipefail

# Clean build artifacts
# Usage: ./scripts/clean.sh

echo "🧹 Cleaning build artifacts..."

rm -rf cmd/server/server
rm -rf frontend/dist
rm -rf build

echo "✨ Clean complete!"

