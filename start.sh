#!/bin/sh
# Starts the probe app. If Komari env vars are set, also downloads (once) and
# runs the official Komari monitoring agent alongside it. Secrets come only
# from the platform's environment variables - never from this repository.
if [ -n "$KOMARI_ENDPOINT" ] && [ -n "$KOMARI_AUTO_DISCOVERY" ]; then
  AGENT=/tmp/komari-agent
  if [ ! -x "$AGENT" ]; then
    curl -fsSL --max-time 60 -o "$AGENT" https://github.com/komari-monitor/komari-agent/releases/latest/download/komari-agent-linux-amd64 \
      || wget -q -O "$AGENT" https://github.com/komari-monitor/komari-agent/releases/latest/download/komari-agent-linux-amd64
    chmod +x "$AGENT" 2>/dev/null
  fi
  if [ -x "$AGENT" ]; then
    echo "starting komari-agent -> $KOMARI_ENDPOINT"
    "$AGENT" -e "$KOMARI_ENDPOINT" --auto-discovery "$KOMARI_AUTO_DISCOVERY" > /tmp/komari.log 2>&1 &
  else
    echo "komari-agent download failed, continuing without it"
  fi
fi
exec node server.js
