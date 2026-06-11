-- Migration: Add round_number to student_logs for 4-round attendance system
-- Each lesson session can have up to 4 attendance rounds per student

-- 1. Add round_number column (default 1 for backward compatibility)
ALTER TABLE student_logs
  ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1;

-- 2. Add check constraint to enforce valid round values (1-4)
ALTER TABLE student_logs
  ADD CONSTRAINT student_logs_round_number_check
  CHECK (round_number >= 1 AND round_number <= 4);

-- 3. Add unique constraint: same student can only be recorded once per round per session
ALTER TABLE student_logs
  ADD CONSTRAINT student_logs_session_student_round_unique
  UNIQUE (lesson_session_id, student_id, round_number);
