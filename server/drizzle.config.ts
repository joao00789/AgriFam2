import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não configurada. Copie server/.env.example para server/.env.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
