#!/bin/zsh
set -euo pipefail

ROOT=${0:A:h:h}
SOURCE=$ROOT/design/jolt-drive-icon.png
ASSETS=$ROOT/App_Resources/iOS/Assets.xcassets

mkdir -p "$ASSETS/drive_icon.imageset"
sips -s format png -z 1024 1024 "$SOURCE" --out "$ASSETS/AppIcon.appiconset/ItunesArtwork@2x.png" >/dev/null
sips -s format png -z 492 492 "$SOURCE" --out "$ASSETS/drive_icon.imageset/drive_icon.png" >/dev/null
cat > "$ASSETS/drive_icon.imageset/Contents.json" <<'JSON'
{
  "images": [{ "idiom": "universal", "filename": "drive_icon.png", "scale": "3x" }],
  "info": { "author": "xcode", "version": 1 }
}
JSON
