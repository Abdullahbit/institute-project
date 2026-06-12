-- Migration: Add Parent Portal tables
-- Parents can view their children's attendance, progress reports, behavior feedback

-- 1. Parents Table
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  user_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  password TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Parent-Student relationship (one parent can have multiple children)
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id),
  student_id UUID NOT NULL REFERENCES students(id),
  relationship TEXT NOT NULL DEFAULT 'parent',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Behavior Feedbacks (teacher notes about student behavior)
CREATE TABLE IF NOT EXISTS behavior_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  student_id UUID NOT NULL REFERENCES students(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  lesson_session_id UUID REFERENCES lesson_sessions(id),
  category TEXT NOT NULL DEFAULT 'good',
  title TEXT NOT NULL,
  description TEXT,
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
