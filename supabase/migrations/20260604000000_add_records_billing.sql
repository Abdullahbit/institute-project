-- Migrations for Student Progress & Evaluations API and Stripe billing integration

-- 1. Add subscription columns to the schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- 2. Create student_logs table
CREATE TABLE IF NOT EXISTS student_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  lesson_session_id UUID NOT NULL REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- 3. Create progress_reports table
CREATE TABLE IF NOT EXISTS progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  level_code TEXT NOT NULL,
  score_listening INTEGER NOT NULL CHECK (score_listening BETWEEN 0 AND 100),
  score_speaking INTEGER NOT NULL CHECK (score_speaking BETWEEN 0 AND 100),
  score_overall INTEGER NOT NULL CHECK (score_overall BETWEEN 0 AND 100),
  notes TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE student_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;

-- 5. Define multi-tenant school-isolation policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'student_logs' AND policyname = 'student_logs_school'
  ) THEN
    CREATE POLICY student_logs_school ON student_logs
      FOR ALL USING (school_id = public.user_school_id())
      WITH CHECK (school_id = public.user_school_id());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'progress_reports' AND policyname = 'progress_reports_school'
  ) THEN
    CREATE POLICY progress_reports_school ON progress_reports
      FOR ALL USING (school_id = public.user_school_id())
      WITH CHECK (school_id = public.user_school_id());
  END IF;
END
$$;

-- 6. Setup indices
CREATE INDEX IF NOT EXISTS idx_student_logs_school ON student_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_school ON progress_reports(school_id);
