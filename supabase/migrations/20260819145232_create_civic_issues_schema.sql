/*
# Civic Issue Management Platform — Schema

1. Purpose
   Citizens report civic problems (damaged roads, garbage, streetlights, water leakage, blocked drains, etc.) with a photo, location, and text. The system auto-classifies the issue, estimates severity, flags duplicates, and helps authorities prioritise action.

2. New Tables
   - `civic_issues`
     - `id` (uuid, primary key)
     - `title` (text, short label, optional — auto-derived)
     - `description` (text, citizen's report text)
     - `photo_url` (text, public URL of uploaded photo in storage)
     - `category` (text, auto-classified: road, garbage, streetlight, water, drain, other)
     - `severity` (int, 1-5, auto-estimated)
     - `priority_score` (numeric, derived for ranking)
     - `latitude` (numeric, optional)
     - `longitude` (numeric, optional)
     - `address` (text, optional reverse-geocoded or manual)
     - `status` (text: submitted, classified, acknowledged, in_progress, resolved, rejected)
     - `duplicate_of` (uuid, nullable, FK to civic_issues.id — set when flagged as duplicate)
     - `reporter_name` (text, optional)
     - `reporter_contact` (text, optional)
     - `ai_summary` (text, optional — AI-generated one-line summary)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     - `geom` (geography POINT, auto-populated from lat/lng for spatial queries)

3. Security
   - Enable RLS on `civic_issues`.
   - This is a no-auth (public/civic) app: citizens report without logging in, and authorities view a public dashboard. Allow anon + authenticated CRUD. `USING (true)` is acceptable because the data is intentionally public/shared (civic complaints are public records).

4. Indexes
   - `civic_issues_status_idx` on `status`
   - `civic_issues_category_idx` on `category`
   - `civic_issues_priority_idx` on `priority_score DESC NULLS LAST`
   - `civic_issues_created_at_idx` on `created_at DESC`
   - `civic_issues_geo_idx` GiST index on `geom` for proximity/duplicate detection
   - `civic_issues_desc_trgm_idx` GIN trigram index on `description` for fuzzy duplicate detection

5. Triggers
   - `civic_issues_geom_trigger` — populate `geom` from lat/lng before insert/update.
   - `civic_issues_updated_at_trigger` — keep `updated_at` fresh.
*/

CREATE TABLE IF NOT EXISTS civic_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text NOT NULL DEFAULT '',
  photo_url text,
  category text NOT NULL DEFAULT 'other',
  severity int NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  priority_score numeric NOT NULL DEFAULT 0,
  latitude numeric,
  longitude numeric,
  address text,
  status text NOT NULL DEFAULT 'submitted',
  duplicate_of uuid REFERENCES civic_issues(id) ON DELETE SET NULL,
  reporter_name text,
  reporter_contact text,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE civic_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_civic_issues" ON civic_issues;
CREATE POLICY "anon_select_civic_issues" ON civic_issues FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_civic_issues" ON civic_issues;
CREATE POLICY "anon_insert_civic_issues" ON civic_issues FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_civic_issues" ON civic_issues;
CREATE POLICY "anon_update_civic_issues" ON civic_issues FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_civic_issues" ON civic_issues;
CREATE POLICY "anon_delete_civic_issues" ON civic_issues FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS civic_issues_status_idx ON civic_issues (status);
CREATE INDEX IF NOT EXISTS civic_issues_category_idx ON civic_issues (category);
CREATE INDEX IF NOT EXISTS civic_issues_priority_idx ON civic_issues (priority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS civic_issues_created_at_idx ON civic_issues (created_at DESC);

ALTER TABLE civic_issues ADD COLUMN IF NOT EXISTS geom geography(POINT, 4326);

CREATE OR REPLACE FUNCTION civic_issues_set_geom() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS civic_issues_geom_trigger ON civic_issues;
CREATE TRIGGER civic_issues_geom_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude ON civic_issues
  FOR EACH ROW EXECUTE FUNCTION civic_issues_set_geom();

CREATE INDEX IF NOT EXISTS civic_issues_geo_idx ON civic_issues USING GIST (geom);

CREATE INDEX IF NOT EXISTS civic_issues_desc_trgm_idx ON civic_issues USING GIN (description gin_trgm_ops);

CREATE OR REPLACE FUNCTION civic_issues_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS civic_issues_updated_at_trigger ON civic_issues;
CREATE TRIGGER civic_issues_updated_at_trigger
  BEFORE UPDATE ON civic_issues
  FOR EACH ROW EXECUTE FUNCTION civic_issues_touch_updated_at();
