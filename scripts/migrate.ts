import "dotenv/config";
import fs from "fs";
import path from "path";
import { pool } from "../src/lib/db/client";

/**
 * Apply a single named migration file, e.g.
 *   npx tsx scripts/migrate.ts 0003_add_course_taxonomy.sql
 *
 * Deliberately takes an explicit filename rather than applying every .sql file
 * in order: 0001_init.sql creates types and tables unconditionally, so it is
 * only safe to run against an empty database — replaying the whole folder would
 * fail on an already-migrated one.
 */
async function main() {
  const name = process.argv[2];
  if (!name) {
    const dir = path.join(__dirname, "..", "src", "lib", "db", "migrations");
    console.error("Usage: npx tsx scripts/migrate.ts <migration-file.sql>\n");
    console.error("Available migrations:");
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      console.error("  " + f);
    }
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "..", "src", "lib", "db", "migrations", name);
  if (!fs.existsSync(sqlPath)) {
    console.error(`No such migration: ${name}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pool.query(sql);
  console.log(`✓ Applied ${name}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
