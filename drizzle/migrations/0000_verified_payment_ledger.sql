CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('paystack', 'nowpayments')),
  item_type text NOT NULL CHECK (item_type IN ('subscription', 'credits', 'gift')),
  item_id text NOT NULL,
  currency text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  credits integer NOT NULL DEFAULT 0,
  months integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payment orders" ON public.payment_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE UNIQUE INDEX payment_orders_provider_reference_unique ON public.payment_orders(provider, provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX payment_orders_user_created_idx ON public.payment_orders(user_id, created_at DESC);
