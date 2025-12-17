# FFForge

A modern web application for video transcoding with H.265/AV1 encoding support.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](Dockerfile)

## Features

- Web-based file browser
- Batch processing with real-time progress
- Hardware acceleration (NVIDIA, Intel QSV, AMD) (WIP)
- Customize any FFmpeg command arguments
- Preset management
- Task queue system

## Roadmap
- [x] File permission management
- [ ] NVIDIA GPU Transcoder confirm
- [ ] Intel QSV / NVIDIA Preset
- [ ] Homepage refactor
- [ ] Desktop application support
- [ ] Remote agent transcoding


## Quick Start

### Docker (Recommended)

```
services:
  ffforge:
    container_name: ffforge
    image: channinghe/ffforge:latest
    restart: unless-stopped
    ports:
      - "38110:8080"
    volumes:
      - /your/media/path:/data
      # Mount output directory
      - ./ffforge/output:/output
      # Mount config directory
      - ./ffforge/config:/app/config
    environment:
      - PORT=8080
      # Paths
      - DATA_PATH=/data
      - OUTPUT_PATH=/output
      - CONFIG_PATH=/app/config
      - DATABASE_PATH=/app/config/database/ffforge.db
      - CORS_ORIGINS=http://localhost:3000
    # ============ intel gpu configuration ============
    # if you want to use Intel GPU, uncomment the following:
    # devices:
    #   - /dev/dri/renderD128:/dev/dri/renderD128
    
    # ============ nvidia gpu configuration ============
    # if you want to use NVIDIA GPU, uncomment the following:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu, video, compute, utility]
networks:
  ffweb-network:
    driver: bridge
```


```bash
docker-compose up -d
# Access the web interface
open http://localhost:38110
```

### Local Development

```bash
# Backend
cd backend
go run cmd/server/main.go

# Frontend
cd frontend
npm install
npm run dev
```

## Configuration

Mount your video files to `/data` and set output directory to `/output`:

```yaml
volumes:
  - ./data:/data
  - ./output:/output
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `DATA_PATH` - Input files directory (default: /data)
- `OUTPUT_PATH` - Output files directory (default: /output)
- `MAX_CONCURRENT_TASKS` - Maximum concurrent transcoding tasks (default: 2)

## ScreenShoot
![](./doc/PageVT.jpg)
![](./doc/PagePM.jpg)

## Hardware Acceleration

### Intel QSV

Works out of the box with the standard Docker image.

### NVIDIA/AMD (WIP)

## Tech Stack

- **Backend**: Go 1.22, Gin, SQLite
- **Frontend**: React 18, TypeScript, TailwindCSS
- **FFmpeg**: Latest with [jellyfin-ffmpeg](https://github.com/jellyfin/jellyfin-ffmpeg)

## License

GNU General Public License v3.0 - see [LICENSE](LICENSE) file for details.

This project uses FFmpeg, which is licensed under GPL v2 or later. The static FFmpeg  are provided by [jellyfin-ffmpeg](https://github.com/jellyfin/jellyfin-ffmpeg)