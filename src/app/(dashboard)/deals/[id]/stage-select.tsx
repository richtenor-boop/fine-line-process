"use client";

import { updateDealStageAction } from "@/lib/modules/deals/actions";
import { DEAL_STAGE_LABELS } from "@/lib/modules/deals/schema";
import type { DealStage } from "@prisma/client";

export function StageSelect({ dealId, stage }: { dealId: string; stage: DealStage }) {
  return (
    <form action={updateDealStageAction}>
      <input type="hidden" name="dealId" value={dealId} />
      <select
        name="stage"
        defaultValue={stage}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-full border border-border bg-slate-100 px-3 py-1 text-sm font-medium text-foreground"
      >
        {(Object.keys(DEAL_STAGE_LABELS) as DealStage[]).map((s) => (
          <option key={s} value={s}>
            {DEAL_STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
