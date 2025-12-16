# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM golang:1.22-alpine AS backend-builder

WORKDIR /app

# Install build dependencies for static compilation
RUN apk add --no-cache gcc musl-dev sqlite-dev sqlite-static

# Copy go mod files
COPY backend/go.* ./

# Download dependencies
RUN go mod download

# Copy backend source
COPY backend/ ./

# Build backend with static linking
# This produces a fully static binary that works on any Linux
RUN CGO_ENABLED=1 \
    go build \
    -ldflags="-linkmode external -extldflags '-static'" \
    -o server \
    ./cmd/server

# Stage 3: Runtime image
# Use standard Ubuntu for ARM/general compatibility
# For NVIDIA GPU support, use: nvidia/cuda:12.2.0-runtime-ubuntu22.04
FROM ubuntu:25.10

# Use build arguments to detect architecture
ARG TARGETARCH

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Try to install Intel drivers if available (x86_64 only)
RUN apt-get update && \
    (apt-get install -y intel-media-va-driver-non-free libva-drm2 vainfo intel-opencl-icd || true) && \
    rm -rf /var/lib/apt/lists/*

# Download and install FFmpeg static build based on architecture
# This build includes: libx265, libsvtav1, libaom-av1, and all major codecs
RUN if [ "$TARGETARCH" = "arm64" ]; then \
        FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz"; \
    else \
        FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"; \
    fi && \
    echo "Downloading FFmpeg for ${TARGETARCH} from ${FFMPEG_URL}" && \
    wget -O /tmp/ffmpeg.tar.xz "${FFMPEG_URL}" && \
    mkdir -p /tmp/ffmpeg && \
    tar -xf /tmp/ffmpeg.tar.xz -C /tmp/ffmpeg --strip-components=1 && \
    cp /tmp/ffmpeg/bin/ffmpeg /usr/local/bin/ && \
    cp /tmp/ffmpeg/bin/ffprobe /usr/local/bin/ && \
    chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe && \
    rm -rf /tmp/ffmpeg /tmp/ffmpeg.tar.xz && \
    echo "FFmpeg installed. Verifying encoders..." && \
    ffmpeg -version && \
    echo "" && \
    echo "Available AV1 encoders:" && \
    ffmpeg -encoders 2>/dev/null | grep -i av1 || echo "No AV1 encoders found"

# Create app directory
WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/server ./

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./web

# Create necessary directories
RUN mkdir -p /data /output /app/config /app/config/database

# Expose port
EXPOSE 8080

# Set environment variables
ENV GIN_MODE=release \
    PORT=8080 \
    DATA_PATH=/data \
    OUTPUT_PATH=/output \
    CONFIG_PATH=/app/config \
    DATABASE_PATH=/app/config/database/ffforge.db \
    MAX_CONCURRENT_TASKS=2 \
    ENABLE_GPU=true \
    FFMPEG_PATH=/usr/local/bin/ffmpeg \
    FFPROBE_PATH=/usr/local/bin/ffprobe

# Note: Users can override FFMPEG_PATH and FFPROBE_PATH via environment variables
# or mount custom binaries to /usr/local/bin/ffmpeg and /usr/local/bin/ffprobe

# Run the application
CMD ["./server"]

