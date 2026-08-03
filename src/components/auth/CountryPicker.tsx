import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { COUNTRIES, type Country } from "@/lib/phone";

interface Props {
  value: Country;
  onChange: (c: Country) => void;
}

/** Interactive dialling-code selector shown beside the phone input. */
export function CountryPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase() === q,
    );
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Select country code"
        className="flex h-14 shrink-0 items-center gap-1.5 rounded-2xl border border-border bg-card px-3 text-[15px] font-semibold text-foreground transition hover:bg-card/70"
      >
        <span className="text-lg leading-none">{value.flag}</span>
        {value.dial}
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground"
            >
              <X size={20} />
            </button>
            <h2 className="text-base font-bold text-foreground">Select country</h2>
          </header>
          <div className="px-4 py-3">
            <div className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4">
              <Search size={15} className="text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code..."
                className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {results.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 border-b border-border/50 py-3 text-left"
              >
                <span className="text-xl leading-none">{c.flag}</span>
                <span className="flex-1 truncate text-sm text-foreground">{c.name}</span>
                <span className="text-sm font-semibold text-muted-foreground">{c.dial}</span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
