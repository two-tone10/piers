#!/bin/bash
set -e

DEVICE_ID="B22839CA-D708-4E04-BE04-81A14ACA7375"
BUNDLE_ID="com.piers.app"

# Start Metro if not already running
if ! lsof -i :8081 -sTCP:LISTEN > /dev/null 2>&1; then
  echo "Starting Metro..."
  npx expo start &
  sleep 5
else
  echo "Metro already running."
fi

# Build
echo "Building..."
xcodebuild \
  -workspace ios/Piers.xcworkspace \
  -scheme Piers \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "id=$DEVICE_ID" \
  build 2>&1 | grep -E "error:|BUILD SUCCEEDED|BUILD FAILED"

# Find the built app
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/Piers-*/Build/Products/Debug-iphonesimulator -name "Piers.app" -maxdepth 1 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo "Build failed — app not found."
  exit 1
fi

# Boot simulator if needed
STATE=$(xcrun simctl list devices | grep "$DEVICE_ID" | grep -o "Booted\|Shutdown" | head -1)
if [ "$STATE" != "Booted" ]; then
  echo "Booting simulator..."
  xcrun simctl boot "$DEVICE_ID"
  sleep 4
fi
open -a Simulator

# Install and launch
echo "Installing..."
xcrun simctl install "$DEVICE_ID" "$APP_PATH"
echo "Launching..."
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID"
echo "Done."
