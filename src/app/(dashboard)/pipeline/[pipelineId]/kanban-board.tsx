"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { moveLeadStageAction } from "@/lib/modules/leads/actions";
import { cn } from "@/lib/cn";

interface LeadCard {
  id: string;
  contact: { firstName: string; lastName: string };
  property: { addressLine1: string; city: string } | null;
  assignedUser: { name: string } | null;
  motivation: string;
}

interface StageColumn {
  id: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
  leads: LeadCard[];
}

export function KanbanBoard({ pipelineId, stages }: { pipelineId: string; stages: StageColumn[] }) {
  const [board, setBoard] = useState(stages);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDrop(targetStageId: string) {
    if (!draggingLeadId) return;
    const leadId = draggingLeadId;
    setDraggingLeadId(null);

    setBoard((prev) => {
      let movedLead: LeadCard | undefined;
      const withoutLead = prev.map((col) => {
        const found = col.leads.find((l) => l.id === leadId);
        if (found) movedLead = found;
        return { ...col, leads: col.leads.filter((l) => l.id !== leadId) };
      });
      if (!movedLead) return prev;
      return withoutLead.map((col) => (col.id === targetStageId ? { ...col, leads: [movedLead!, ...col.leads] } : col));
    });

    startTransition(async () => {
      await moveLeadStageAction(leadId, targetStageId, pipelineId);
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {board.map((stage) => (
        <div
          key={stage.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(stage.id)}
          className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-slate-50"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p
              className={cn(
                "text-sm font-medium",
                stage.isWon && "text-success",
                stage.isLost && "text-danger",
                !stage.isWon && !stage.isLost && "text-foreground",
              )}
            >
              {stage.name}
            </p>
            <span className="text-xs text-muted">{stage.leads.length}</span>
          </div>
          <div className="flex-1 space-y-2 p-2">
            {stage.leads.map((lead) => (
              <div
                key={lead.id}
                draggable
                onDragStart={() => setDraggingLeadId(lead.id)}
                className="cursor-grab rounded-md border border-border bg-white p-2.5 text-sm shadow-sm active:cursor-grabbing"
              >
                <Link href={`/leads/${lead.id}`} className="font-medium text-foreground hover:text-primary">
                  {lead.contact.firstName} {lead.contact.lastName}
                </Link>
                {lead.property && (
                  <p className="mt-0.5 text-xs text-muted">
                    {lead.property.addressLine1}, {lead.property.city}
                  </p>
                )}
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
                  <span>{lead.assignedUser?.name ?? "Unassigned"}</span>
                  {lead.motivation !== "UNKNOWN" && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5">{lead.motivation}</span>
                  )}
                </div>
              </div>
            ))}
            {stage.leads.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted">No leads</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
