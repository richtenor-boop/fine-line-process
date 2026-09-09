import { requirePermission } from "@/lib/rbac";
import { listTags } from "@/lib/modules/tags/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTagForm } from "./create-tag-form";
import { deleteTagAction } from "./actions";

export default async function TagsSettingsPage() {
  const session = await requirePermission("organization:manage");
  const tags = await listTags(session.user.organizationId);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Tags</h1>

      <Card>
        <CardHeader>
          <CardTitle>New tag</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTagForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Used on leads</th>
                <th className="px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-foreground">{tag.name}</td>
                  <td className="px-5 py-3 text-muted">{tag._count.leadTags}</td>
                  <td className="px-5 py-3 text-right">
                    <form action={deleteTagAction}>
                      <input type="hidden" name="tagId" value={tag.id} />
                      <Button type="submit" variant="ghost" className="text-xs text-danger">
                        Delete
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {tags.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-muted">
                    No tags yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
