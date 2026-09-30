import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import { gpx } from "@tmcw/togeojson";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import buffer from "@turf/buffer";

const API_URL = "http://localhost:4000/api/cafes";

// Annahme: OSM-Werte des Tags diet:vegan
const VEGAN_LABEL = {
  only: "Rein vegan",
  yes: "Vegane Optionen",
  limited: "Wenige vegane Optionen",
};

// Sortierreihenfolge der Cafés mit veganen Optionen
const VEGAN_RANK = { only: 0, yes: 1, limited: 2 };

// Namen, die als "unbekannt" gelten und ausgeblendet werden
const UNKNOWN_NAMES = ["unbekannt", "unbenannt", "unnamed"];

const cupSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3v2M12 3v2"/></svg>`;

function createPin(onlyVegan) {
  return L.divIcon({
    className: "",
    html: `<div class="pin${onlyVegan ? " pin--only" : ""}">${cupSvg}</div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}

const PIN_ONLY = createPin(true);
const PIN_DEFAULT = createPin(false);

const ROUTE_STYLE = {
  className: "route-line",
  weight: 5,
  lineCap: "round",
  lineJoin: "round",
};

const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;

function usePrefersDark() {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark;
}

// Cafés ohne aussagekräftigen Namen oder mit "vegan: no" werden nicht angezeigt
function isShown(cafe) {
  const name = cafe.name?.trim().toLowerCase();
  if (!name || UNKNOWN_NAMES.includes(name)) return false;
  return cafe.vegan !== "no";
}

function VeganBadge({ value }) {
  if (!value) return null;
  return (
    <span className={`badge${value === "only" ? " badge--only" : ""}`}>
      {VEGAN_LABEL[value] ?? `Vegan: ${value}`}
    </span>
  );
}

function CafeGroup({ title, cafes, onSelect }) {
  if (cafes.length === 0) return null;
  return (
    <section>
      <h2 className="group__title">
        {title} ({cafes.length})
      </h2>
      <ul className="group">
        {cafes.map((cafe) => (
          <li key={cafe.id}>
            <button
              type="button"
              className="item"
              onClick={() => onSelect(cafe)}
            >
              <span className="item__name">{cafe.name}</span>
              <VeganBadge value={cafe.vegan} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function App() {
  const [routeData, setRouteData] = useState(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [cafes, setCafes] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [map, setMap] = useState(null);

  const fileInputRef = useRef(null);
  const markerRefs = useRef({});
  const dark = usePrefersDark();

  // Cafés mit veganen Optionen (nach Relevanz sortiert) vs. ohne Angabe
  const veganCafes = useMemo(
    () =>
      cafes
        .filter((c) => c.vegan in VEGAN_RANK)
        .sort((a, b) => VEGAN_RANK[a.vegan] - VEGAN_RANK[b.vegan]),
    [cafes],
  );
  const otherCafes = useMemo(
    () => cafes.filter((c) => !(c.vegan in VEGAN_RANK)),
    [cafes],
  );

  // Karte nach dem Upload auf die Route zoomen (Panel wird eingerechnet)
  useEffect(() => {
    if (!map || !routeData) return;
    const bounds = L.geoJSON(routeData).getBounds();
    if (!bounds.isValid()) return;
    const desktop = window.innerWidth > 720;
    map.fitBounds(bounds, {
      paddingTopLeft: desktop ? [420, 48] : [32, 32],
      paddingBottomRight: desktop
        ? [48, 48]
        : [32, Math.round(window.innerHeight * 0.5)],
    });
  }, [map, routeData]);

  async function processFile(file) {
    if (!file) return;
    setStatus("loading");
    setErrorMessage("");
    setFileName(file.name);
    setCafes([]);

    try {
      const xmlDoc = new DOMParser().parseFromString(
        await file.text(),
        "text/xml",
      );
      const geoJson = gpx(xmlDoc);

      // Erste Linie nehmen – Waypoints (Points) würden buffer() sonst brechen
      const routeLine = geoJson.features.find((f) =>
        ["LineString", "MultiLineString"].includes(f.geometry?.type),
      );
      if (!routeLine) throw new Error("NO_TRACK");

      setRouteData(geoJson);
      setUploadCount((prev) => prev + 1);

      const corridor = buffer(routeLine, 0.5, { units: "kilometers" });
      const found = await fetchCafes(corridor);
      setCafes(
        found
          .map((cafe) => ({ ...cafe, vegan: cafe.vegan?.toLowerCase() }))
          .filter(isShown),
      );
      setStatus("done");
    } catch (err) {
      setErrorMessage(
        err.message === "NO_TRACK"
          ? "Die Datei enthält keine Route. Wähle eine GPX-Datei."
          : "Cafés konnten nicht geladen werden.",
      );
      setStatus("error");
    }
  }

  async function fetchCafes(corridor) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridor: corridor.geometry }),
    });
    if (!response.ok) {
      throw new Error(`Café-Abfrage fehlgeschlagen: ${response.status}`);
    }
    return response.json();
  }

  function handleFileChange(event) {
    processFile(event.target.files[0]);
    event.target.value = ""; // dieselbe Datei erneut wählbar
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    processFile(event.dataTransfer.files[0]);
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  function focusCafe(cafe) {
    if (!map) return;
    map.flyTo([cafe.lat, cafe.lon], Math.max(map.getZoom(), 16), {
      duration: 0.6,
    });
    markerRefs.current[cafe.id]?.openPopup();
  }

  const showDropzone = status === "idle" || status === "error";

  return (
    <div className="app">
      <aside className="panel" aria-label="Routenplaner">
        <header className="panel__head">
          <h1>coffeeride ☕🌱</h1>
          <p>Finde vegane Café-Stopps entlang deiner Route!</p>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          hidden
          onChange={handleFileChange}
        />

        {showDropzone && (
          <>
            <button
              type="button"
              className={`dropzone${dragging ? " dropzone--active" : ""}`}
              onClick={openPicker}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <strong>GPX-Datei auswählen</strong>
              <span>oder hierher ziehen</span>
            </button>
            {status === "error" && (
              <p className="message message--error" role="alert">
                {errorMessage}
              </p>
            )}
          </>
        )}

        {status === "loading" && (
          <p className="message" role="status">
            <span className="spinner" aria-hidden="true" />
            Suche Cafés entlang der Route …
          </p>
        )}

        {status === "done" && (
          <div className="result">
            <div className="result__bar">
              <div className="result__summary">
                <strong>
                  {cafes.length} {cafes.length === 1 ? "Café" : "Cafés"} auf der
                  Route
                </strong>
                <span className="result__file">{fileName}</span>
              </div>
              <button type="button" className="btn" onClick={openPicker}>
                Andere Route
              </button>
            </div>

            {cafes.length === 0 ? (
              <p className="message">
                Im Umkreis von 500 m um die Route wurde kein Café gefunden.
                Probiere eine andere Route.
              </p>
            ) : (
              <div className="list">
                <CafeGroup
                  title="Mit veganen Optionen"
                  cafes={veganCafes}
                  onSelect={focusCafe}
                />
                <CafeGroup
                  title="Ohne Angabe zu veganen Optionen"
                  cafes={otherCafes}
                  onSelect={focusCafe}
                />
              </div>
            )}
          </div>
        )}
      </aside>

      <MapContainer
        ref={setMap}
        center={[49.7913, 9.9534]}
        zoom={13}
        zoomControl={false}
        className="map"
      >
        <ZoomControl position="topright" />
        <TileLayer
          key={dark ? "dark" : "light"}
          url={`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`}
          subdomains="abcd"
          maxZoom={20}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {routeData && (
          <GeoJSON
            key={uploadCount}
            data={routeData}
            style={() => ROUTE_STYLE}
            filter={(feature) => feature.geometry.type !== "Point"}
          />
        )}
        {cafes.map((cafe) => (
          <Marker
            key={cafe.id}
            position={[cafe.lat, cafe.lon]}
            icon={cafe.vegan in VEGAN_RANK ? PIN_ONLY : PIN_DEFAULT}
            ref={(marker) => {
              if (marker) markerRefs.current[cafe.id] = marker;
            }}
          >
            <Popup>
              <div className="popup__name">{cafe.name}</div>
              <VeganBadge value={cafe.vegan} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
