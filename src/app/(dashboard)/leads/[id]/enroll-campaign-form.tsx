import { enrollLeadAction } from "@/lib/modules/campaigns/actions";
import { Button } from "@/components/ui/button";

export function EnrollCampaignForm({ leadId, campaigns }: { leadId: string; campaigns: { id: string; name: string }[] }) {
  if (campaigns.length === 0) return null;

  return (
    <form action={enrollLeadAction} className="flex items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <select name="campaignId" className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-sm">
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" className="text-xs">
        Enroll
      </Button>
    </form>
  );
}
