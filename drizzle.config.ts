import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// AC-X06: toda migración es un archivo versionado en el repositorio. Nunca `push` contra una base
// con datos.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
