-- Add assignment columns to tickets table
-- Run this SQL script directly in your PostgreSQL database

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS assigned_to TEXT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS transfer_request_to TEXT REFERENCES users(id);
