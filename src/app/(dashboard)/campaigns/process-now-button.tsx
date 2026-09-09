"use client";

import { useState, useTransition } from "react";
import { processDueCampaignsAction } from "@/lib/modules/campaigns/actions";
import { Button } from "@/components/ui/button";

export function ProcessNowButton() {
  const [result, setResult] = useState<{ checked: number; processed: number } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await processDueCampaignsAction()))}
      >
        {pending ? "Processing..." : "Process due steps now"}
      </Button>
      {result && (
        <p className="text-xs text-muted">
          Checked {result.checked} enrollment(s), processed {result.processed} due step(s).
        </p>
      )}
    </div>
  );
}
