-- Migration to add cancelled_dates column to schedule_slots table

ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS cancelled_dates JSONB NOT NULL DEFAULT '[]'::jsonb;
