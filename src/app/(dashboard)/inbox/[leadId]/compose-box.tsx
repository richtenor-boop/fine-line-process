"use client";

import { useActionState, useState } from "react";
import {
  sendSmsAction,
  sendEmailAction,
  logCallAction,
  logInboundAction,
  type CommsActionState,
} from "@/lib/modules/communications/actions";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

type Tab = "sms" | "email" | "call" | "simulate";
const initialState: CommsActionState = {};

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

export function ComposeBox({
  leadId,
  phones,
  emails,
}: {
  leadId: string;
  phones: PhoneOption[];
  emails: EmailOption[];
}) {
  const [tab, setTab] = useState<Tab>("sms");

  return (
    <div>
      <div className="flex gap-1 border-b border-border">
        {(["sms", "email", "call", "simulate"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === t ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {t === "sms" ? "SMS" : t === "email" ? "Email" : t === "call" ? "Log Call" : "Simulate Inbound"}
          </button>
        ))}
      </div>
      <div className="pt-3">
        {tab === "sms" && <SmsForm leadId={leadId} phones={phones} />}
        {tab === "email" && <EmailForm leadId={leadId} emails={emails} />}
        {tab === "call" && <CallForm leadId={leadId} phones={phones} />}
        {tab === "simulate" && <SimulateForm leadId={leadId} phones={phones} emails={emails} />}
      </div>
    </div>
  );
}

function SmsForm({ leadId, phones }: { leadId: string; phones: PhoneOption[] }) {
  const [state, formAction, pending] = useActionState(sendSmsAction, initialState);
  const eligible = phones.filter((p) => !p.smsOptedOut);

  if (eligible.length === 0) {
    return <Alert variant="error">No number on file can receive SMS (all opted out).</Alert>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Select name="phoneNumberId" className="h-8 text-sm">
        {eligible.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number}
          </option>
        ))}
      </Select>
      <Textarea name="body" rows={2} placeholder="Message..." required />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send SMS"}
      </Button>
    </form>
  );
}

function EmailForm({ leadId, emails }: { leadId: string; emails: EmailOption[] }) {
  const [state, formAction, pending] = useActionState(sendEmailAction, initialState);
  const eligible = emails.filter((e) => !e.unsubscribed);

  if (eligible.length === 0) {
    return <Alert variant="error">No email on file can receive mail (unsubscribed).</Alert>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Select name="emailAddressId" className="h-8 text-sm">
        {eligible.map((e) => (
          <option key={e.id} value={e.id}>
            {e.email}
          </option>
        ))}
      </Select>
      <Input name="subject" placeholder="Subject" required />
      <Textarea name="bodyHtml" rows={4} placeholder="Message..." required />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send Email"}
      </Button>
    </form>
  );
}

function CallForm({ leadId, phones }: { leadId: string; phones: PhoneOption[] }) {
  const [state, formAction, pending] = useActionState(logCallAction, initialState);

  if (phones.length === 0) {
    return <Alert variant="error">No phone number on file for this lead.</Alert>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        <Select name="phoneNumberId" className="h-8 text-sm">
          {phones.map((p) => (
            <option key={p.id} value={p.id}>
              {p.number}
              {p.isDncListed ? " (DNC)" : ""}
            </option>
          ))}
        </Select>
        <Select name="direction" className="h-8 text-sm" defaultValue="OUTBOUND">
          <option value="OUTBOUND">Outbound</option>
          <option value="INBOUND">Inbound</option>
        </Select>
        <Select name="disposition" className="h-8 text-sm" defaultValue="">
          <option value="">No disposition</option>
          <option value="INTERESTED">Interested</option>
          <option value="FOLLOW_UP">Follow-Up</option>
          <option value="APPOINTMENT_SET">Appointment Set</option>
          <option value="NOT_INTERESTED">Not Interested</option>
          <option value="WRONG_NUMBER">Wrong Number</option>
          <option value="DISCONNECTED">Disconnected</option>
          <option value="DNC">DNC</option>
          <option value="NEEDS_MORE_INFO">Needs More Info</option>
        </Select>
        <Input name="durationSeconds" type="number" min={0} placeholder="Duration (sec)" className="h-8 text-sm" />
      </div>
      <Textarea name="notes" rows={2} placeholder="Call notes..." />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Log call"}
      </Button>
    </form>
  );
}

function SimulateForm({
  leadId,
  phones,
  emails,
}: {
  leadId: string;
  phones: PhoneOption[];
  emails: EmailOption[];
}) {
  const [state, formAction, pending] = useActionState(logInboundAction, initialState);
  const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <p className="text-xs text-muted">
        No real telephony/email provider is connected yet — this logs a message as if it had
        arrived, standing in for a provider webhook (see docs/06-integrations.md). Sending
        &quot;STOP&quot; here auto-opts the number out of SMS, same as a real webhook would.
      </p>
      <Select name="channel" value={channel} onChange={(e) => setChannel(e.target.value as "SMS" | "EMAIL")} className="h-8 text-sm">
        <option value="SMS">SMS</option>
        <option value="EMAIL">Email</option>
      </Select>
      {channel === "SMS" ? (
        <Select name="phoneNumberId" className="h-8 text-sm">
          {phones.map((p) => (
            <option key={p.id} value={p.id}>
              {p.number}
            </option>
          ))}
        </Select>
      ) : (
        <>
          <Select name="emailAddressId" className="h-8 text-sm">
            {emails.map((e) => (
              <option key={e.id} value={e.id}>
                {e.email}
              </option>
            ))}
          </Select>
          <Input name="subject" placeholder="Subject" />
        </>
      )}
      <Textarea name="body" rows={2} placeholder="Message body..." required />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Logging..." : "Log inbound"}
      </Button>
    </form>
  );
}
