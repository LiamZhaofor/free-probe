#!/bin/sh
# Starts the probe app.
# Komari monitoring agent removed 2026-11-01 at the owner's request:
# its auto-discovery registration kept re-adding the node to the panel
# after every restart, even after the node was deleted there.
exec node server.js
