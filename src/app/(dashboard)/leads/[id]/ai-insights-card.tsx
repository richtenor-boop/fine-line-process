"use client";

import { useState, useTransition } from "react";
import { scoreLeadAction } from "@/lib/modules/ai/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AiInsightsCard({
  leadId,
  initialScore,
  initialReason,
  isLive,
}: {
  leadId: string;
  initialScore: number | null;
  initialReason: string | null;
  isLive: boolean;
}) {
  const [score, setScore] = useState(initialScore);
  const [reason, setReason] = useState(initialReason);
  const [pending, startTransition] = useTransition();

  const scoreColor = score === null ? "text-muted" : score >= 70 ? "text-success" : score >= 40 ? "text-amber-600" : "text-danger";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Insights</CardTitle>
        <span className="text-[10px] uppercase tracking-wide text-muted">{isLive ? "Claude" : "Heuristic"}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {score !== null ? (
          <>
            <p className={`text-2xl font-semibold ${scoreColor}`}>{score}/100</p>
            <pre className="whitespace-pre-wrap font-sans text-xs text-muted">{reason}</pre>
          </>
        ) : (
          <p className="text-sm text-muted">Not yet analyzed.</p>
        )}
        <Button
          variant="secondary"
          className="w-full text-xs"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await scoreLeadAction(leadId);
              setScore(result.score);
              setReason(
                [
                  `Motivation: ${result.motivationLabel}`,
                  "Reason:",
                  ...result.reasons.map((r) => `- ${r}`),
                  "",
                  `Recommended Action: ${result.recommendedAction}`,
                ].join("\n"),
              );
            })
          }
        >
          {pending ? "Analyzing..." : "Re-analyze"}
        </Button>
        <p className="text-[10px] text-muted">
          Advisory only — a recommendation for a human to act on, never an automatic action. See
          docs/06-integrations.md.
        </p>
      </CardContent>
    </Card>
  );
}
