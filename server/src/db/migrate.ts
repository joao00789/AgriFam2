import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl === "pglite:memory") {
	throw new Error("DATABASE_URL do PostgreSQL precisa estar configurada para aplicar migrations.");
}

const client = postgres(databaseUrl, { ssl: "require", prepare: false });
await migrate(drizzle(client, { schema }), { migrationsFolder: "./src/db/migrations-pg" });
await client.end();
console.log("Migrações aplicadas com sucesso.");
