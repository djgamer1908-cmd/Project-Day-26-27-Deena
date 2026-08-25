/*
# Authority resubmission after authorization expiry

1. Purpose
- Allow an authority whose two-year authorization expired to submit a fresh application.

2. Security
- Only the signed-in owner of an expired authority record can resubmit it.
- The function clears the old authorization and returns the record to pending review.
- The function is not available to anonymous users.
*/

CREATE OR REPLACE FUNCTION resubmit_expired_authority(
  p_profile_id uuid,
  p_name text,
  p_age integer,
  p_gender text,
  p_contact text,
  p_second_contact text,
  p_email text,
  p_organization_email text,
  p_organization_address text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM authority_profiles
    WHERE id = p_profile_id
      AND user_id = auth.uid()
      AND status = 'approved'
      AND approved_until IS NOT NULL
      AND approved_until <= now()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE authority_profiles
  SET name = trim(p_name),
      age = p_age,
      gender = trim(p_gender),
      contact = trim(p_contact),
      second_contact = trim(p_second_contact),
      email = lower(trim(p_email)),
      organization_email = lower(trim(p_organization_email)),
      organization_address = trim(p_organization_address),
      status = 'pending',
      approved_until = NULL,
      updated_at = now()
  WHERE id = p_profile_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION resubmit_expired_authority(uuid, text, integer, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION resubmit_expired_authority(uuid, text, integer, text, text, text, text, text, text) TO authenticated;
