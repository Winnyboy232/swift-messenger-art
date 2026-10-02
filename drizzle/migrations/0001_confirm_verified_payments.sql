CREATE OR REPLACE FUNCTION public.confirm_payment_order(_order_id uuid, _provider text, _provider_reference text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment public.payment_orders%ROWTYPE;
BEGIN
  SELECT * INTO payment FROM public.payment_orders WHERE id = _order_id AND provider = _provider FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF payment.status = 'confirmed' THEN RETURN true; END IF;
  IF payment.status <> 'pending' THEN RETURN false; END IF;

  UPDATE public.payment_orders
     SET status = 'confirmed', provider_reference = _provider_reference, confirmed_at = now()
   WHERE id = _order_id;

  IF payment.item_type = 'subscription' THEN
    UPDATE public.profiles
       SET subscription_tier = payment.item_id,
           tier_expires_at = greatest(now(), COALESCE(tier_expires_at, now())) + make_interval(months => payment.months),
           is_frozen = false, frozen_at = NULL, is_suspended = false, updated_at = now()
     WHERE id = payment.user_id;
  ELSIF payment.item_type = 'credits' THEN
    UPDATE public.profiles SET ai_credits = ai_credits + payment.credits, updated_at = now()
     WHERE id = payment.user_id;
  END IF;

  INSERT INTO public.purchases (user_id, item_id, item_name, amount_kobo, reference, metadata)
  VALUES (payment.user_id, payment.item_id, payment.item_id, payment.amount_minor,
          _provider_reference,
          jsonb_build_object('provider', _provider, 'currency', payment.currency, 'order_id', payment.id, 'item_type', payment.item_type))
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_payment_order(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_order(uuid, text, text) TO service_role;
