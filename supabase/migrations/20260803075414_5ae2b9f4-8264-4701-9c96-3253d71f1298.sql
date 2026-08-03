-- ============ profiles: expiry ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz;

-- ============ gift_codes ============
CREATE TABLE public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plan_tier text NOT NULL,
  duration_months integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_redeemed boolean NOT NULL DEFAULT false,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  tier_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators view own gift codes" ON public.gift_codes FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = redeemed_by);
CREATE POLICY "Users create gift codes" ON public.gift_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- ============ ai_messages ============
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai messages select" ON public.ai_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ai messages insert" ON public.ai_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own ai messages delete" ON public.ai_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ ai_usage ============
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, usage_date)
);
GRANT SELECT, INSERT, UPDATE ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own usage" ON public.ai_usage FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ai_memory ============
CREATE TABLE public.ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_key text NOT NULL,
  memory_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, memory_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_memory TO authenticated;
GRANT ALL ON public.ai_memory TO service_role;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memory" ON public.ai_memory FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_gift_codes_updated BEFORE UPDATE ON public.gift_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_usage_updated BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_memory_updated BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- reattach existing behaviour triggers (previously missing)
DROP TRIGGER IF EXISTS trg_enforce_message_safety ON public.messages;
CREATE TRIGGER trg_enforce_message_safety BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_safety();
DROP TRIGGER IF EXISTS trg_handle_spam_report ON public.spam_reports;
CREATE TRIGGER trg_handle_spam_report AFTER INSERT ON public.spam_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_spam_report();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============ admin helper ============
CREATE OR REPLACE FUNCTION public.is_swift_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.is_admin = true)
$$;

CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_swift_admin(auth.uid()));
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_swift_admin(auth.uid())) WITH CHECK (public.is_swift_admin(auth.uid()));
CREATE POLICY "Admins view all appeals" ON public.appeals FOR SELECT TO authenticated
  USING (public.is_swift_admin(auth.uid()));
CREATE POLICY "Admins update all appeals" ON public.appeals FOR UPDATE TO authenticated
  USING (public.is_swift_admin(auth.uid())) WITH CHECK (public.is_swift_admin(auth.uid()));
CREATE POLICY "Admins view all gift codes" ON public.gift_codes FOR SELECT TO authenticated
  USING (public.is_swift_admin(auth.uid()));

-- ============ code generation ============
CREATE OR REPLACE FUNCTION public.generate_gift_code(_plan_tier text, _duration_months integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  suffix text;
  new_code text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _plan_tier NOT IN ('basic','pro','ultimate') THEN RAISE EXCEPTION 'Invalid plan tier'; END IF;
  IF _duration_months < 1 OR _duration_months > 24 THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  LOOP
    suffix := upper(substr(md5(gen_random_uuid()::text), 1, 4));
    new_code := 'SWIFT-' || upper(_plan_tier) || '-' || suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.gift_codes WHERE code = new_code);
  END LOOP;
  INSERT INTO public.gift_codes (code, plan_tier, duration_months, created_by)
  VALUES (new_code, _plan_tier, _duration_months, uid);
  RETURN new_code;
END; $$;

-- ============ redemption ============
CREATE OR REPLACE FUNCTION public.redeem_gift_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.gift_codes%ROWTYPE;
  expires timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO rec FROM public.gift_codes WHERE code = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Code not found'); END IF;
  IF rec.is_redeemed THEN RETURN jsonb_build_object('ok', false, 'error', 'Code already redeemed'); END IF;

  expires := greatest(now(), COALESCE((SELECT tier_expires_at FROM public.profiles WHERE id = uid), now()))
             + (rec.duration_months || ' months')::interval;

  UPDATE public.gift_codes
     SET is_redeemed = true, redeemed_by = uid, redeemed_at = now(), tier_expires_at = expires
   WHERE id = rec.id;

  UPDATE public.profiles
     SET subscription_tier = rec.plan_tier, tier_expires_at = expires,
         is_frozen = false, frozen_at = NULL, updated_at = now()
   WHERE id = uid;

  RETURN jsonb_build_object('ok', true, 'tier', rec.plan_tier, 'expires_at', expires);
END; $$;

-- ============ expiry sweep for current user ============
CREATE OR REPLACE FUNCTION public.expire_my_tier()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); changed boolean := false;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  UPDATE public.profiles
     SET subscription_tier = 'free', tier_expires_at = NULL, updated_at = now()
   WHERE id = uid AND is_admin = false
     AND subscription_tier <> 'free'
     AND tier_expires_at IS NOT NULL AND tier_expires_at <= now();
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END; $$;

-- ============ admin tier override ============
CREATE OR REPLACE FUNCTION public.admin_set_tier(_target uuid, _tier text, _months integer DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_swift_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _tier NOT IN ('free','basic','pro','ultimate') THEN RAISE EXCEPTION 'Invalid tier'; END IF;
  UPDATE public.profiles
     SET subscription_tier = _tier,
         tier_expires_at = CASE WHEN _tier = 'free' OR _months IS NULL THEN NULL
                                ELSE now() + (_months || ' months')::interval END,
         updated_at = now()
   WHERE id = _target;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_unfreeze(_target uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_swift_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles
     SET is_frozen = false, frozen_at = NULL, is_suspended = false, spam_reports_count = 0, updated_at = now()
   WHERE id = _target;
  UPDATE public.appeals SET status = 'resolved', resolved_at = now(), updated_at = now()
   WHERE user_id = _target AND status = 'pending';
  RETURN true;
END; $$;

-- ============ usage counter ============
CREATE OR REPLACE FUNCTION public.consume_ai_usage(_kind text, _daily_limit integer, _monthly_limit integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  prof public.profiles%ROWTYPE;
  today date := (now() AT TIME ZONE 'utc')::date;
  used_today integer := 0;
  used_month integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO prof FROM public.profiles WHERE id = uid;

  IF prof.is_admin OR prof.subscription_tier IN ('pro','ultimate') THEN
    RETURN jsonb_build_object('ok', true, 'unlimited', true, 'watermark', false);
  END IF;

  SELECT COALESCE(count,0) INTO used_today FROM public.ai_usage
   WHERE user_id = uid AND kind = _kind AND usage_date = today;
  SELECT COALESCE(sum(count),0) INTO used_month FROM public.ai_usage
   WHERE user_id = uid AND kind = _kind AND usage_date >= date_trunc('month', today)::date;

  IF (_daily_limit IS NOT NULL AND used_today >= _daily_limit)
     OR (_monthly_limit IS NOT NULL AND used_month >= _monthly_limit) THEN
    IF prof.ai_credits > 0 THEN
      UPDATE public.profiles SET ai_credits = ai_credits - 1, updated_at = now() WHERE id = uid;
      RETURN jsonb_build_object('ok', true, 'usedCredit', true,
        'watermark', prof.subscription_tier = 'free');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'limit_reached');
  END IF;

  INSERT INTO public.ai_usage (user_id, kind, usage_date, count)
  VALUES (uid, _kind, today, 1)
  ON CONFLICT (user_id, kind, usage_date) DO UPDATE SET count = public.ai_usage.count + 1;

  RETURN jsonb_build_object('ok', true, 'remainingToday',
    GREATEST(COALESCE(_daily_limit,0) - used_today - 1, 0),
    'watermark', prof.subscription_tier = 'free');
END; $$;
