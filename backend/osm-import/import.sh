#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f germany-latest.osm.pbf ]; then
  curl -L -o germany-latest.osm.pbf \
    https://download.geofabrik.de/europe/germany-latest.osm.pbf
fi

osmium extract \
  -b 6.5,47.9,13.4,51.6 \
  germany-latest.osm.pbf \
  -o mainfranken-clip.osm.pbf \
  --overwrite

osm2pgsql \
  --output=flex \
  --style=cafes.lua \
  --create \
  -d "postgresql://cofferide:change_me@localhost:5432/cofferide" \
  mainfranken-clip.osm.pbf

echo "Import abgeschlossen."
