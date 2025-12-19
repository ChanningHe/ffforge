# FFForge Build Tool
# Usage: just <command>

# Show available commands
default:
    @just --list

# Install all dependencies
install:
    @echo "Installing backend dependencies..."
    go mod tidy
    @echo "Installing frontend dependencies..."
    cd frontend && npm install
    @echo "Done!"

# Clean build artifacts
clean:
    @./scripts/clean.sh

# Run backend tests
test:
    @echo "Running backend tests..."
    go test ./...

# ============ Web Version ============

# Run web version in development mode
dev-web:
    @echo "Starting web version..."
    @echo "Backend: http://localhost:8080"
    @echo "Frontend: http://localhost:3000"
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    (go run cmd/server/main.go) &
    (cd frontend && npm run dev)

# Build web version
build-web:
    @./scripts/build-web.sh

# Run built web version
run-web:
    @echo "Starting web server..."
    ./cmd/server/server

# ============ Desktop Version ============

# Run desktop version in development mode
dev-desktop:
    @echo "Starting desktop version with hot reload..."
    ~/go/bin/wails dev

# Build desktop version (release)
build-desktop:
    @./scripts/download-ffmpeg.sh
    @./scripts/build-desktop.sh release

# Build desktop version (debug)
build-desktop-debug:
    @./scripts/download-ffmpeg.sh
    @./scripts/build-desktop.sh debug

# Build and run desktop version
run-desktop: build-desktop-debug
    @echo "Running desktop app..."
    open build/bin/ffforge-desktop.app

# Build desktop for all platforms  
build-desktop-all:
    @./scripts/build-desktop-all.sh

# ============ Docker ============

# Build Docker image
docker-build:
    docker build -t ffforge:latest .

# Run Docker container
docker-run:
    docker-compose up -d

# Stop Docker container
docker-stop:
    docker-compose down

# View Docker logs
docker-logs:
    docker-compose logs -f

# ============ Development ============

# Run frontend linter
lint:
    @echo "Running frontend linter..."
    cd frontend && npm run lint

# Format Go code
format:
    @echo "Formatting Go code..."
    go fmt ./...
    @echo "Format complete!"

# Check prerequisites for desktop build
check:
    @echo "Checking prerequisites..."
    @command -v go >/dev/null 2>&1 || echo "ERROR: Go not installed"
    @command -v node >/dev/null 2>&1 || echo "ERROR: Node.js not installed"
    @command -v wails >/dev/null 2>&1 || echo "WARNING: Wails CLI not installed"
    @command -v ffmpeg >/dev/null 2>&1 || echo "WARNING: FFmpeg not installed"
    @command -v ffprobe >/dev/null 2>&1 || echo "WARNING: FFprobe not installed"
    @echo "Check complete!"

# ============ Release ============

# Create web release package
release-web: build-web
    @echo "Creating web release package..."
    mkdir -p release/web
    cp -r frontend/dist release/web/
    cp cmd/server/server release/web/
    cp docker-compose.yaml release/web/
    cp README.md release/web/
    @echo "Web release package created in release/web/"

# Create desktop release package
release-desktop: build-desktop
    @echo "Creating desktop release package..."
    mkdir -p release/desktop
    cp -r build/bin/* release/desktop/
    @echo "Desktop release package created in release/desktop/"

