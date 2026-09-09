import { assignTagAction, removeTagAction } from "@/lib/modules/tags/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TagAssignmentRow {
  tagId: string;
  tag: { name: string; color: string | null };
}

export function TagsSection({ leadId, tags }: { leadId: string; tags: TagAssignmentRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tags</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <form key={t.tagId} action={removeTagAction} className="inline-flex">
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="tagId" value={t.tagId} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-slate-200"
              title="Remove tag"
            >
              {t.tag.name} <span aria-hidden>×</span>
            </button>
          </form>
        ))}
      </div>
      <form action={assignTagAction} className="flex items-center gap-2">
        <input type="hidden" name="leadId" value={leadId} />
        <Input name="tagName" placeholder="Add a tag..." className="h-8 w-40 text-xs" />
        <Button type="submit" variant="ghost" className="text-xs">
          Add
        </Button>
      </form>
    </div>
  );
}
