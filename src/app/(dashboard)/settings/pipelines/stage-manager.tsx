"use client";

import { useActionState } from "react";
import {
  addStageAction,
  renameStageAction,
  moveStageAction,
  deleteStageAction,
  type AddStageState,
  type DeleteStageState,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface StageRow {
  id: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
  _count: { leads: number };
}

const addInitialState: AddStageState = {};
const deleteInitialState: DeleteStageState = {};

export function StageManager({ pipelineId, stages }: { pipelineId: string; stages: StageRow[] }) {
  const [addState, addFormAction, addPending] = useActionState(addStageAction, addInitialState);
  const [deleteState, deleteFormAction] = useActionState(deleteStageAction, deleteInitialState);

  return (
    <div className="space-y-2">
      {deleteState.error && <Alert variant="error">{deleteState.error}</Alert>}
      <ul className="divide-y divide-border rounded-md border border-border">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flex items-center gap-2 px-3 py-2">
            <div className="flex flex-col">
              <form action={moveStageAction}>
                <input type="hidden" name="stageId" value={stage.id} />
                <input type="hidden" name="direction" value="up" />
                <button type="submit" disabled={index === 0} className="text-xs text-muted disabled:opacity-30">
                  ▲
                </button>
              </form>
              <form action={moveStageAction}>
                <input type="hidden" name="stageId" value={stage.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={index === stages.length - 1}
                  className="text-xs text-muted disabled:opacity-30"
                >
                  ▼
                </button>
              </form>
            </div>
            <form action={renameStageAction} className="flex flex-1 items-center gap-2">
              <input type="hidden" name="stageId" value={stage.id} />
              <Input name="name" defaultValue={stage.name} className="h-8 flex-1 text-sm" />
              <Button type="submit" variant="ghost" className="text-xs">
                Save
              </Button>
            </form>
            {stage.isWon && <span className="text-xs font-medium text-success">Won</span>}
            {stage.isLost && <span className="text-xs font-medium text-danger">Lost</span>}
            <span className="w-16 shrink-0 text-right text-xs text-muted">{stage._count.leads} leads</span>
            <form action={deleteFormAction}>
              <input type="hidden" name="stageId" value={stage.id} />
              <Button type="submit" variant="ghost" className="text-xs text-danger">
                Delete
              </Button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addFormAction} className="flex items-center gap-2">
        <input type="hidden" name="pipelineId" value={pipelineId} />
        {addState.error && <Alert variant="error">{addState.error}</Alert>}
        <Input name="name" placeholder="New stage name" className="h-8 w-56 text-sm" required />
        <Button type="submit" variant="secondary" className="text-xs" disabled={addPending}>
          Add stage
        </Button>
      </form>
    </div>
  );
}
