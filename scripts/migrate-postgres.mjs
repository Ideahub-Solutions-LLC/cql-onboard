import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL to your Neon Postgres connection string.");

const sql = neon(connectionString);
const migrationPath = fileURLToPath(new URL("../db/migrations/postgres/0001_init.sql", import.meta.url));
const migration = await readFile(migrationPath, "utf8");
for (const statement of migration.split(";").map((part) => part.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log("Postgres schema is ready.");
