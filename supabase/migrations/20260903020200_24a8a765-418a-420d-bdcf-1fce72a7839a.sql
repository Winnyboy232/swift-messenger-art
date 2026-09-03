-- Role storage is separate from profiles and users.
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER avoids recursive RLS evaluation while checking a caller's role.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Immutable administrative audit trail.
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Global admin-controlled settings and feature flags.
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tier-specific AI controls used by the admin portal and future generation routes.
CREATE TABLE IF NOT EXISTS public.ai_limits_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE CHECK (tier IN ('free', 'basic', 'pro', 'ultimate')),
  daily_ai_messages integer NOT NULL DEFAULT 20,
  monthly_ai_messages integer,
  daily_image_generations integer NOT NULL DEFAULT 0,
  monthly_video_generations integer NOT NULL DEFAULT 0,
  document_uploads integer NOT NULL DEFAULT 0,
  ai_credits integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_limits_config TO authenticated;
GRANT ALL ON public.ai_limits_config TO service_role;
ALTER TABLE public.ai_limits_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage AI limits" ON public.ai_limits_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin access is role-table based, never profile-flag based.
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins view all appeals" ON public.appeals;
CREATE POLICY "Admins view all appeals" ON public.appeals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update all appeals" ON public.appeals;
CREATE POLICY "Admins update all appeals" ON public.appeals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins view all gift codes" ON public.gift_codes;
CREATE POLICY "Admins view all gift codes" ON public.gift_codes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_swift_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.admin_set_tier(_target uuid, _tier text, _months integer DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _tier NOT IN ('free','basic','pro','ultimate') THEN RAISE EXCEPTION 'Invalid tier'; END IF;
  UPDATE public.profiles
     SET subscription_tier = _tier,
         tier_expires_at = CASE WHEN _tier = 'free' OR _months IS NULL THEN NULL
                                ELSE now() + (_months || ' months')::interval END,
         updated_at = now()
   WHERE id = _target;
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, target_user_id, details)
  VALUES (auth.uid(), 'tier_changed', 'profile', _target,
          jsonb_build_object('tier', _tier, 'months', _months));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unfreeze(_target uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles
     SET is_frozen = false, frozen_at = NULL, is_suspended = false, spam_reports_count = 0, updated_at = now()
   WHERE id = _target;
  UPDATE public.appeals
     SET status = 'resolved', resolved_at = now(), updated_at = now()
   WHERE user_id = _target AND status = 'pending';
  INSERT INTO public.admin_audit_log (admin_user_id, action, entity_type, target_user_id)
  VALUES (auth.uid(), 'account_restored', 'profile', _target);
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_swift_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_tier(uuid, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_unfreeze(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_swift_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_tier(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unfreeze(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_admin_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_settings_updated ON public.admin_settings;
CREATE TRIGGER trg_admin_settings_updated
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_admin_config_updated_at();
DROP TRIGGER IF EXISTS trg_ai_limits_config_updated ON public.ai_limits_config;
CREATE TRIGGER trg_ai_limits_config_updated
  BEFORE UPDATE ON public.ai_limits_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_admin_config_updated_at();