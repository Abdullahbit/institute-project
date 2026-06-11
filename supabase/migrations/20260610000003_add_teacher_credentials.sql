-- Migration: Add email and password columns to teachers table
-- So admins can view teacher login credentials from the panel

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;
