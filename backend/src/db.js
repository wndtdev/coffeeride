import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

// Ein Pool statt einer einzelnen Verbindung: Express bedient mehrere
// Requests gleichzeitig, jeder Request "leiht" sich kurz eine Verbindung
// aus dem Pool statt eine neue TCP-Verbindung zur DB aufzubauen.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
