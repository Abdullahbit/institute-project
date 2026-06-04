-- Institute Management Platform — initial schema (PDF rules)
-- All IDs are UUIDs, snake_case columns, UTC timestamps, school_id on every table.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schools (multi-tenant root)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- Profiles linked to Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
  active_class_count INT NOT NULL DEFAULT 0,
  monthly_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  level_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  student_id UUID NOT NULL REFERENCES students(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  UNIQUE (class_id, student_id)
);

CREATE TABLE schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  room_name TEXT NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'substitute_needed')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  schedule_slot_id UUID NOT NULL REFERENCES schedule_slots(id),
  session_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  student_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE hour_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  lesson_session_id UUID REFERENCES lesson_sessions(id),
  hours NUMERIC(6, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  type TEXT NOT NULL CHECK (
    type IN ('late_check_in', 'substitute_request', 'no_show', 'hour_approval', 'other')
  ),
  teacher_id UUID REFERENCES teachers(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  CONSTRAINT invitation_expires_within_72h CHECK (
    expires_at <= created_at + INTERVAL '72 hours'
  )
);

CREATE INDEX idx_profiles_school ON profiles(school_id);
CREATE INDEX idx_teachers_school ON teachers(school_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_schedule_slots_school ON schedule_slots(school_id);
CREATE INDEX idx_alerts_school ON alerts(school_id);
CREATE INDEX idx_lesson_sessions_date ON lesson_sessions(school_id, session_date);

-- RLS: enable on every table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Helper: current user's school from JWT
CREATE OR REPLACE FUNCTION public.user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Schools: users see only their school
CREATE POLICY schools_select ON schools
  FOR SELECT USING (id = public.user_school_id());

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (school_id = public.user_school_id());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid() AND school_id = public.user_school_id());

CREATE POLICY teachers_school ON teachers
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

CREATE POLICY students_school ON students
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

CREATE POLICY classes_school ON classes
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

CREATE POLICY class_enrollments_school ON class_enrollments
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

CREATE POLICY schedule_slots_school ON schedule_slots
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

CREATE POLICY lesson_sessions_school ON lesson_sessions
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

CREATE POLICY hour_logs_school ON hour_logs
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

CREATE POLICY alerts_school ON alerts
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

CREATE POLICY invitations_school ON invitations
  FOR ALL USING (school_id = public.user_school_id())
  WITH CHECK (school_id = public.user_school_id());

-- Seed pilot school (Bright Minds)
INSERT INTO schools (id, name, subdomain)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Bright Minds Dil Okulu',
  'brightminds'
);

INSERT INTO teachers (school_id, full_name, branch, status, active_class_count, monthly_hours) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Ayşe Kaya', 'İngilizce', 'active', 22, 86),
  ('a0000000-0000-4000-8000-000000000001', 'Mehmet Demir', 'Almanca', 'active', 18, 72),
  ('a0000000-0000-4000-8000-000000000001', 'Zeynep Çelik', 'İngilizce', 'on_leave', 0, 48),
  ('a0000000-0000-4000-8000-000000000001', 'Ali Şahin', 'Fransızca', 'active', 14, 56),
  ('a0000000-0000-4000-8000-000000000001', 'Fatma Yıldız', 'İspanyolca', 'active', 20, 80);

INSERT INTO classes (school_id, name, level_code) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'A1 Başlangıç', 'A1'),
  ('a0000000-0000-4000-8000-000000000001', 'B1 Orta', 'B1'),
  ('a0000000-0000-4000-8000-000000000001', 'C1 İleri', 'C1'),
  ('a0000000-0000-4000-8000-000000000001', 'A2 Temel', 'A2'),
  ('a0000000-0000-4000-8000-000000000001', 'B2 Üst-Orta', 'B2');

INSERT INTO alerts (school_id, type, title, description, occurred_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'late_check_in', 'Geç Giriş', 'Ali Şahin ilk derse geç giriş yaptı', NOW() - INTERVAL '2 hours'),
  ('a0000000-0000-4000-8000-000000000001', 'substitute_request', 'Vekil Talebi', 'Fatma Yıldız yarınki B1 sınıfı için vekil talebi', NOW() - INTERVAL '1 hour'),
  ('a0000000-0000-4000-8000-000000000001', 'no_show', 'Devamsızlık', 'Zeynep Çelik A2 Temel sınıfı öğretmensiz', NOW() - INTERVAL '30 minutes');
