# Anpassung im Frontend

Ersetzt in `App.jsx` die bisherige `fetchCafes`-Funktion (die Overpass
anfragt) durch einen Aufruf des eigenen Servers. Die Bbox-Berechnung
entfällt, stattdessen schickst du den bereits vorhandenen `corridor`
(das Ergebnis von `buffer(routeLine, ...)`) direkt mit — die Filterung
"liegt der Punkt im Polygon" übernimmt jetzt PostGIS.

```js
async function fetchCafes(corridor) {
  const response = await fetch("http://localhost:4000/api/cafes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ corridor: corridor.geometry }),
  });

  if (!response.ok) {
    throw new Error(`Café-Abfrage fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}
```

Und im Aufruf in `handleFileChange`:

```js
const corridor = buffer(routeLine, 0.5, { units: "kilometers" });

// bboxSearch + booleanPointInPolygon-Filterung entfallen komplett,
// das übernimmt jetzt die SQL-Query im Server:
const cafesOnRoute = await fetchCafes(corridor);

setCafes(cafesOnRoute);
```

Die Imports `bbox`, `point` und `booleanPointInPolygon` aus `@turf/*`
werden dadurch im Frontend überflüssig — die geometrische Prüfung
passiert jetzt einmalig serverseitig statt clientseitig für jeden
einzelnen Punkt.
