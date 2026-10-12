/**
 * Purchase-agreement templates. Pure functions (no I/O) so every template is unit tested.
 *
 * These are plain-language starting drafts for an investor's own use, not attorney-drafted forms:
 * every rendered contract carries a prominent "have an attorney review" notice, and state-specific
 * disclosures (lead paint, seller's property disclosure, etc.) are deliberately left to the
 * closing attorney.
 */
import { CONTRACT_TYPE_LABELS, type GenerateContractInput } from "./schema";

export interface ContractSection {
  heading: string;
  paragraphs: string[];
}

export interface RenderedContract {
  title: string;
  notice: string;
  sections: ContractSection[];
  signatureParties: { role: string; name: string }[];
}

export const ATTORNEY_REVIEW_NOTICE =
  "DRAFT — NOT LEGAL ADVICE. This agreement was generated from a template. Have a licensed real estate attorney in the state where the property is located review it before anyone signs.";

function usd(n: number | undefined): string {
  return `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function longDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function partiesAndProperty(f: GenerateContractInput): ContractSection[] {
  return [
    {
      heading: "1. Parties",
      paragraphs: [
        `This agreement is between ${f.sellerNames} ("Seller") and ${f.buyerName} ("Buyer").`,
      ],
    },
    {
      heading: "2. Property",
      paragraphs: [
        `The real property located at ${f.propertyAddress}${f.parcelNumber ? ` (Parcel No. ${f.parcelNumber})` : ""}, together with all improvements, fixtures, and appurtenances (the "Property").`,
      ],
    },
  ];
}

function closingTerms(f: GenerateContractInput, n: number): ContractSection[] {
  return [
    {
      heading: `${n}. Earnest Money`,
      paragraphs: [
        `Buyer will deposit ${usd(f.earnestMoney)} as earnest money with ${f.closingAgent} within three (3) business days after both parties sign. It is credited to Buyer at closing.`,
      ],
    },
    {
      heading: `${n + 1}. Inspection Period`,
      paragraphs: [
        `Buyer has ${f.inspectionDays} days after both parties sign to inspect the Property. Seller will give Buyer and Buyer's inspectors, contractors, and prospective partners reasonable access. Buyer may cancel for any reason during this period by written notice and receive a full refund of the earnest money.`,
      ],
    },
    {
      heading: `${n + 2}. Closing`,
      paragraphs: [
        `Closing will take place on or before ${longDate(f.closingDate)} at ${f.closingAgent}, or another closing agent Buyer selects. Seller will convey marketable title by general warranty deed, free of liens and encumbrances except as stated in this agreement.`,
      ],
    },
    {
      heading: `${n + 3}. Condition of Property`,
      paragraphs: [
        "Buyer is purchasing the Property in its present \"as-is\" condition. Seller will maintain the Property in its current condition until closing and will disclose any known material defects in writing.",
      ],
    },
    {
      heading: `${n + 4}. Assignment`,
      paragraphs: [
        "Buyer may assign this agreement, in whole or in part, without Seller's consent. Seller acknowledges that Buyer may profit from an assignment.",
      ],
    },
  ];
}

function boilerplate(f: GenerateContractInput, n: number): ContractSection[] {
  const sections: ContractSection[] = [];
  if (f.additionalTerms) sections.push({ heading: `${n}. Additional Terms`, paragraphs: [f.additionalTerms] });
  sections.push({
    heading: `${n + sections.length}. Entire Agreement`,
    paragraphs: [
      "This is the entire agreement between the parties. Changes must be in writing and signed by both parties. This agreement is governed by the laws of the state where the Property is located. Electronic signatures and counterparts are valid.",
    ],
  });
  return sections;
}

function cash(f: GenerateContractInput): ContractSection[] {
  return [
    ...partiesAndProperty(f),
    {
      heading: "3. Purchase Price",
      paragraphs: [
        `The purchase price is ${usd(f.purchasePrice)}, paid in cash or certified funds at closing. This purchase is not contingent on Buyer obtaining financing.`,
      ],
    },
    ...closingTerms(f, 4),
    {
      heading: "9. Closing Costs",
      paragraphs: [
        "Buyer pays its own closing costs. Seller pays the cost of any liens, mortgages, judgments, and unpaid taxes needed to deliver clear title. Property taxes are prorated to the closing date.",
      ],
    },
    ...boilerplate(f, 10),
  ];
}

