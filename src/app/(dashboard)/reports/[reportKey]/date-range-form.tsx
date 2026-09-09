import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DateRangeForm({ reportKey, from, to }: { reportKey: string; from: string; to: string }) {
  return (
    <form action={`/reports/${reportKey}`} className="flex items-end gap-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">From</label>
        <Input name="from" type="date" defaultValue={from} className="h-8 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">To</label>
        <Input name="to" type="date" defaultValue={to} className="h-8 text-sm" />
      </div>
      <Button type="submit" variant="secondary" className="text-xs">
        Apply
      </Button>
    </form>
  );
}
