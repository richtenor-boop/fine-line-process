import { requirePermission } from "@/lib/rbac";
import { getTelephonyProvider } from "@/lib/integrations/telephony";
import { getEmailProvider } from "@/lib/integrations/email";
import { getAiProvider } from "@/lib/integrations/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatusBadge({ isLive }: { isLive: boolean }) {
  return (
    <span
      className={
        isLive
          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
          : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
      }
    >
      {isLive ? "LIVE" : "MOCKED"}
    </span>
  );
}

export default async function IntegrationsSettingsPage() {
  await requirePermission("integrations:manage");

  const telephony = getTelephonyProvider();
  const email = getEmailProvider();
  const ai = getAiProvider();

  const integrations = [
    {
      name: "SMS & Voice",
      provider: telephony.name,
      isLive: telephony.isLive,
      envVar: "TWILIO_ACCOUNT_SID",
      note: "Sends and calls are logged to the database exactly as a real send would be, but nothing reaches a real phone network yet.",
    },
    {
      name: "Email",
      provider: email.name,
      isLive: email.isLive,
      envVar: "SENDGRID_API_KEY",
      note: "Outbound email is logged to the database; no real mail is delivered yet.",
    },
    {
      name: "AI Assistant",
      provider: ai.name,
      isLive: ai.isLive,
      envVar: "ANTHROPIC_API_KEY",
      note: ai.isLive
        ? "Lead scoring and conversation summaries call the real Claude API."
        : "Lead scoring and conversation summaries use a deterministic rule-based heuristic — same output shape as the real thing, no network call.",
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted">
          See <span className="font-mono text-xs">docs/06-integrations.md</span> for what each
          integration needs to go live.
        </p>
      </div>

      {integrations.map((integration) => (
        <Card key={integration.name}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{integration.name}</CardTitle>
            <StatusBadge isLive={integration.isLive} />
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted">
            <p>Provider: {integration.provider}</p>
            <p>{integration.note}</p>
            <p className="text-xs">
              Set <span className="font-mono">{integration.envVar}</span> (and related vars) to
              connect a real provider{integration.isLive ? "" : " once one is implemented"}.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
