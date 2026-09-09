"use client";

import { useState, useTransition } from "react";
import { summarizeConversationAction } from "@/lib/modules/ai/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function SummarizeButton({ leadId }: { leadId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {summary && <Alert variant="success">{summary}</Alert>}
      <Button
        variant="secondary"
        className="text-xs"
        disabled={pending}
        onClick={() => startTransition(async () => setSummary(await summarizeConversationAction(leadId)))}
      >
        {pending ? "Summarizing..." : "Summarize conversation (AI)"}
      </Button>
    </div>
  );
}
