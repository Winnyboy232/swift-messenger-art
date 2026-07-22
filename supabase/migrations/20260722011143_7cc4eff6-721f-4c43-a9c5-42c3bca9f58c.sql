
-- Messages table for Swift chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('me','them')),
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_user_chat_idx ON public.messages(user_id, chat_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own messages select" ON public.messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own messages insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own messages update" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own messages delete" ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Storage RLS policies for the swifty-media bucket (bucket created via storage tool)
CREATE POLICY "Users read own media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'swifty-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'swifty-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'swifty-media' AND auth.uid()::text = (storage.foldername(name))[1]);
