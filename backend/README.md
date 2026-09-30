# Cofferide Backend — OSM-Café-Datenbank

## Warum dieser Aufbau

Bisher hat das Frontend direkt Overpass angefragt. Overpass ist eine
öffentliche, geteilte Infrastruktur ohne Verfügbarkeitszusage — daher
die Aussetzer/Langsamkeit. Der neue Aufbau entfernt diese
Außenabhängigkeit komplett aus dem Ablauf, den ein Nutzer live erlebt:

```
Vorher:  Browser --(live)--> Overpass-API (öffentlich, unzuverlässig)

Nachher: Browser --> eigener Node-Server --> eigene PostGIS-DB
                                                  ^
                          (einmalig / periodisch mit OSM-Daten befüllt)
```

Die OSM-Rohdaten werden nicht mehr bei jeder Nutzeranfrage abgefragt,
sondern per Batch-Import in eine eigene Datenbank geladen. Die App
fragt zur Laufzeit ausschließlich diese eigene DB ab — keine
Netzwerkabhängigkeit nach außen mehr im kritischen Pfad.

## Die drei Bausteine

1. **`docker-compose.yml`** — startet eine PostgreSQL-Instanz mit der
   PostGIS-Erweiterung lokal. PostGIS ist nötig, weil normales
   PostgreSQL keine geometrischen Funktionen wie "liegt Punkt X
   innerhalb von Polygon Y" kennt.

2. **`osm-import/`** — der einmalige (bzw. periodisch wiederholte)
   Import-Vorgang:
   - `import.sh` lädt den Deutschland-Extrakt und schneidet ihn per
     `osmium` auf eine Bounding Box um Würzburg (~200 km Radius) zu.
     Bewusst der Deutschland-Extrakt statt nur Bayern, weil der
     200-km-Radius über Landesgrenzen nach Hessen, Thüringen und
     Baden-Württemberg reicht.
   - `cafes.lua` ist die Filter-Konfiguration für `osm2pgsql`: von den
     Millionen Objekten in der Datei werden ausschließlich Nodes mit
     `amenity=cafe` in die Tabelle `cafes` übernommen.

3. **`src/`** — der Node/Express-Server, der bisher gefehlt hat:
   - `db.js`: Connection Pool zur PostGIS-DB.
   - `routes/cafes.js`: der Endpunkt `POST /api/cafes`, der das vom
     Frontend bereits berechnete Korridor-Polygon entgegennimmt und
     per `ST_Intersects` alle Cafés darin aus der DB liest.
   - `index.js`: Express-Setup (CORS, JSON-Parsing, Server-Start).

`frontend-snippet.md` zeigt, wie `fetchCafes` im bestehenden
`App.jsx` angepasst wird, damit es den neuen Server statt Overpass
anspricht.

## Setup — Schritt für Schritt

```bash
# 1. PostGIS starten
docker compose up -d

# 2. OSM-Daten importieren (benötigt osmium-tool und osm2pgsql lokal installiert)
cd osm-import
./import.sh
cd ..

# 3. Server-Abhängigkeiten installieren
npm install

# 4. .env anlegen
cp .env.example .env

# 5. Server starten
npm run dev
```

Danach läuft der Server unter `http://localhost:4000`, der Endpunkt
`http://localhost:4000/api/cafes` nimmt POST-Requests mit einem
`corridor`-Polygon entgegen. `http://localhost:4000/health` dient als
einfacher Erreichbarkeits-Check.

## Offene Punkte, die du selbst entscheiden solltest

- **Re-Import-Frequenz**: `import.sh` legt die Tabelle mit `--create`
  neu an. Für regelmäßige Updates (z.B. monatlich) müsstest du vorher
  die alte Tabelle droppen oder auf `osm2pgsql --append` mit
  Änderungsdateien (`osmupdate`) umsteigen — für den aktuellen Bedarf
  reicht ein manueller Re-Import erstmal.
- **Produktions-Deployment**: `docker-compose.yml` ist aktuell nur für
  lokale Entwicklung gedacht (Passwort im Klartext, kein Backup).
  Für einen echten Server müsste das noch abgesichert werden.
- **`osmium-tool` und `osm2pgsql`** sind vorausgesetzte Programme auf
  deinem System — nicht Teil dieses Node-Projekts. Sag Bescheid, wenn
  du Hilfe bei der Installation brauchst (abhängig von deinem OS).
