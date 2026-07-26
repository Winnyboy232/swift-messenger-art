
-- Profiles: safety columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS spam_reports_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

-- Saved contacts
CREATE TABLE public.saved_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chat_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_contacts TO authenticated;
GRANT ALL ON public.saved_contacts TO service_role;
ALTER TABLE public.saved_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved contacts"
  ON public.saved_contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Blocked chats
CREATE TABLE public.blocked_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chat_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_chats TO authenticated;
GRANT ALL ON public.blocked_chats TO service_role;
ALTER TABLE public.blocked_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocked chats"
  ON public.blocked_chats FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Spam reports
CREATE TABLE public.spam_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  reported_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, chat_id)
);
GRANT SELECT, INSERT ON public.spam_reports TO authenticated;
GRANT ALL ON public.spam_reports TO service_role;
ALTER TABLE public.spam_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters insert their reports"
  ON public.spam_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporters view their reports"
  ON public.spam_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- When a spam report is filed: if chat_id looks like a profile UUID, bump count & suspend at >=5
CREATE OR REPLACE FUNCTION public.handle_spam_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID;
BEGIN
  target := NEW.reported_profile_id;
  IF target IS NULL THEN
    BEGIN
      target := NEW.chat_id::uuid;
    EXCEPTION WHEN others THEN
      target := NULL;
    END;
  END IF;

  IF target IS NOT NULL THEN
    UPDATE public.profiles
       SET spam_reports_count = spam_reports_count + 1,
           is_suspended = (spam_reports_count + 1) >= 5,
           updated_at = now()
     WHERE id = target;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_spam_report_after_insert
AFTER INSERT ON public.spam_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_spam_report();

-- Prevent messages from suspended senders or into blocked chats
CREATE OR REPLACE FUNCTION public.enforce_message_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND is_suspended = true) THEN
    RAISE EXCEPTION 'Account suspended due to spam reports';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_chats WHERE user_id = NEW.user_id AND chat_id = NEW.chat_id) THEN
    RAISE EXCEPTION 'This chat is blocked';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_safety
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_safety();
