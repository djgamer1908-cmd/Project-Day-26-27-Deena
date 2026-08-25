/*
# Enable PostGIS and pg_trgm extensions

1. Extensions
   - `postgis` — geography/geometry types and GiST spatial indexes for proximity-based duplicate detection.
   - `pg_trgm` — trigram text similarity for description-based duplicate detection.
*/

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
