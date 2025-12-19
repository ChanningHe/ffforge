#!/usr/bin/env bash
set -euo pipefail

# Build Web Application
# Usage: ./scripts/build-web.sh

echo "🎨 Building frontend..."
cd frontend && npm run build && cd ..

echo "🔨 Building backend server..."
go build -o cmd/server/server cmd/server/main.go

echo "✅ Web version built!"
echo "  Frontend: frontend/dist/"
echo "  Backend:  cmd/server/server"

