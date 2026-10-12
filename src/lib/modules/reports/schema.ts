export const REPORT_DEFINITIONS = [
  { key: "leads-by-source", label: "Leads by Source", description: "New leads grouped by lead source." },
  { key: "leads-by-market", label: "Leads by Market", description: "New leads grouped by property state." },
  { key: "leads-by-user", label: "Leads by User", description: "New leads grouped by assigned user." },
  { key: "appointments", label: "Appointments", description: "Appointments scheduled in the date range." },
  { key: "offers", label: "Offers", description: "Offers created, grouped by status." },
  { key: "contracts", label: "Contracts", description: "Contracts created, grouped by status." },
  { key: "closed-deals", label: "Closed Deals", description: "Deals that closed (won or lost) in the date range." },
  { key: "conversion-rates", label: "Conversion Rates", description: "Lead → Appointment → Offer → Contract → Closed funnel." },
  { key: "speed-to-lead", label: "Speed to Lead", description: "How fast new leads get their first outbound call, text, or email." },
  { key: "financials", label: "Financials", description: "Marketing spend, cost per lead/contract/deal, revenue, profit, pipeline value." },
] as const;

export type ReportKey = (typeof REPORT_DEFINITIONS)[number]["key"];

export function isReportKey(value: string): value is ReportKey {
  return REPORT_DEFINITIONS.some((r) => r.key === value);
}
