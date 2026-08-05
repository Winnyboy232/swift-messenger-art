import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CountryPicker } from "@/components/auth/CountryPicker";
import { DEFAULT_COUNTRY, isValidE164, toE164, type Country } from "@/lib/phone";
import { SwiftyLogo } from "@/components/SwiftyLogo";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  component: Onboarding,
  head: () => ({
    meta: [
      { title: "Set up your Swift profile" },
      {
        name: "description",
        content: "Add your name, phone number, nickname and photo to finish setting up Swift.",
      },
      { property: "og:title", content: "Set up your Swift profile" },
      {
        property: "og:description",
        content: "Finish creating your Swift account in one quick step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const MAX_ACCOUNTS_PER_PHONE = 3;

function Onboarding() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setUserId(data.user.id);
      const meta = data.user.user_metadata ?? {};
      setFullName(
        (meta["full_name"] as string) ||
          (meta["name"] as string) ||
          data.user.email?.split("@")[0] ||
          "",
      );
    });
  }, [navigate]);

  const handleSubmit = async () => {
    if (!userId) return;
    if (!fullName.trim()) {
      toast.error("Enter your full name");
      return;
    }
    const e164 = toE164(country.dial, phone);
    if (!isValidE164(e164)) {
      toast.error(`Enter a valid ${country.name} phone number`);
      return;
    }
    setSaving(true);

    // Enforce a maximum of 3 accounts per phone number.
    const { data: slots, error: slotError } = await supabase.rpc(
      "phone_account_slots" as never,
      { _phone: e164 } as never,
    );
    if (!slotError && typeof slots === "number" && slots >= MAX_ACCOUNTS_PER_PHONE) {
      setSaving(false);
      toast.error(
        `This phone number is already linked to the maximum allowed accounts (${MAX_ACCOUNTS_PER_PHONE}).`,
      );
      return;
    }

    let avatarUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatars/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("swifty-media").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) {
        toast.error("Couldn't upload your photo — you can add it later");
      } else {
        const { data: signed } = await supabase.storage
          .from("swifty-media")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        avatarUrl = signed?.signedUrl ?? null;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: fullName.trim(),
        nickname: nickname.trim() || null,
        phone: e164,
        onboarded: true,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      } as never)
      .eq("id", userId);

    setSaving(false);
    if (error) {
      if (error.message.includes("PHONE_ACCOUNT_LIMIT")) {
        toast.error(
          `This phone number is already linked to the maximum allowed accounts (${MAX_ACCOUNTS_PER_PHONE}).`,
        );
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("Welcome to Swift");
    navigate({ to: "/", replace: true });
  };

  return (
    <div
      className="relative flex min-h-screen flex-col bg-background text-foreground"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--swift-purple) 22%, transparent), transparent 55%)",
        }}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-8"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <SwiftyLogo size={56} />
          <h1 className="text-2xl font-bold text-foreground">Set up your profile</h1>
          <p className="text-sm text-muted-foreground">
            Tell us a little about you before you start chatting.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <label className="relative cursor-pointer">
            <span
              className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-primary-foreground"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            >
              {preview ? (
                <img src={preview} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <Camera size={26} />
              )}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
          <p className="text-xs text-muted-foreground">Tap to upload a profile picture</p>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Full name" htmlFor="full-name">
            <input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
              className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-[16px] text-foreground outline-none focus:border-primary"
            />
          </Field>

          <Field label="Phone number" htmlFor="phone">
            <div className="flex gap-2">
              <CountryPicker value={country} onChange={setCountry} />
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="812 552 2479"
                className="h-14 w-full min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 text-[16px] text-foreground outline-none focus:border-primary"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Up to {MAX_ACCOUNTS_PER_PHONE} Swift accounts can share one phone number.
            </p>
          </Field>

          <Field label="Nickname" htmlFor="nickname">
            <input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="What friends call you"
              className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-[16px] text-foreground outline-none focus:border-primary"
            />
          </Field>
        </div>

        <div className="flex-1" />
        <button
          type="submit"
          disabled={saving}
          className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Enter Swift <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
