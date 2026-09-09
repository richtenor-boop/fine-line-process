import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import {
  getLeadsBySource,
  getLeadsByMarket,
  getLeadsByUser,
  getAppointmentsReport,
  getOffersReport,
  getContractsReport,
  getClosedDealsReport,
  getConversionRates,
  getFinancialsReport,
} from "@/lib/modules/reports/service";
import { listMarketingCosts } from "@/lib/modules/marketing-costs/service";
import { deleteMarketingCostAction } from "@/lib/modules/marketing-costs/actions";
import { REPORT_DEFINITIONS, isReportKey } from "@/lib/modules/reports/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangeForm } from "./date-range-form";
import { MarketingCostForm } from "./marketing-cost-form";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(1)}%`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function GroupedCountReport({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <CardContent className="space-y-2 pt-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 truncate text-foreground">{row.label}</span>
            <div className="h-2 flex-1 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-muted">{row.count}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">No data in this range.</p>}
      </CardContent>
    </Card>
  );
}

export default async function ReportPage({ params, searchParams }: PageProps<"/reports/[reportKey]">) {
  const { reportKey } = await params;
  if (!isReportKey(reportKey)) notFound();

  const session = await requirePermission("reports:view");
  const spParams = await searchParams;
  const orgId = session.user.organizationId;

  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo.getTime() - 30 * 86400000);
  const fromStr = first(spParams.from) || defaultFrom.toISOString().slice(0, 10);
  const toStr = first(spParams.to) || defaultTo.toISOString().slice(0, 10);
  const range = { from: new Date(fromStr), to: new Date(`${toStr}T23:59:59.999`) };

  const definition = REPORT_DEFINITIONS.find((r) => r.key === reportKey)!;

  let body: React.ReactNode = null;
  switch (reportKey) {
    case "leads-by-source":
      body = <GroupedCountReport rows={await getLeadsBySource(orgId, range)} />;
      break;
    case "leads-by-market":
      body = <GroupedCountReport rows={await getLeadsByMarket(orgId, range)} />;
      break;
    case "leads-by-user":
      body = <GroupedCountReport rows={await getLeadsByUser(orgId, range)} />;
      break;
    case "appointments": {
      const appointments = await getAppointmentsReport(orgId, range);
      body = (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Lead</th>
                  <th className="px-5 py-2 font-medium">Type</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      {a.lead ? (
                        <Link href={`/leads/${a.leadId}`} className="text-primary hover:underline">
                          {a.lead.contact.firstName} {a.lead.contact.lastName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{a.type.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-muted">{a.startAt.toLocaleString()}</td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-muted">
                      No appointments in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      );
      break;
    }
    case "offers": {
      const report = await getOffersReport(orgId, range);
      body = (
        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-2xl font-semibold text-foreground">{report.total} offers</p>
            <GroupedCountReport rows={report.byStatus} />
          </CardContent>
        </Card>
      );
      break;
    }
    case "contracts": {
      const report = await getContractsReport(orgId, range);
      body = (
        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-2xl font-semibold text-foreground">{report.total} contracts</p>
            <GroupedCountReport rows={report.byStatus} />
          </CardContent>
        </Card>
      );
      break;
    }
    case "closed-deals": {
      const deals = await getClosedDealsReport(orgId, range);
      body = (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Deal</th>
                  <th className="px-5 py-2 font-medium">Stage</th>
                  <th className="px-5 py-2 font-medium">Sale price</th>
                  <th className="px-5 py-2 font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/deals/${d.id}`} className="text-primary hover:underline">
                        {d.property?.addressLine1 ?? `${d.lead.contact.firstName} ${d.lead.contact.lastName}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{d.stage.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-muted">{d.salePrice ? fmtMoney(Number(d.salePrice)) : "—"}</td>
                    <td className="px-5 py-3 text-muted">{d.closedAt?.toLocaleDateString()}</td>
                  </tr>
                ))}
                {deals.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-muted">
                      No deals closed in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      );
      break;
    }
    case "conversion-rates": {
      const c = await getConversionRates(orgId, range);
      body = (
        <Card>
          <CardContent className="grid grid-cols-3 gap-6 pt-5">
            <Stat label="Leads" value={String(c.leads)} />
            <Stat label="Appointments" value={String(c.appointments)} />
            <Stat label="Offers" value={String(c.offers)} />
            <Stat label="Contracts signed" value={String(c.contracts)} />
            <Stat label="Closed won" value={String(c.closedWon)} />
            <Stat label="Lead → Closed" value={fmtPct(c.overallLeadToClosed)} />
            <Stat label="Lead → Appointment" value={fmtPct(c.leadToAppointment)} />
            <Stat label="Appointment → Offer" value={fmtPct(c.appointmentToOffer)} />
            <Stat label="Offer → Contract" value={fmtPct(c.offerToContract)} />
            <Stat label="Contract → Closed" value={fmtPct(c.contractToClosed)} />
          </CardContent>
        </Card>
      );
      break;
    }
    case "financials": {
      const [f, costs] = await Promise.all([
        getFinancialsReport(orgId, range),
        listMarketingCosts(orgId, range.from, range.to),
      ]);
      body = (
        <div className="space-y-4">
          <Card>
            <CardContent className="grid grid-cols-3 gap-6 pt-5">
              <Stat label="Marketing spend" value={fmtMoney(f.marketingSpend)} />
              <Stat label="Revenue" value={fmtMoney(f.revenue)} />
              <Stat label="Profit" value={fmtMoney(f.profit)} />
              <Stat label="Cost per lead" value={fmtMoney(f.costPerLead)} />
              <Stat label="Cost per contract" value={fmtMoney(f.costPerContract)} />
              <Stat label="Cost per deal" value={fmtMoney(f.costPerDeal)} />
              <Stat label="Pipeline value (as of now)" value={fmtMoney(f.pipelineValue)} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-5">
              <p className="text-sm font-medium text-foreground">Marketing spend ledger</p>
              <MarketingCostForm />
              <ul className="divide-y divide-border">
                {costs.map((cost) => (
                  <li key={cost.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {cost.description} {cost.campaign && `(${cost.campaign.name})`}
                    </span>
                    <span className="flex items-center gap-2 text-muted">
                      {fmtMoney(Number(cost.amount))} · {cost.incurredOn.toLocaleDateString()}
                      <form action={deleteMarketingCostAction}>
                        <input type="hidden" name="costId" value={cost.id} />
                        <Button type="submit" variant="ghost" className="text-xs text-danger">
                          Remove
                        </Button>
                      </form>
                    </span>
                  </li>
                ))}
                {costs.length === 0 && <p className="py-2 text-sm text-muted">No spend logged in this range.</p>}
              </ul>
            </CardContent>
          </Card>
        </div>
      );
      break;
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/reports" className="text-sm text-primary hover:underline">
          ← Reports
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{definition.label}</h1>
        <p className="text-sm text-muted">{definition.description}</p>
      </div>

      <DateRangeForm reportKey={reportKey} from={fromStr} to={toStr} />

      {body}
    </div>
  );
}
