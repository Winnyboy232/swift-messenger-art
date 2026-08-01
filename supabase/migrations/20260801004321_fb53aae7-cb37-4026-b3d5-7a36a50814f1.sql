
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_credits integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.appeals TO authenticated;
GRANT ALL ON public.appeals TO service_role;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own appeals" ON public.appeals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own appeals" ON public.appeals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own appeals" ON public.appeals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  item_name text NOT NULL,
  amount_kobo integer NOT NULL,
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own purchases" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.unlocked_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  item_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT ON public.unlocked_items TO authenticated;
GRANT ALL ON public.unlocked_items TO service_role;
ALTER TABLE public.unlocked_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own unlocked items" ON public.unlocked_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own unlocked items" ON public.unlocked_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- helper: is this profile immune to anti-spam?
CREATE OR REPLACE FUNCTION public.is_spam_immune(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND (p.is_admin = true OR p.subscription_tier IN ('basic','pro','ultimate'))
  )
$$;

-- owner override on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_phones text[] := ARRAY['+2348125522479','+2347078863274','07078863274','2347078863274','2348125522479'];
  is_owner boolean;
BEGIN
  is_owner := COALESCE(NEW.phone, '') = ANY(owner_phones)
    OR COALESCE(NEW.raw_user_meta_data->>'phone', '') = ANY(owner_phones);

  INSERT INTO public.profiles (id, display_name, phone, avatar_url, is_admin, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.phone,
    NEW.raw_user_meta_data->>'avatar_url',
    is_owner,
    CASE WHEN is_owner THEN 'ultimate' ELSE 'free' END
  )
  ON CONFLICT (id) DO UPDATE
    SET is_admin = public.profiles.is_admin OR EXCLUDED.is_admin,
        subscription_tier = CASE WHEN EXCLUDED.is_admin THEN 'ultimate' ELSE public.profiles.subscription_tier END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- spam reports: skip immune accounts
CREATE OR REPLACE FUNCTION public.handle_spam_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid;
BEGIN
  target := NEW.reported_profile_id;
  IF target IS NOT NULL AND NOT public.is_spam_immune(target) THEN
    UPDATE public.profiles
       SET spam_reports_count = spam_reports_count + 1,
           is_suspended = (spam_reports_count + 1) >= 5,
           updated_at = now()
     WHERE id = target;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_spam_report ON public.spam_reports;
CREATE TRIGGER on_spam_report
AFTER INSERT ON public.spam_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_spam_report();

-- message safety + freeze detection
CREATE OR REPLACE FUNCTION public.enforce_message_safety()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  immune boolean;
  recent_count integer;
  is_saved boolean;
BEGIN
  immune := public.is_spam_immune(NEW.user_id);

  IF NOT immune THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND (is_suspended = true OR is_frozen = true)) THEN
      RAISE EXCEPTION 'Account restricted by Swift anti-spam';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.blocked_chats WHERE user_id = NEW.user_id AND chat_id = NEW.chat_id) THEN
    RAISE EXCEPTION 'This chat is blocked';
  END IF;

  IF NOT immune AND NEW.sender <> 'me' THEN
    is_saved := EXISTS (SELECT 1 FROM public.saved_contacts WHERE user_id = NEW.user_id AND chat_id = NEW.chat_id);
    IF NOT is_saved THEN
      SELECT count(*) INTO recent_count
        FROM public.messages m
       WHERE m.user_id = NEW.user_id
         AND m.chat_id = NEW.chat_id
         AND m.sender <> 'me'
         AND m.created_at > now() - interval '24 hours';
      IF recent_count >= 20 THEN
        UPDATE public.profiles
           SET is_frozen = true, frozen_at = now(), updated_at = now()
         WHERE id = NEW.user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_safety();

-- automated 48h unfreeze
CREATE OR REPLACE FUNCTION public.process_freeze_appeals(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  unfroze boolean := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.appeals
    WHERE user_id = _user_id AND status = 'pending'
      AND submitted_at <= now() - interval '48 hours'
  ) THEN
    UPDATE public.appeals
       SET status = 'resolved', resolved_at = now(), updated_at = now()
     WHERE user_id = _user_id AND status = 'pending'
       AND submitted_at <= now() - interval '48 hours';
    UPDATE public.profiles
       SET is_frozen = false, frozen_at = NULL, is_suspended = false,
           spam_reports_count = 0, updated_at = now()
     WHERE id = _user_id;
    unfroze := true;
  END IF;
  RETURN unfroze;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_freeze_appeals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_spam_immune(uuid) TO authenticated;
