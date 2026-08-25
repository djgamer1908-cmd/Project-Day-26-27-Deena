/*
# Duplicate detection RPC functions

1. Functions
   - `find_nearby_duplicates(p_lat, p_lng, p_category, p_exclude)` — returns issues of the same category within 100 meters, ordered by distance. Uses PostGIS ST_DWithin + ST_Distance.
   - `find_text_duplicates(p_text, p_category, p_exclude)` — returns issues with trigram similarity >= 0.3 on description, ordered by similarity. Uses pg_trgm similarity().
   Both exclude resolved/rejected issues and the optional `p_exclude` id. SECURITY DEFINER so they can run with service role privileges from the edge function.
*/

CREATE OR REPLACE FUNCTION find_nearby_duplicates(
  p_lat numeric,
  p_lng numeric,
  p_category text,
  p_exclude uuid DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  distance_m numeric,
  description text,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    id,
    ST_Distance(geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)::numeric AS distance_m,
    description,
    created_at
  FROM civic_issues
  WHERE category = p_category
    AND geom IS NOT NULL
    AND status NOT IN ('resolved', 'rejected')
    AND (p_exclude IS NULL OR id != p_exclude)
    AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, 100)
  ORDER BY distance_m ASC
  LIMIT 5;
$$;

CREATE OR REPLACE FUNCTION find_text_duplicates(
  p_text text,
  p_category text,
  p_exclude uuid DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  similarity numeric,
  description text,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    id,
    similarity(description, p_text) AS similarity,
    description,
    created_at
  FROM civic_issues
  WHERE category = p_category
    AND status NOT IN ('resolved', 'rejected')
    AND (p_exclude IS NULL OR id != p_exclude)
    AND similarity(description, p_text) >= 0.3
  ORDER BY similarity DESC
  LIMIT 5;
$$;
