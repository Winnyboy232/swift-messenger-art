
-- Updates (status) tables
CREATE TABLE public.updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image','video','text')),
  media_url TEXT,
  text_content TEXT,
  background_color TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.updates TO authenticated;
GRANT ALL ON public.updates TO service_role;

ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active updates" ON public.updates
  FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "Users insert own updates" ON public.updates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own updates" ON public.updates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own updates" ON public.updates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_updates_user_created ON public.updates(user_id, created_at DESC);
CREATE INDEX idx_updates_expires ON public.updates(expires_at);

-- Views tracking
CREATE TABLE public.update_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id UUID NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (update_id, viewer_id)
);

GRANT SELECT, INSERT ON public.update_views TO authenticated;
GRANT ALL ON public.update_views TO service_role;

ALTER TABLE public.update_views ENABLE ROW LEVEL SECURITY;

-- Viewer can insert own view record
CREATE POLICY "Viewers insert own view" ON public.update_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);
-- Owner of the update can see all viewers; viewer can see own view rows
CREATE POLICY "Owner or viewer can select" ON public.update_views
  FOR SELECT TO authenticated USING (
    auth.uid() = viewer_id
    OR EXISTS (SELECT 1 FROM public.updates u WHERE u.id = update_views.update_id AND u.user_id = auth.uid())
  );

CREATE INDEX idx_update_views_update ON public.update_views(update_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.update_views;
