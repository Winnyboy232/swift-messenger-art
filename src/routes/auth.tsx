import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mail, Loader2, ArrowLeft, Shield, Zap, Users, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { SwiftyLogo } from "@/components/SwiftyLogo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { rememberAccount } from "@/lib/accounts";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { add?: boolean } =>
    search["add"] === true || search["add"] === "true" ? { add: true } : {},

  component: AuthPage,
});

type View = "welcome" | "methods" | "email";

function AuthPage() {
  const navigate = useNavigate();
  const { add } = Route.useSearch();
  const addingAccount = add === true;
  const [view, setView] = useState<View>(addingAccount ? "methods" : "welcome");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Bounce if already signed in (unless deliberately adding another account)
  useEffect(() => {
    if (addingAccount) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate, addingAccount]);

  const afterAuth = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return;
    const user = session.user;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, phone, onboarded, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    rememberAccount({
      userId: user.id,
      email: user.email ?? "",
      name:
        (profile as { display_name?: string | null } | null)?.display_name ||
        user.email?.split("@")[0] ||
        "Swift user",
      avatarUrl: (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    const done = (profile as { onboarded?: boolean } | null)?.onboarded === true;
    navigate({ to: done ? "/" : "/onboarding", replace: true });
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
      await afterAuth();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign in failed");
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setLoading(false);
        if (error.message.toLowerCase().includes("already")) {
          toast.error("That email already has an account — sign in instead");
          setMode("signin");
          return;
        }
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        setLoading(false);
        toast.error(error.message);
        return;
      }
    }
    await afterAuth();
    setLoading(false);
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
            onClick={() => setView(view === "email" ? "methods" : "welcome")}
            className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div key={view} className="flex flex-1 flex-col animate-in fade-in slide-in-from-right-4 duration-300">
          {view === "welcome" && <WelcomeView onProceed={() => setView("methods")} />}
          {view === "methods" && (
            <MethodsView
              loading={loading}
              addingAccount={addingAccount}
              onGoogle={handleGoogle}
              onEmail={(m) => {
                setMode(m);
                setView("email");
              }}
            />
          )}
          {view === "email" && (
            <EmailView
              mode={mode}
              setMode={setMode}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              loading={loading}
              onSubmit={handleSubmit}
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
          <p className="text-base font-semibold text-foreground">Fast. Secure. Connected.</p>
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
  addingAccount,
  onGoogle,
  onEmail,
}: {
  loading: boolean;
  addingAccount: boolean;
  onGoogle: () => void;
  onEmail: (mode: "signup" | "signin") => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-between py-4">
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <SwiftyLogo size={72} />
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {addingAccount ? "Add another account" : "Sign in to Swift"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Choose how you'd like to continue.</p>
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
            onClick={() => onEmail("signup")}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl px-4 text-[15px] font-semibold text-primary-foreground transition active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
          >
            <Mail size={18} />
            Sign up with Email
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => onEmail("signin")}
            className="flex h-12 w-full items-center justify-center text-sm font-semibold text-primary"
          >
            I already have an account
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        We'll never share your info without your permission.
      </p>
    </div>
  );
}

function EmailView({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  onSubmit,
}: {
  mode: "signup" | "signin";
  setMode: (m: "signup" | "signin") => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-1 flex-col justify-between py-4"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {mode === "signup" ? "Create your Swift account" : "Welcome back"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Just an email and password — no codes to wait for."
              : "Sign in with your email and password."}
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-[16px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 w-full rounded-2xl border border-border bg-card px-4 pr-12 text-[16px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New to Swift? Create an account"}
        </button>
      </div>
      <PrimaryButton disabled={loading} type="submit">
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            Continue <ArrowRight size={18} />
          </>
        )}
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
