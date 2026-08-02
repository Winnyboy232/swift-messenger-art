import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SwiftAIChat } from "@/components/ai/SwiftAIChat";
import { SwiftAIAvatar } from "@/components/ai/SwiftAIAvatar";

export const Route = createFileRoute("/ai")({
  ssr: false,
  component: AiRoute,
  head: () => ({
    meta: [
      { title: "Swift AI Assistant — Chat with Swift AI" },
      {
        name: "description",
        content:
          "Chat with Swift AI inside Swift messenger: free, unlimited text answers for every plan.",
      },
      { property: "og:title", content: "Swift AI Assistant" },
      {
        property: "og:description",
        content: "Free unlimited AI text chat built into the Swift messaging app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AiRoute() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-3 py-2.5">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate({ to: "/" })}
            className="text-muted-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <SwiftAIAvatar size={38} />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-foreground">Swift AI Assistant</h1>
            <p className="text-[11px] text-muted-foreground">Always online</p>
          </div>
        </header>
        <SwiftAIChat />
      </div>
    </div>
  );
}
