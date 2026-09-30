import express from "express";
import cors from "cors";
import cafesRouter from "./routes/cafes.js";

const app = express();

// CORS: erlaubt, dass dein Vite-Frontend (anderer Port, z.B. 5173)
// den Server (Port 4000) überhaupt anfragen darf.
app.use(cors());

// Parst eingehende JSON-Bodies (z.B. das corridor-Polygon vom Frontend).
app.use(express.json({ limit: "1mb" }));

app.use("/api", cafesRouter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Cofferide-Server läuft auf Port ${port}`);
});
