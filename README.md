# coffeeride ☕🌱

[coffeeridedemo](https://github.com/wndtdev/coffeeride/etc/demo.gif)

A café-stop planning tool for road cyclists: upload a GPX and discover cafés along the way, including information about vegan options.

## Background

Everytime I ride alone I'll pick a route and just ride it. But once I ride with some friends they always know some nice spots where we can stop for a café. With this project I wanted to solve two of my problems:

1. I was scrolling through my GPX route created with komoot while I simultaniously looked for café options in Google maps, jumping from tab to tab
2. I can directly identify cafés that have been tagged by others with the vegan labels.

**Please note** that this is first and foremost a personal learning project which means most of the code was written by AI and I followed up by giving instructions about the app's functional requirements.

## Features (Current MVP)

- Upload GPX files
- Find cafés along the route using OpenStreetMap data
- Display the route and café markers on a map (vegan option cafés are highlighted)
- Browse a café list grouped by vegan options
- Supports light and dark mode

**Planned features:** Rating system / ranking (e.g., cyclist-friendliness), random route generator based on café choice.

## Architecture

| Component | Technologies                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Frontend  | React 19, Vite, react-leaflet, GPX parsing with `@tmcw/togeojson`, geospatial calculations with Turf.js, CARTO map tiles |
| Backend   | Node.js with Express (`pg`, `cors`, `dotenv`)                                                                            |
| Database  | PostgreSQL 16 with PostGIS 3.4 (Docker)                                                                                  |
| Data      | OpenStreetMap import using `osm2pgsql` (Geofabrik extract)                                                               |

The public Overpass API could not reliably handle the required queries. To address this, OpenStreetMap data is imported into a local PostGIS database and queried through the project's own backend.

## Prerequisites

- [Node.js](https://nodejs.org/) (a recent LTS version; minimum: 20.19+, 22.12+)
- [Docker](https://www.docker.com/) with Docker Compose
- For importing data: `curl`, [`osmium-tool`](https://osmcode.org/osmium-tool/), and [`osm2pgsql`](https://osm2pgsql.org/) with Flex output support
- A Bash environment for `import.sh`: Linux, macOS, or **WSL** on Windows
- Sufficient disk space: the import downloads the Geofabrik Germany extract, which is several gigabytes in size (~4,5+ GB)
- A [CARTO](https://carto.com/basemaps/apikey/) API key for map tiles

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/wndtdev/coffeeride.git
cd coffeeride
```

### 2. Start the database

```bash
cd backend
docker compose up -d
```

This starts PostGIS on port `5432` with the following credentials:

- **Database:** `coffeeride`
- **Username:** `coffeeride`
- **Password:** `change_me`

The database files are stored in a Docker volume and persist across restarts.

> The password `change_me` is intended for local development only. If you change it in `docker-compose.yml`, update it in `.env` and `osm-import/import.sh` as well. The database name and credentials are initialized only when the volume is first created. Subsequent changes require removing the volume with `docker compose down -v` and performing a fresh import.

### 3. Import OpenStreetMap data

The import script must be executed in Bash. For example:

```bash
cd /mnt/c/Users/<name>/coffeeride/backend/osm-import
```

Install the required tools:

```bash
sudo apt install curl osmium-tool osm2pgsql
```

Then run the import script from the `backend/osm-import` directory:

```bash
bash import.sh
```

The script performs the following steps:

1. Downloads `germany-latest.osm.pbf` from Geofabrik, if the file does not already exist.
2. Extracts a smaller area using the bounding box defined in `import.sh`. The area is currently set to the area around Würzburg. Feel free to change it.
3. Imports cafés and their names, cuisine types, vegan and vegetarian options, and opening hours into the `cafes` table.

### 4. Configure and start the backend

```bash
cd backend
npm install
npm start
```

Configure the `.env` file as follows:

| Variable       | Description                                | Default value                                                 |
| -------------- | ------------------------------------------ | ------------------------------------------------------------- |
| `DATABASE_URL` | Connection string for the PostGIS database | `postgresql://coffeeride:change_me@localhost:5432/coffeeride` |
| `PORT`         | Backend server port                        | `4000`                                                        |

### 5. Configure and start the frontend

Navigate to the frontend directory and install its dependencies:

```bash
cd frontend
npm install
```

Create a file named `frontend/.env.local` with the following content:

| Variable             | Description                                            | Default value                     |
| -------------------- | ------------------------------------------------------ | --------------------------------- |
| `VITE_CARTO_API_KEY` | [Generate it here](https://carto.com/basemaps/apikey/) | `-`                               |
| `VITE_API_URL`       | Backend server port                                    | `http://localhost:4000/api/cafes` |

Then start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Usage

1. Open the application in your browser.
2. Upload a GPX file containing your planned route. You can use this [sample](https://github.com/wndtdev/coffeeride/etc/sample.gpx).
3. View the route on the map, with nearby cafés displayed as markers.
4. Browse the café list to find places offering vegan options.

The available data covers only the imported geographic area. Routes outside this area will not return any cafés.

## Data Sources and Attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), provided via [Geofabrik](https://download.geofabrik.de/). Map tiles provided by CARTO.

[demolightmode](https://github.com/wndtdev/coffeeride/etc/demo_lightmode.png)
