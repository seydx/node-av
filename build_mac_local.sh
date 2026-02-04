#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILDER_DIR="$SCRIPT_DIR/externals/jellyfin-ffmpeg/builder"
BUILD_DIR="$BUILDER_DIR/build"

echo ""
echo "=== FFmpeg Local Build ==="
echo ""
echo "  1) Full build (clean + dependencies + FFmpeg)"
echo "  2) FFmpeg only (skip dependency builds)"
echo ""
read -rp "Choose [1/2]: " choice

case "$choice" in
    1)
        echo ""
        echo "=> Full build selected. Cleaning build + prefix directories..."
        rm -rf "$BUILD_DIR"
        sudo rm -rf /opt/ffbuild/prefix
        SKIP_BUILD=""
        ;;
    2)
        echo ""
        echo "=> FFmpeg-only build selected. Skipping dependencies..."
        SKIP_BUILD="--skip-build"
        ;;
    *)
        echo "Invalid choice."
        exit 1
        ;;
esac

# Ensure submodules are initialized
if [ ! -f "$SCRIPT_DIR/externals/jellyfin-ffmpeg/configure" ]; then
    echo "=> Initializing git submodules..."
    git -C "$SCRIPT_DIR" submodule update --init --recursive
fi

# Log everything to terminal and file
LOG_FILE="$SCRIPT_DIR/ffmpeg_build.log"
exec > >(tee "$LOG_FILE") 2>&1

# Ensure /opt/ffbuild exists with correct permissions
sudo mkdir -p /opt/ffbuild/prefix
sudo chown -R "$(whoami):staff" /opt/ffbuild
sudo chmod -R 755 /opt/ffbuild

cd "$SCRIPT_DIR"

# Apply FFmpeg patches (skips if already applied)
node scripts/patch-ffmpeg.js

cd "$BUILDER_DIR"

# Run Jellyfin build script
./buildmac.sh arm64 $SKIP_BUILD

# The build script uses /ffbuild/prefix but we need /opt/ffbuild/prefix
cd ..
make install DESTDIR="" prefix="/opt/ffbuild/prefix"

# Fix permissions after install
sudo chown -R "$(whoami):staff" /opt/ffbuild

cd "$SCRIPT_DIR"

# npm run build:native