function novation(f: GenerateContractInput): ContractSection[] {
  return [
    ...partiesAndProperty(f),
    {
      heading: "3. Seller's Net Amount",
      paragraphs: [
        `Buyer will market the Property for sale to a retail purchaser. When the Property sells, Seller will receive a net amount of ${usd(f.purchasePrice)} (the "Seller's Net") at closing, after payoff of Seller's existing liens. Any sale proceeds above the Seller's Net, after closing and selling costs, belong to Buyer as compensation for its services and expenses.`,
      ],
    },
    {
      heading: "4. Marketing Period",
      paragraphs: [
        `Buyer has ${f.marketingDays} days after both parties sign to find a retail purchaser and close (the "Marketing Period"). If the Property has not closed by the end of the Marketing Period, either party may end this agreement by written notice, and neither will owe the other anything further.`,
      ],
    },
    {
      heading: "5. Improvements",
      paragraphs: [
        `Buyer may make cosmetic repairs and improvements at Buyer's expense${f.repairBudget ? `, budgeted at up to ${usd(f.repairBudget)}` : ""}, to prepare the Property for sale. If this agreement ends without a sale, Buyer will be reimbursed for documented improvement costs from the proceeds of any sale of the Property within 12 months.`,
      ],
    },
    {
      heading: "6. Novation of Retail Contract",
      paragraphs: [
        "When Buyer finds a retail purchaser, Seller will sign a purchase contract directly with that purchaser on terms Buyer negotiates, replacing (novating) Buyer's position, provided Seller still receives at least the Seller's Net. Seller will not list or sell the Property with anyone else during the Marketing Period.",
      ],
    },
    {
      heading: "7. Seller Acknowledgments",
      paragraphs: [
        "Seller understands that Buyer is not acting as Seller's real estate agent or broker, that Seller may seek independent legal and real estate advice before signing, and that the retail sale price may be substantially higher than the Seller's Net.",
      ],
    },
    {
      heading: "8. Access and Earnest Money",
      paragraphs: [
        `Buyer will deposit ${usd(f.earnestMoney)} as earnest money with ${f.closingAgent}. Seller will give Buyer reasonable access for photographs, showings, contractors, and inspections. The retail closing will take place at ${f.closingAgent} on or before ${longDate(f.closingDate)} unless extended in writing.`,
      ],
    },
    ...boilerplate(f, 9),
  ];
}

function subjectTo(f: GenerateContractInput): ContractSection[] {
  const cashToSeller = f.cashToSeller ?? 0;
  return [
    ...partiesAndProperty(f),
    {
      heading: "3. Purchase Price",
      paragraphs: [
        `The purchase price is ${usd(f.purchasePrice)}, paid as follows: (a) Buyer takes title subject to the existing loan with ${f.lenderName}${f.loanNumber ? ` (Loan No. ${f.loanNumber})` : ""}, which has an approximate unpaid balance of ${usd(f.loanBalance)}; and (b) ${usd(cashToSeller)} paid to Seller at closing.`,
      ],
    },
    {
      heading: "4. Existing Loan",
      paragraphs: [
        `The existing loan stays in Seller's name. Beginning with the first payment due after closing, Buyer will make the monthly payment of approximately ${usd(f.monthlyPayment)} directly to the lender or servicer.${f.loanArrears ? ` At closing, Buyer will pay ${usd(f.loanArrears)} to bring the loan current.` : ""} Seller will give Buyer written authorization to obtain loan information from the lender and will forward any lender correspondence to Buyer within five (5) days.`,
      ],
    },
    {
      heading: "5. Due-on-Sale Disclosure",
      paragraphs: [
        "Seller understands that the existing loan likely contains a \"due-on-sale\" clause that allows the lender to demand full payment if the Property is transferred. Seller understands that the loan will remain on Seller's credit, that late or missed payments by Buyer would affect Seller's credit, and that Buyer does not guarantee the lender will not call the loan due. If the lender calls the loan due, Buyer will refinance or otherwise pay off the loan within a reasonable time.",
      ],
    },
    {
      heading: "6. Insurance and Escrow",
      paragraphs: [
        "At closing, Buyer will obtain a homeowner's insurance policy naming Buyer as insured and the lender as mortgagee. Any escrow balance held by the lender transfers to Buyer at no cost unless the parties agree otherwise in writing.",
      ],
    },
    ...closingTerms(f, 7),
    {
      heading: "12. Seller Acknowledgments",
      paragraphs: [
        "Seller confirms that Seller has been advised to seek independent legal and tax advice before signing, has had the opportunity to do so, and is signing voluntarily.",
      ],
    },
    ...boilerplate(f, 13),
  ];
}

export function renderContract(f: GenerateContractInput): RenderedContract {
  const sections = f.type === "CASH" ? cash(f) : f.type === "NOVATION" ? novation(f) : subjectTo(f);
  return {
    title: CONTRACT_TYPE_LABELS[f.type],
    notice: ATTORNEY_REVIEW_NOTICE,
    sections,
    signatureParties: [
      { role: "Seller", name: f.sellerNames },
      { role: "Buyer", name: f.buyerName },
    ],
  };
}

/** Plain-text form, stored on the record and used for search/preview. */
export function contractToText(c: RenderedContract): string {
  const lines = [c.title.toUpperCase(), "", c.notice, ""];
  for (const s of c.sections) lines.push(s.heading, ...s.paragraphs, "");
  for (const p of c.signatureParties) lines.push(`${p.role}: ______________________________  Date: __________`, `   ${p.name}`, "");
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Self-contained HTML file saved into Documents so the contract opens and prints anywhere. */
export function contractToHtml(c: RenderedContract): string {
  const body = c.sections
    .map((s) => `<h2>${escapeHtml(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}`)
    .join("");
  const sigs = c.signatureParties
    .map(
      (p) =>
        `<div class="sig"><div class="line"></div><p>${escapeHtml(p.role)}: ${escapeHtml(p.name)}</p><p>Date: ____________</p></div>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(c.title)}</title><style>body{font-family:Georgia,serif;max-width:7.5in;margin:0.75in auto;line-height:1.5;color:#111}h1{text-align:center;font-size:20px}h2{font-size:14px;margin:18px 0 4px}p{margin:4px 0;font-size:13px}.notice{border:1px solid #b45309;background:#fffbeb;padding:8px;font-size:12px}.sigs{display:flex;gap:40px;margin-top:40px}.sig{flex:1}.line{border-bottom:1px solid #111;height:36px}</style></head><body><h1>${escapeHtml(c.title)}</h1><p class="notice">${escapeHtml(c.notice)}</p>${body}<div class="sigs">${sigs}</div></body></html>`;
}
