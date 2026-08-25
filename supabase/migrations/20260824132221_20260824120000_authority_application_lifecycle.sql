/*
# Authority application lifecycle and two-year authorization

1. Purpose
- Let anyone submit an authority application without first logging in.
- Store the complete authority details requested by the application form.
- Let only the designated master account approve or deny applications.
- Store a two-year authorization expiry so expired authorities must apply again.

2. Modified Tables
- `authority_profiles`
  - `user_id` is nullable while an application is awaiting approval.
  - `age` stores the applicant's age.
  - `gender` stores the applicant's gender.
  - `second_contact` stores the backup contact.
  - `organization_email` stores the organization email.
  - `organization_address` stores the organization address.
  - `approved_until` stores the end of the two-year authorization period.

3. Security
- Anonymous users may insert an application but cannot read or update applications.
- Authenticated users may read only their own authority record.
- Master-only RPC functions perform privileged status changes.
- Approved authority checks require both approved status and a non-expired `approved_until`.

4. Important Notes
- The master email is `itz.me.mario.brother@gmail.com`.
- Existing authority records are preserved; new fields are nullable for compatibility.
- No user data is deleted or renamed.
*/

ALTER TABLE authority_profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE authority_profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE authority_profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE authority_profiles ADD COLUMN IF NOT EXISTS second_contact text;
ALTER TABLE authority_profiles ADD COLUMN IF NOT EXISTS organization_email text;
ALTER TABLE authority_profiles ADD COLUMN IF NOT EXISTS organization_address text;
ALTER TABLE authority_profiles ADD COLUMN IF NOT EXISTS approved_until timestamptz;

DROP POLICY IF EXISTS "select_own_authority_profile" ON authority_profiles;
CREATE POLICY "select_own_authority_profile" ON authority_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_authority_profile" ON authority_profiles;
DROP POLICY IF EXISTS "anon_insert_authority_profile" ON authority_profiles;
CREATE POLICY "anon_insert_authority_profile" ON authority_profiles FOR INSERT
  TO anon, authenticated WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "update_own_authority_profile" ON authority_profiles;
CREATE POLICY "update_own_authority_profile" ON authority_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE OR REPLACE FUNCTION is_master_user() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND lower(email) = 'itz.me.mario.brother@gmail.com'
  );
$$;

DROP FUNCTION IF EXISTS get_all_authority_profiles();
CREATE FUNCTION get_all_authority_profiles()
RETURNS TABLE (
  id uuid, user_id uuid, email text, name text, age integer, gender text,
  contact text, second_contact text, organization_email text,
  organization_address text, status text, approved_until timestamptz,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, user_id, email, name, age, gender, contact, second_contact,
    organization_email, organization_address, status, approved_until,
    created_at, updated_at
  FROM authority_profiles
  WHERE is_master_user()
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION update_authority_status(p_profile_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_master_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected', 'blocked') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE authority_profiles
  SET status = p_status,
      approved_until = CASE WHEN p_status = 'approved' THEN now() + interval '2 years' ELSE NULL END,
      updated_at = now()
  WHERE id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION is_approved_authority()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM authority_profiles
    WHERE user_id = auth.uid()
      AND status = 'approved'
      AND approved_until IS NOT NULL
      AND approved_until > now()
  );
$$;

REVOKE EXECUTE ON FUNCTION get_all_authority_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION update_authority_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION is_master_user() FROM anon;
REVOKE EXECUTE ON FUNCTION is_approved_authority() FROM anon;
GRANT EXECUTE ON FUNCTION get_all_authority_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION update_authority_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_approved_authority() TO authenticated;

DROP POLICY IF EXISTS "authority_update_civic_issues" ON civic_issues;
CREATE POLICY "authority_update_civic_issues" ON civic_issues FOR UPDATE
  TO authenticated
  USING (is_approved_authority())
  WITH CHECK (is_approved_authority());

CREATE INDEX IF NOT EXISTS authority_profiles_approved_until_idx ON authority_profiles (approved_until);
