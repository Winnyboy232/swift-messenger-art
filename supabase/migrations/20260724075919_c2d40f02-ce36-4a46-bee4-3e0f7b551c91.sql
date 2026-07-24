
CREATE POLICY "Users manage own status-media" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'status-media' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'status-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated read status-media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'status-media');
