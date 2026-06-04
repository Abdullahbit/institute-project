-- Migrations for Check-in, Push Notification and Substitute Requests

-- 1. Add checkin_at, checkout_at, and teacher_id columns to lesson_sessions
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS checkin_at TIMESTAMPTZ;
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ;
ALTER TABLE lesson_sessions ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;

-- 2. Add expo_push_token to profiles for notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- 3. Add audit_trail, log_date, and class_type columns to hour_logs
ALTER TABLE hour_logs ADD COLUMN IF NOT EXISTS audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE hour_logs ADD COLUMN IF NOT EXISTS log_date DATE;
ALTER TABLE hour_logs ADD COLUMN IF NOT EXISTS class_type TEXT CHECK (class_type IN ('group', 'private', 'online'));

-- 4. Create substitute_requests table
CREATE TABLE IF NOT EXISTS substitute_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  lesson_session_id UUID NOT NULL REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  requesting_teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  covering_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- 5. Enable Row Level Security and add policies for substitute_requests
ALTER TABLE substitute_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'substitute_requests' AND policyname = 'substitute_requests_school'
  ) THEN
    CREATE POLICY substitute_requests_school ON substitute_requests
      FOR ALL USING (school_id = public.user_school_id())
      WITH CHECK (school_id = public.user_school_id());
  END IF;
END
$$;
