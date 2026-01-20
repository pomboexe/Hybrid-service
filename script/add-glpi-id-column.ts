import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addGlpiIdColumn() {
  try {
    console.log("Adding glpi_id column to tickets table...");
    
    await db.execute(sql`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS glpi_id INTEGER;
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tickets_glpi_id ON tickets(glpi_id);
    `);
    
    console.log("✓ Column glpi_id added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding column:", error);
    process.exit(1);
  }
}

addGlpiIdColumn();
