import { Router } from "express";
import { pool } from "../db.js";

console.log("!!! CAFES-ROUTE GELADEN - TESTMARKIERUNG 12345 !!!");

const router = Router();

router.post("/cafes", async (req, res) => {
  const { corridor } = req.body;

  if (!corridor || corridor.type !== "Polygon") {
    return res
      .status(400)
      .json({ error: "corridor (GeoJSON Polygon) fehlt oder ist ungültig" });
  }

  console.log("Empfangener corridor:", JSON.stringify(corridor));

  try {
    const { rows } = await pool.query(
      `
      SELECT
        node_id AS id,
        name,
        cuisine,
        vegan,
        vegetarian,
        ST_X(ST_Transform(geom, 4326)) AS lon,
        ST_Y(ST_Transform(geom, 4326)) AS lat
      FROM cafes
      WHERE ST_Intersects(
        geom,
        ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 3857)
      )
      `,
      [JSON.stringify(corridor)],
    );

    console.log("Anzahl gefundener Zeilen:", rows.length);

    res.json(rows);
  } catch (err) {
    console.error("Fehler bei Café-Abfrage:", err);
    res.status(500).json({ error: "Café-Abfrage fehlgeschlagen" });
  }
});

export default router;
