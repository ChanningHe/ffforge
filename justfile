# FFForge Build Tool
# Usage: just <command>

# Show available commands
default:
    @just --list

# Install all dependencies
install:
    @echo "Installing backend dependencies..."
    cd backend && go mod tidy
    @echo "Installing frontend dependencies..."
    cd frontend && npm install
    @echo "Done!"

# Clean build artifacts
clean:
    @echo "Cleaning build artifacts..."
    rm -rf backend/server
    rm -rf frontend/dist
    rm -rf desktop/build
    rm -rf backend/cmd/desktop/frontend
    @echo "Clean complete!"

# Run backend tests
test:
    @echo "Running backend tests..."
    cd backend && go test ./...

# ============ Web Version ============

# Run web version in development mode
dev-web:
    @echo "Starting web version..."
    @echo "Backend: http://localhost:8080"
    @echo "Frontend: http://localhost:3000"
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    (cd backend && go run cmd/server/main.go) &
    (cd frontend && npm run dev)

# Build web version
build-web:
    @echo "Building frontend..."
    cd frontend && npm run build
    @echo "Building backend..."
    cd backend && go build -o server cmd/server/main.go
    @echo "Web version built!"
    @echo "  Frontend: frontend/dist/"
    @echo "  Backend: backend/server"

# Run built web version
run-web:
    @echo "Starting web server..."
    cd backend && ./server

# ============ Desktop Version ============

# Run desktop version in development mode
dev-desktop:
    @echo "Starting desktop version with hot reload..."
    cd backend/cmd/desktop && ~/go/bin/wails dev

# Build desktop version (release)
build-desktop:
    @echo "Downloading FFmpeg for current platform..."
    ./scripts/download-ffmpeg.sh
    @echo "Building frontend..."
    cd frontend && npm run build
    @echo "Preparing desktop build..."
    rm -rf backend/cmd/desktop/frontend
    mkdir -p backend/cmd/desktop/frontend/dist
    cp -r frontend/dist/* backend/cmd/desktop/frontend/dist/
    @echo "Building desktop application..."
    cd backend/cmd/desktop && ~/go/bin/wails build
    @echo "Moving build artifacts..."
    rm -rf desktop/build
    mv backend/cmd/desktop/build desktop/
    rm -rf backend/cmd/desktop/frontend
    @echo "Bundling FFmpeg..."
    #!/usr/bin/env bash
    if [ "$(uname)" = "Darwin" ]; then \
        if [ -f backend/embed/ffmpeg/darwin/ffmpeg ]; then \
            mkdir -p desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg; \
            cp backend/embed/ffmpeg/darwin/ffmpeg backend/embed/ffmpeg/darwin/ffprobe desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/; \
            chmod +x desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/*; \
            echo "✓ FFmpeg bundled into app"; \
        fi \
    fi
    @echo "Desktop app built!"
    @ls -lh desktop/build/bin/

# Build desktop version (debug)
build-desktop-debug:
    @echo "Downloading FFmpeg for current platform..."
    ./scripts/download-ffmpeg.sh
    @echo "Building frontend..."
    cd frontend && npm run build
    @echo "Preparing desktop build..."
    rm -rf backend/cmd/desktop/frontend
    mkdir -p backend/cmd/desktop/frontend/dist
    cp -r frontend/dist/* backend/cmd/desktop/frontend/dist/
    @echo "Building desktop application (debug)..."
    cd backend/cmd/desktop && ~/go/bin/wails build -debug
    @echo "Moving build artifacts..."
    rm -rf desktop/build
    mv backend/cmd/desktop/build desktop/
    rm -rf backend/cmd/desktop/frontend
    @echo "Bundling FFmpeg..."
    #!/usr/bin/env bash
    if [ "$(uname)" = "Darwin" ]; then \
        if [ -f backend/embed/ffmpeg/darwin/ffmpeg ]; then \
            mkdir -p desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg; \
            cp backend/embed/ffmpeg/darwin/ffmpeg backend/embed/ffmpeg/darwin/ffprobe desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/; \
            chmod +x desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/*; \
            echo "✓ FFmpeg bundled into app"; \
        fi \
    fi
    @echo "Desktop app built!"
    @ls -lh desktop/build/bin/

# Build and run desktop version
run-desktop: build-desktop-debug
    @echo "Running desktop app..."
    open desktop/build/bin/ffforge-desktop.app

# Build desktop for all platforms  
build-desktop-all:
    @echo "Downloading FFmpeg for macOS..."
    ./scripts/download-ffmpeg.sh darwin
    @echo "Downloading FFmpeg for Windows..."
    ./scripts/download-ffmpeg.sh windows
    @echo "Building frontend..."
    cd frontend && npm run build
    @echo "Preparing desktop build..."
    rm -rf backend/cmd/desktop/frontend
    mkdir -p backend/cmd/desktop/frontend/dist
    cp -r frontend/dist/* backend/cmd/desktop/frontend/dist/
    @echo "Building for macOS..."
    cd backend/cmd/desktop && ~/go/bin/wails build -platform darwin/universal
    @echo "Building for Windows..."
    cd backend/cmd/desktop && ~/go/bin/wails build -platform windows/amd64
    @echo "Moving build artifacts..."
    rm -rf desktop/build
    mv backend/cmd/desktop/build desktop/
    rm -rf backend/cmd/desktop/frontend
    @echo "Bundling FFmpeg for macOS..."
    #!/usr/bin/env bash
    if [ -f backend/embed/ffmpeg/darwin/ffmpeg ]; then \
        mkdir -p desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg; \
        cp backend/embed/ffmpeg/darwin/ffmpeg backend/embed/ffmpeg/darwin/ffprobe desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/; \
        chmod +x desktop/build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/*; \
        echo "✓ macOS FFmpeg bundled"; \
    fi
    @echo "Bundling FFmpeg for Windows..."
    #!/usr/bin/env bash
    if [ -f backend/embed/ffmpeg/windows/ffmpeg.exe ]; then \
        mkdir -p desktop/build/bin/ffmpeg; \
        cp backend/embed/ffmpeg/windows/ffmpeg.exe backend/embed/ffmpeg/windows/ffprobe.exe desktop/build/bin/ffmpeg/; \
        echo "✓ Windows FFmpeg copied"; \
    fi
    @echo "All builds complete!"
    @ls -lh desktop/build/bin/

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
    cd backend && go fmt ./...
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
    cp backend/server release/web/
    cp docker-compose.yaml release/web/
    cp README.md release/web/
    @echo "Web release package created in release/web/"

# Create desktop release package
release-desktop: build-desktop
    @echo "Creating desktop release package..."
    mkdir -p release/desktop
    cp -r desktop/build/bin/* release/desktop/
    @echo "Desktop release package created in release/desktop/"

