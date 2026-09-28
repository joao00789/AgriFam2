import postgres from "postgres";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não configurada. Copie server/.env.example para server/.env.");
}

const isTestDatabase = databaseUrl === "pglite:memory";

let db: PostgresJsDatabase<typeof schema>;

if (isTestDatabase) {
  const globalForDb = globalThis as typeof globalThis & {
    __agrifamPglite?: InstanceType<typeof import("@electric-sql/pglite").PGlite>;
    __agrifamDb?: PostgresJsDatabase<typeof schema>;
  };

  if (!globalForDb.__agrifamPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    globalForDb.__agrifamPglite = new PGlite();
  }

  if (!globalForDb.__agrifamDb) {
    const { drizzle } = await import("drizzle-orm/pglite");
    globalForDb.__agrifamDb = drizzle(globalForDb.__agrifamPglite, { schema }) as unknown as PostgresJsDatabase<
      typeof schema
    >;
  }

  db = globalForDb.__agrifamDb!;
} else {
  db = drizzlePostgres(postgres(databaseUrl, { ssl: "require", prepare: false }), { schema });
}

export { db };
