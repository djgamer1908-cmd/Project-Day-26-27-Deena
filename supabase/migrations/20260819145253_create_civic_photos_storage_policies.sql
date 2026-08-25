/*
# Storage policies for civic-photos bucket

1. Purpose
   Public read for civic issue photos (they are public records). Allow anon + authenticated to upload, since citizens report without logging in.

2. Policies
   - SELECT (public read): anon, authenticated
   - INSERT (upload): anon, authenticated
   - UPDATE: anon, authenticated
   - DELETE: anon, authenticated
*/

DROP POLICY IF EXISTS "public_read_civic_photos" ON storage.objects;
CREATE POLICY "public_read_civic_photos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'civic-photos');

DROP POLICY IF EXISTS "anon_upload_civic_photos" ON storage.objects;
CREATE POLICY "anon_upload_civic_photos" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'civic-photos');

DROP POLICY IF EXISTS "anon_update_civic_photos" ON storage.objects;
CREATE POLICY "anon_update_civic_photos" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'civic-photos') WITH CHECK (bucket_id = 'civic-photos');

DROP POLICY IF EXISTS "anon_delete_civic_photos" ON storage.objects;
CREATE POLICY "anon_delete_civic_photos" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'civic-photos');
