import "dotenv/config";
import fs from "fs";
import path from "path";
import { pool } from "../src/lib/db/client";

async function main() {
  const sqlPath = path.join(__dirname, "..", "src", "lib", "db", "migrations", "0002_add_profile_fields.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pool.query(sql);
  console.log("Migration 0002 applied successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
