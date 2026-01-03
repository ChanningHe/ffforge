# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
# Use ci for reproducible builds, disable optional features for speed in ARM64/QEMU
RUN npm ci --prefer-offline --no-audit --progress=false

# Copy frontend source
COPY frontend/ ./

# Build frontend with version
RUN VITE_APP_VERSION=$(node -p "require('./package.json').version") npm run build

# Stage 2: Build backend
FROM golang:1.22-alpine AS backend-builder

WORKDIR /app

# Install build dependencies for static compilation
RUN apk add --no-cache gcc musl-dev sqlite-dev sqlite-static

# Copy go mod files
COPY go.* ./

# Download dependencies
RUN go mod download

# Copy backend source (internal, pkg, cmd)
COPY internal/ ./internal/
COPY pkg/ ./pkg/
COPY cmd/ ./cmd/

# Build backend with static linking
# This produces a fully static binary that works on any Linux
RUN CGO_ENABLED=1 \
    go build \
    -ldflags="-linkmode external -extldflags '-static'" \
    -o server \
    ./cmd/server

# Stage 3: Runtime image
FROM debian:13-slim@sha256:e711a7b30ec1261130d0a121050b4ed81d7fb28aeabcf4ea0c7876d4e9f5aca2

# Use build arguments to detect architecture
ARG TARGETARCH
ARG OS_VERSION=trixie
ARG PACKAGE_ARCH=${TARGETARCH}

# Set NVIDIA Transcoder environment variables
ENV NVIDIA_VISIBLE_DEVICES="all"
ENV NVIDIA_DRIVER_CAPABILITIES="compute,video,utility"

RUN apt-get update \
 && apt-get install --no-install-recommends --no-install-suggests --yes \
    ca-certificates \
    gnupg \
    xz-utils \
    curl \
    wget \
 && curl -fsSL https://repo.jellyfin.org/jellyfin_team.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/jellyfin.gpg \
 && cat <<EOF > /etc/apt/sources.list.d/jellyfin.sources
Types: deb
URIs: https://repo.jellyfin.org/debian
Suites: ${OS_VERSION}
Components: main
Architectures: ${PACKAGE_ARCH}
Signed-By: /etc/apt/keyrings/jellyfin.gpg
EOF

# Install Jellyfin FFmpeg and locales for UTF-8 support
RUN apt-get update \
 && apt-get install --no-install-recommends --no-install-suggests -y \
        jellyfin-ffmpeg7 \
        locales \
 && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
 && locale-gen \
 && rm -rf /tmp/* /var/lib/apt/lists/* /var/tmp/* /var/log/*

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

# Add Jellyfin FFmpeg to PATH
ENV PATH="/usr/share/jellyfin-ffmpeg:${PATH}"

# Set environment variables
ENV GIN_MODE=release \
    PORT=8080 \
    DATA_PATH=/data \
    OUTPUT_PATH=/output \
    CONFIG_PATH=/app/config \
    DATABASE_PATH=/app/config/database/ffforge.db \
    MAX_CONCURRENT_TASKS=2 \
    ENABLE_GPU=true \
    FFMPEG_PATH=/usr/share/jellyfin-ffmpeg/ffmpeg \
    FFPROBE_PATH=/usr/share/jellyfin-ffmpeg/ffprobe \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

# Note: Users can override FFMPEG_PATH and FFPROBE_PATH via environment variables
# or mount custom binaries to /usr/local/bin/ffmpeg and /usr/local/bin/ffprobe

# Run the application
CMD ["./server"]

# LABEL org.opencontainers.image.source=https://github.com/channinghe/ffforge
# LABEL org.opencontainers.image.description="FFForge"
# LABEL org.opencontainers.image.licenses=GPL-3.0