interface PaystackHandler {
  openIframe: () => void;
}

interface PaystackSetupOptions {
  key: string;
  email: string;
  amount?: number;
  plan?: string;
  currency?: string;
  ref?: string;
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop?: { setup: (options: PaystackSetupOptions) => PaystackHandler };
  }
}

/** Live Paystack public key (publishable — safe in client code). */
const DEFAULT_PAYSTACK_PUBLIC_KEY = "pk_live_88d403c4b31a54fd88524f5ad30d8614e211229a";

export function getPaystackKey(): string {
  return (
    (import.meta.env['VITE_PAYSTACK_PUBLIC_KEY'] as string | undefined) ||
    DEFAULT_PAYSTACK_PUBLIC_KEY
  );
}


let loading: Promise<void> | null = null;

export function loadPaystack(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.PaystackPop) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Paystack"));
    document.body.appendChild(script);
  });
  return loading;
}

export interface CheckoutArgs {
  email: string;
  amountKobo?: number;
  planCode?: string;
  metadata?: Record<string, unknown>;
}

/** Opens Paystack inline checkout. Resolves with the reference on success, null when closed. */
export async function payWithPaystack({
  email,
  amountKobo,
  planCode,
  metadata,
}: CheckoutArgs): Promise<string | null> {
  const key = getPaystackKey();
  if (!key) throw new Error("Paystack public key is not configured");
  await loadPaystack();
  const paystack = window.PaystackPop;
  if (!paystack) throw new Error("Paystack failed to initialise");

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const handler = paystack.setup({
      key,
      email,
      currency: "NGN",
      ...(amountKobo ? { amount: amountKobo } : {}),
      ...(planCode ? { plan: planCode } : {}),
      ...(metadata ? { metadata } : {}),
      callback: (response) => {
        settled = true;
        resolve(response.reference);
      },
      onClose: () => {
        if (!settled) resolve(null);
      },
    });
    handler.openIframe();
  });
}
