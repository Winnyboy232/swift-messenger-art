import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Phone, Loader2, ArrowLeft, Shield, Zap, Users } from "lucide-react";
import { toast } from "sonner";
import { SwiftyLogo } from "@/components/SwiftyLogo";
import { CountryPicker } from "@/components/auth/CountryPicker";
import { DEFAULT_COUNTRY, isValidE164, toE164, type Country } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type View = "welcome" | "methods" | "phone" | "otp";

function AuthPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("welcome");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [e164, setE164] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Bounce if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        navigate({ to: "/", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const goTo = (next: View) => {
    setView(next);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) {
        toast.error(res.error.message || "Google sign in failed");
        setLoading(false);
        return;
      }
      if (res.redirected) return;
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign in failed");
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    // Strip zeros/spaces/hyphens and merge with the selected dialling code.
    const full = toE164(country.dial, phone);
    if (!isValidE164(full)) {
      toast.error(`Enter a valid ${country.name} phone number`);
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Enter a valid email address");
      return;
    }
    setE164(full);
    setLoading(true);
    // Verification happens by email; the phone number is stored on the profile.
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { data: { phone: full } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Verification code sent to ${cleanEmail}`);
    goTo("otp");
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      toast.error("Enter the code from your email");
      return;
    }
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: otp.trim(),
      type: "email",
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Sync the phone number onto the profile after email verification.
    const uid = data.user?.id;
    const full = e164 || toE164(country.dial, phone);
    if (uid) {
      await supabase.from("profiles").update({ phone: full }).eq("id", uid);
    }
    setLoading(false);
    toast.success("Signed in");
    navigate({ to: "/", replace: true });
  };


  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 15%, color-mix(in oklab, var(--swift-blue) 25%, transparent), transparent 55%), radial-gradient(circle at 50% 85%, color-mix(in oklab, var(--swift-purple) 22%, transparent), transparent 60%)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-6">
        {view !== "welcome" && (
          <button
            type="button"
            onClick={() => goTo(view === "otp" ? "phone" : view === "phone" ? "methods" : "welcome")}
            className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div key={view} className="flex flex-1 flex-col animate-in fade-in slide-in-from-right-4 duration-300">
          {view === "welcome" && <WelcomeView onProceed={() => goTo("methods")} />}
          {view === "methods" && (
            <MethodsView
              loading={loading}
              onGoogle={handleGoogle}
              onPhone={() => goTo("phone")}
            />
          )}
          {view === "phone" && (
            <PhoneView
              phone={phone}
              setPhone={setPhone}
              country={country}
              setCountry={setCountry}
              loading={loading}
              onSubmit={handleSendOtp}
            />
          )}
          {view === "otp" && (
            <OtpView
              phone={e164}
              otp={otp}
              setOtp={setOtp}
              loading={loading}
              onSubmit={handleVerifyOtp}
              onResend={handleSendOtp}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeView({ onProceed }: { onProceed: () => void }) {
  const features = [
    { Icon: Shield, title: "Secure", desc: "Your privacy is protected" },
    { Icon: Zap, title: "Fast", desc: "Built for speed and reliability" },
    { Icon: Users, title: "Connected", desc: "Bringing people closer together" },
  ];
  return (
    <div className="flex flex-1 flex-col items-center justify-between py-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <SwiftyLogo size={132} />
        <div className="space-y-3">
          <h1
            className="text-5xl font-extrabold tracking-tight leading-none"
            style={{
              background: "var(--gradient-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Swift
          </h1>
          <p className="text-base font-semibold text-foreground">
            Fast. Secure. Connected.
          </p>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
            Connect with friends, share moments, and discover what's happening around the world.
          </p>
        </div>
      </div>
      <div className="w-full space-y-6">
        <PrimaryButton onClick={onProceed}>
          Get Started <ArrowRight size={18} />
        </PrimaryButton>
        <div className="grid grid-cols-3 gap-2">
          {features.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card/60 px-2 py-3 text-center"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
              >
                <Icon size={16} className="text-primary-foreground" strokeWidth={2.4} />
              </span>
              <span className="text-[12px] font-semibold text-foreground">{title}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree to Swift's Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function MethodsView({
  loading,
  onGoogle,
  onPhone,
}: {
  loading: boolean;
  onGoogle: () => void;
  onPhone: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-between py-4">
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <SwiftyLogo size={72} />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Sign in to Swift</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose how you'd like to continue.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={onGoogle}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 text-[15px] font-semibold text-foreground transition hover:bg-card/70 active:scale-[0.99] disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onPhone}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 text-[15px] font-semibold text-foreground transition hover:bg-card/70 active:scale-[0.99] disabled:opacity-60"
          >
            <Phone size={18} className="text-primary" />
            Continue with Phone Number
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        We'll never share your info without your permission.
      </p>
    </div>
  );
}

function PhoneView({
  phone,
  setPhone,
  country,
  setCountry,
  loading,
  onSubmit,
}: {
  phone: string;
  setPhone: (v: string) => void;
  country: Country;
  setCountry: (c: Country) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  const preview = toE164(country.dial, phone);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-1 flex-col justify-between py-4"
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">What's your number?</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We'll send a one-time code by SMS to verify it's you.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="phone" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Phone number
          </label>
          <div className="flex gap-2">
            <CountryPicker value={country} onChange={setCountry} />
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoFocus
              placeholder="812 552 2479"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-14 w-full min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 text-[16px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {phone.trim()
              ? `We'll verify ${preview}`
              : "Leading zeros, spaces and hyphens are removed automatically."}
          </p>
        </div>
      </div>
      <PrimaryButton disabled={loading} type="submit">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <>Send OTP Code <ArrowRight size={18} /></>}
      </PrimaryButton>
    </form>
  );
}

function OtpView({
  phone,
  otp,
  setOtp,
  loading,
  onSubmit,
  onResend,
}: {
  phone: string;
  otp: string;
  setOtp: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onResend: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-1 flex-col justify-between py-4"
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Enter verification code</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="text-foreground">{phone}</span>.
          </p>
        </div>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          placeholder="••••••"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          className="h-16 w-full rounded-2xl border border-border bg-card px-4 text-center text-2xl font-semibold tracking-[0.5em] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
        >
          Resend code
        </button>
      </div>
      <PrimaryButton disabled={loading} type="submit">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <>Verify &amp; Continue <ArrowRight size={18} /></>}
      </PrimaryButton>
    </form>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-primary-foreground transition active:scale-[0.99] disabled:opacity-60"
      style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
    >
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.9 2 2.8 6.1 2.8 12S6.9 22 12 22c6.9 0 9.5-4.8 9.5-9.4 0-.6-.06-1.1-.14-1.6H12z"
      />
      <path
        fill="#4285F4"
        d="M21.36 11c.08.5.14 1 .14 1.6 0 4.6-2.6 9.4-9.5 9.4-2.6 0-4.8-.9-6.4-2.4l3-2.4c.8.6 2 1 3.4 1 3.8 0 5.26-2.7 5.5-4.1H12V11h9.36z"
      />
      <path fill="#FBBC05" d="M5.6 14.1a6.3 6.3 0 0 1 0-4.2L2.6 7.5a10 10 0 0 0 0 9l3-2.4z" />
      <path fill="#34A853" d="M12 5.8c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 8.2 2 4.9 4.2 3.4 7.5l3 2.4C7.2 7.5 9.4 5.8 12 5.8z" />
    </svg>
  );
}
