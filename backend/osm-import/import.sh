#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# --------------------------------------------------------------------------
# 1. Deutschland-Extrakt laden (~4 GB). Wir nehmen bewusst "Germany" statt
#    nur "Bayern": ein 200km-Radius um Würzburg reicht über die Grenzen nach
#    Hessen, Thüringen und Baden-Württemberg hinein. Mit dem Bayern-Extrakt
#    allein würden diese Randgebiete fehlen.
# --------------------------------------------------------------------------
if [ ! -f germany-latest.osm.pbf ]; then
  curl -L -o germany-latest.osm.pbf \
    https://download.geofabrik.de/europe/germany-latest.osm.pbf
fi

# --------------------------------------------------------------------------
# 2. Auf eine Bounding Box um Würzburg (49.7913, 9.9534) mit ca. 200km
#    Radius zuschneiden. Das reduziert die Datei von ~4 GB auf wenige
#    hundert MB und macht den Import schnell und wiederholbar.
#    Benötigt osmium-tool (z.B. `apt install osmium-tool` / `brew install osmium-tool`).
# --------------------------------------------------------------------------
osmium extract \
  -b 6.5,47.9,13.4,51.6 \
  germany-latest.osm.pbf \
  -o mainfranken-clip.osm.pbf \
  --overwrite

# --------------------------------------------------------------------------
# 3. Import in PostGIS. --create legt die Tabelle laut cafes.lua neu an
#    (bei einem Re-Import also vorher die Tabelle droppen oder --append
#    verwenden, siehe README).
# --------------------------------------------------------------------------
osm2pgsql \
  --output=flex \
  --style=cafes.lua \
  --create \
  -d "postgresql://cofferide:change_me@localhost:5432/cofferide" \
  mainfranken-clip.osm.pbf

echo "Import abgeschlossen."
