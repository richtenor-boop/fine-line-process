import { requirePermission } from "@/lib/rbac";
import { listCustomFieldDefinitions } from "@/lib/modules/custom-fields/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateCustomFieldForm } from "./create-custom-field-form";
import { deleteCustomFieldAction } from "./actions";

export default async function CustomFieldsSettingsPage() {
  const session = await requirePermission("organization:manage");
  const definitions = await listCustomFieldDefinitions(session.user.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Custom fields</h1>

      <Card>
        <CardHeader>
          <CardTitle>New field</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateCustomFieldForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Applies to</th>
                <th className="px-5 py-2 font-medium">Label</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Required</th>
                <th className="px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((def) => (
                <tr key={def.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-muted">{def.entity}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{def.label}</td>
                  <td className="px-5 py-3 text-muted">{def.fieldType}</td>
                  <td className="px-5 py-3 text-muted">{def.isRequired ? "Yes" : "No"}</td>
                  <td className="px-5 py-3 text-right">
                    <form action={deleteCustomFieldAction}>
                      <input type="hidden" name="definitionId" value={def.id} />
                      <Button type="submit" variant="ghost" className="text-xs text-danger">
                        Delete
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {definitions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted">
                    No custom fields defined yet.
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
