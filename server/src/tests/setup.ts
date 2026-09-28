import type { PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";

await migrate(db as unknown as PgliteDatabase<typeof schema>, {
	migrationsFolder: "./src/db/migrations-pg",
});
