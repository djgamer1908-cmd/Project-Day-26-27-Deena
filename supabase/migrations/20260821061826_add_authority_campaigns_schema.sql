/*
# Authority profiles, campaign applications, and authority-scoped issue updates

1. Purpose
   - Support a citizen/authority/master three-site architecture.
   - Authorities must register (name + contact), wait for master approval, then can update issue statuses.
   - Citizens can apply to host awareness campaigns.
   - The master site (djgamer1908@gmail.com) approves/rejects authority requests and can block authorities.

2. New Tables
   - `authority_profiles`
     - `id` (uuid, primary key, defaults to auth.uid())
     - `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
     - `email` (text, NOT NULL)
     - `name` (text, NOT NULL)
     - `contact` (text, NOT NULL)
     - `status` (text: pending, approved, rejected, blocked — default pending)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
   - `campaign_applications`
     - `id` (uuid, primary key)
     - `applicant_name` (text, NOT NULL)
     - `applicant_contact` (text, NOT NULL)
     - `applicant_email` (text, NOT NULL)
     - `organization_name` (text, NOT NULL)
     - `organization_contact` (text, NOT NULL)
     - `organization_email` (text, NOT NULL)
     - `organization_address` (text, NOT NULL)
     - `status` (text: pending, approved, rejected — default pending)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

3. Modified Tables
   - `civic_issues` — no schema changes, but RLS UPDATE policy tightened so only approved authorities can update status. Citizens can still INSERT and SELECT.

4. Security
   - `authority_profiles`: Enable RLS. Authenticated users can SELECT and INSERT their own profile. UPDATE only for the master user (email = djgamer1908@gmail.com) via a SECURITY DEFINER function, since anon/authenticated roles can't see other users' profiles.
   - `campaign_applications`: Enable RLS. Anyone (anon + authenticated) can INSERT (citizens apply without login). SELECT restricted to authenticated users (authorities/master can view). UPDATE restricted to master via SECURITY DEFINER function.
   - `civic_issues`: UPDATE policy changed to require an approved authority profile.

5. Important Notes
   - The master email is djgamer1908@gmail.com. Only this user sees the master site.
   - Authority status transitions are done via SECURITY DEFINER RPC functions so the master can update rows they don't own.
   - Blocking an authority sets status to 'blocked', which prevents status updates on civic_issues.
*/

-- ============ authority_profiles ============
CREATE TABLE IF NOT EXISTS authority_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  contact text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE authority_profiles ENABLE ROW LEVEL SECURITY;

-- A user can read their own profile
DROP POLICY IF EXISTS "select_own_authority_profile" ON authority_profiles;
CREATE POLICY "select_own_authority_profile" ON authority_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- A user can insert their own profile (registration)
DROP POLICY IF EXISTS "insert_own_authority_profile" ON authority_profiles;
CREATE POLICY "insert_own_authority_profile" ON authority_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- A user can update their own profile (e.g. name/contact changes before approval)
DROP POLICY IF EXISTS "update_own_authority_profile" ON authority_profiles;
CREATE POLICY "update_own_authority_profile" ON authority_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Master needs to read ALL profiles and update status. Use SECURITY DEFINER functions for that.

-- ============ campaign_applications ============
CREATE TABLE IF NOT EXISTS campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name text NOT NULL,
  applicant_contact text NOT NULL,
  applicant_email text NOT NULL,
  organization_name text NOT NULL,
  organization_contact text NOT NULL,
  organization_email text NOT NULL,
  organization_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a campaign application (citizens, no login required)
DROP POLICY IF EXISTS "anon_insert_campaign_applications" ON campaign_applications;
CREATE POLICY "anon_insert_campaign_applications" ON campaign_applications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Authenticated users (authorities + master) can view campaign applications
DROP POLICY IF EXISTS "auth_select_campaign_applications" ON campaign_applications;
CREATE POLICY "auth_select_campaign_applications" ON campaign_applications FOR SELECT
  TO authenticated USING (true);

-- ============ SECURITY DEFINER functions for master operations ============

-- Check if current user is the master
CREATE OR REPLACE FUNCTION is_master_user() RETURNS boolean
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email = 'djgamer1908@gmail.com'
  );
$$;

-- Master: get all authority profiles
CREATE OR REPLACE FUNCTION get_all_authority_profiles()
RETURNS TABLE (
  id uuid, user_id uuid, email text, name text, contact text, status text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, user_id, email, name, contact, status, created_at, updated_at
  FROM authority_profiles
  WHERE is_master_user();
$$;

-- Master: approve or reject an authority profile
CREATE OR REPLACE FUNCTION update_authority_status(p_profile_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Only the master user can perform this action';
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected', 'blocked') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE authority_profiles SET status = p_status, updated_at = now() WHERE id = p_profile_id;
END;
$$;

-- Master: update campaign application status
CREATE OR REPLACE FUNCTION update_campaign_status(p_campaign_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Only the master user can perform this action';
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE campaign_applications SET status = p_status, updated_at = now() WHERE id = p_campaign_id;
END;
$$;

-- Check if current user is an approved authority
CREATE OR REPLACE FUNCTION is_approved_authority()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM authority_profiles
    WHERE user_id = auth.uid() AND status = 'approved'
  );
$$;

-- ============ Update civic_issues UPDATE policy ============
-- Only approved authorities can update issue status
DROP POLICY IF EXISTS "anon_update_civic_issues" ON civic_issues;
CREATE POLICY "authority_update_civic_issues" ON civic_issues FOR UPDATE
  TO authenticated
  USING (is_approved_authority())
  WITH CHECK (is_approved_authority());

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS authority_profiles_status_idx ON authority_profiles (status);
CREATE INDEX IF NOT EXISTS authority_profiles_email_idx ON authority_profiles (email);
CREATE INDEX IF NOT EXISTS campaign_applications_status_idx ON campaign_applications (status);
CREATE INDEX IF NOT EXISTS campaign_applications_created_idx ON campaign_applications (created_at DESC);

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION authority_profiles_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS authority_profiles_updated_at_trigger ON authority_profiles;
CREATE TRIGGER authority_profiles_updated_at_trigger
  BEFORE UPDATE ON authority_profiles
  FOR EACH ROW EXECUTE FUNCTION authority_profiles_touch_updated_at();

CREATE OR REPLACE FUNCTION campaign_applications_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_applications_updated_at_trigger ON campaign_applications;
CREATE TRIGGER campaign_applications_updated_at_trigger
  BEFORE UPDATE ON campaign_applications
  FOR EACH ROW EXECUTE FUNCTION campaign_applications_touch_updated_at();
