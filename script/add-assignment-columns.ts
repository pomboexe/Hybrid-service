import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addAssignmentColumns() {
  try {
    console.log("Adding assignment columns to tickets table...");
    
    await db.execute(sql`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS assigned_to TEXT REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS transfer_request_to TEXT REFERENCES users(id);
    `);
    
    console.log("✓ Columns added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding columns:", error);
    process.exit(1);
  }
}

addAssignmentColumns();
