import { setDncAction, setSmsOptOutAction, setEmailUnsubscribedAction } from "@/lib/modules/compliance/actions";
import { Button } from "@/components/ui/button";

interface PhoneOption {
  id: string;
  number: string;
  isDncListed: boolean;
  smsOptedOut: boolean;
}
interface EmailOption {
  id: string;
  email: string;
  unsubscribed: boolean;
}

export function CompliancePanel({
  leadId,
  phones,
  emails,
}: {
  leadId: string;
  phones: PhoneOption[];
  emails: EmailOption[];
}) {
  return (
    <div className="space-y-3 text-sm">
      {phones.map((p) => (
        <div key={p.id} className="flex items-center justify-between">
          <div>
            <p className="text-foreground">{p.number}</p>
            <div className="flex gap-1">
              {p.isDncListed && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-danger">DNC</span>}
              {p.smsOptedOut && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">SMS opt-out</span>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <form action={setDncAction}>
              <input type="hidden" name="phoneNumberId" value={p.id} />
              <input type="hidden" name="leadId" value={leadId} />
              <input type="hidden" name="isDncListed" value={(!p.isDncListed).toString()} />
              <Button type="submit" variant="ghost" className="text-xs">
                {p.isDncListed ? "Clear DNC" : "Mark DNC"}
              </Button>
            </form>
            <form action={setSmsOptOutAction}>
              <input type="hidden" name="phoneNumberId" value={p.id} />
              <input type="hidden" name="leadId" value={leadId} />
              <input type="hidden" name="smsOptedOut" value={(!p.smsOptedOut).toString()} />
              <Button type="submit" variant="ghost" className="text-xs">
                {p.smsOptedOut ? "Re-enable SMS" : "SMS opt-out"}
              </Button>
            </form>
          </div>
        </div>
      ))}
      {emails.map((e) => (
        <div key={e.id} className="flex items-center justify-between">
          <div>
            <p className="text-foreground">{e.email}</p>
            {e.unsubscribed && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Unsubscribed</span>
            )}
          </div>
          <form action={setEmailUnsubscribedAction}>
            <input type="hidden" name="emailAddressId" value={e.id} />
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="unsubscribed" value={(!e.unsubscribed).toString()} />
            <Button type="submit" variant="ghost" className="text-xs">
              {e.unsubscribed ? "Resubscribe" : "Unsubscribe"}
            </Button>
          </form>
        </div>
      ))}
      {phones.length === 0 && emails.length === 0 && <p className="text-muted">No phone or email on file.</p>}
    </div>
  );
}
