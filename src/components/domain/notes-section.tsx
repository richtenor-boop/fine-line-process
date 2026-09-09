import { createNoteAction } from "@/lib/modules/notes/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NoteRow {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string };
}

export function NotesSection({
  notes,
  leadId,
  propertyId,
  dealId,
}: {
  notes: NoteRow[];
  leadId?: string;
  propertyId?: string;
  dealId?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={createNoteAction} className="space-y-2">
          {leadId && <input type="hidden" name="leadId" value={leadId} />}
          {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
          {dealId && <input type="hidden" name="dealId" value={dealId} />}
          <Textarea name="body" rows={3} placeholder="Add a note..." required />
          <Button type="submit" variant="secondary" className="text-xs">
            Add note
          </Button>
        </form>

        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="border-t border-border pt-3 text-sm">
              <p className="whitespace-pre-wrap text-foreground">{note.body}</p>
              <p className="mt-1 text-xs text-muted">
                {note.author.name} · {note.createdAt.toLocaleString()}
              </p>
            </li>
          ))}
          {notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
