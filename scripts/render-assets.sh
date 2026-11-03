#!/bin/zsh
set -euo pipefail

ROOT=${0:A:h:h}
DESIGN=$ROOT/design
IOS=$ROOT/App_Resources/iOS/Assets.xcassets

imageset() {
	local name=$1 svg=$2 width=$3
	local set=$IOS/$name.imageset
	mkdir -p "$set"
	rsvg-convert -w $width $svg -o $set/$name@3x.png
	rsvg-convert -w $(( width * 2 / 3 )) $svg -o $set/$name@2x.png
	cat > $set/Contents.json <<JSON
{
  "images": [
    { "idiom": "universal", "filename": "$name@2x.png", "scale": "2x" },
    { "idiom": "universal", "filename": "$name@3x.png", "scale": "3x" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
JSON
}

imageset jolt_mark $DESIGN/jolt-mark.svg 240

"$ROOT/scripts/render-ios-icon.sh"
rsvg-convert $DESIGN/studio-environment.svg -o $ROOT/App_Resources/iOS/studio_environment.png
rsvg-convert $DESIGN/air-particle.svg -o $ROOT/App_Resources/iOS/air_particle.png
rsvg-convert $DESIGN/cabin-screen.svg -o $ROOT/App_Resources/iOS/cabin_screen.png
