import express from "express";
import cors from "cors";
import cafesRouter from "./routes/cafes.js";

const app = express();

app.use(cors());

app.use(express.json({ limit: "1mb" }));

app.use("/api", cafesRouter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Coffeeride-Server läuft auf Port ${port}`);
});
