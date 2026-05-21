-- =========================================================================
-- STEP 1 — DATABASE SCHEMA & RLS POLICIES
-- =========================================================================

-- 1. Create Schools Table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL, -- subdomain slug (e.g. school-a)
  branding jsonb DEFAULT '{"logo_url": null, "primary_color": "#4f46e5", "secondary_color": "#06b6d4"}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. Create Users Table (linked to auth.users.id)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, -- matches auth.users.id
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Create Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 4. Author RLS Policies using auth.jwt() metadata
-- Any authenticated user can read their own school row
DROP POLICY IF EXISTS schools_isolation_policy ON schools;
CREATE POLICY schools_isolation_policy ON schools
  FOR SELECT
  TO authenticated
  USING (id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid));

-- Only tenant administrators can update their school branding
DROP POLICY IF EXISTS schools_admin_update ON schools;
CREATE POLICY schools_admin_update ON schools
  FOR UPDATE
  TO authenticated
  USING (
    id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid) AND 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Users can only read/write users in their own school
DROP POLICY IF EXISTS users_isolation_policy ON users;
CREATE POLICY users_isolation_policy ON users
  FOR ALL
  TO authenticated
  USING (school_id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid))
  WITH CHECK (school_id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid));

-- Users can only read/write invitations in their own school
DROP POLICY IF EXISTS invitations_isolation_policy ON invitations;
CREATE POLICY invitations_isolation_policy ON invitations
  FOR ALL
  TO authenticated
  USING (school_id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid))
  WITH CHECK (school_id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid));
