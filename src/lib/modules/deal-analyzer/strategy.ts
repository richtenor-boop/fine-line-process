/**
 * Deal evaluator: given the underwriting inputs, which acquisition strategy fits this seller —
 * a cash offer, a novation (sell retail on the seller's behalf, seller gets a fixed net), or a
 * Subject-To (take title, keep the seller's existing loan in place)?
 *
 * Pure math, unit tested in strategy.test.ts. These are rules of thumb an acquisitions manager
 * would apply, not underwriting guarantees — the UI labels them as suggestions.
 */

export type StrategyKey = "CASH" | "NOVATION" | "SUBJECT_TO";
export type StrategyFit = "strong" | "possible" | "poor" | "unknown";

export interface StrategyInputs {
  arv: number | null;
  repairCost: number | null;
  maoPercent: number;
  /** Used as the target wholesale fee (cash) and target profit (novation) when set. */
  assignmentFee: number | null;
  sellingCostPercent: number;
  sellerAskingPrice: number | null;
  existingLoanBalance: number | null;
  /** Full monthly payment the buyer would keep making (principal, interest, taxes, insurance). */
  existingMonthlyPayment: number | null;
  existingInterestRate: number | null;
  loanArrears: number | null;
  monthlyRent: number | null;
}

export interface StrategyResult {
  key: StrategyKey;
  label: string;
  fit: StrategyFit;
  /** 0–100, used only to rank strategies against each other. */
  score: number;
  /** Suggested price to offer the seller under this strategy, or null if it can't be computed. */
  suggestedOffer: number | null;
  /** Cash needed at closing beyond the offer price (Subject-To: arrears + cash to seller). */
  cashToClose: number | null;
  /** Expected profit (cash/novation) or monthly cash flow (Subject-To), per `metricLabel`. */
  metric: number | null;
  metricLabel: string;
  reasons: string[];
}

export interface StrategyEvaluation {
  results: StrategyResult[];
  best: StrategyResult | null;
}

const FIT_SCORE: Record<StrategyFit, number> = { strong: 3, possible: 2, poor: 1, unknown: 0 };
/** Share of rent held back for vacancy, repairs and management when judging Subject-To cash flow. */
export const SUBJECT_TO_RESERVE_RATE = 0.1;

function round(n: number): number {
  return Math.round(n);
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function evaluateCash(i: StrategyInputs): StrategyResult {
  const base = { key: "CASH" as const, label: "Cash offer", metricLabel: "Wholesale fee / spread", cashToClose: null };
  if (i.arv === null) {
    return { ...base, fit: "unknown", score: 0, suggestedOffer: null, metric: null, reasons: ["Enter the ARV to price a cash offer."] };
  }
  const repairs = i.repairCost ?? 0;
  const mao = (i.arv * i.maoPercent) / 100 - repairs;
  const fee = i.assignmentFee ?? 0;
  const offer = round(mao - fee);
  const reasons: string[] = [`Max allowable offer is ${money(mao)} (${i.maoPercent}% of ARV minus repairs).`];

  if (i.existingLoanBalance !== null && i.existingLoanBalance > mao) {
    reasons.push(
      `The ${money(i.existingLoanBalance)} loan is more than the MAO, so a cash price can't pay it off without a short sale.`,
    );
    return { ...base, fit: "poor", score: 10, suggestedOffer: offer, metric: fee || null, reasons };
  }
  if (i.sellerAskingPrice === null) {
    reasons.push("Add the seller's asking price to see whether they'll take it.");
    return { ...base, fit: "possible", score: 50, suggestedOffer: offer, metric: fee || null, reasons };
  }
  const spread = mao - i.sellerAskingPrice;
  if (i.sellerAskingPrice <= mao) {
    reasons.push(`Seller is asking ${money(i.sellerAskingPrice)}, at or under MAO — ${money(spread)} of room.`);
    return { ...base, fit: "strong", score: 90, suggestedOffer: Math.min(offer, round(i.sellerAskingPrice)), metric: round(spread + fee), reasons };
  }
  if (i.sellerAskingPrice <= mao * 1.1) {
    reasons.push(`Asking ${money(i.sellerAskingPrice)} is within 10% of MAO — negotiable.`);
    return { ...base, fit: "possible", score: 60, suggestedOffer: offer, metric: fee || null, reasons };
  }
  reasons.push(`Asking ${money(i.sellerAskingPrice)} is ${money(-spread)} over MAO — a cash offer is unlikely to be accepted.`);
  return { ...base, fit: "poor", score: 20, suggestedOffer: offer, metric: fee || null, reasons };
}

function evaluateNovation(i: StrategyInputs): StrategyResult {
  const base = { key: "NOVATION" as const, label: "Novation", metricLabel: "Your expected profit", cashToClose: null };
  if (i.arv === null) {
    return { ...base, fit: "unknown", score: 0, suggestedOffer: null, metric: null, reasons: ["Enter the ARV to price a novation."] };
  }
  const repairs = i.repairCost ?? 0;
  const sellingCosts = (i.arv * i.sellingCostPercent) / 100;
  const targetProfit = i.assignmentFee ?? Math.max(15000, i.arv * 0.08);
  // The most you can promise the seller as their net and still hit your target after selling retail.
  const sellerNet = round(i.arv - sellingCosts - repairs - targetProfit);
  const reasons: string[] = [
    `Selling retail at ${money(i.arv)} less ${money(sellingCosts)} selling costs and ${money(repairs)} repairs leaves the seller up to ${money(sellerNet)} net while you keep ${money(targetProfit)}.`,
  ];

  if (sellerNet <= 0) {
    reasons.push("There isn't enough margin at this ARV for a novation.");
    return { ...base, fit: "poor", score: 5, suggestedOffer: null, metric: null, reasons };
  }
  if (i.existingLoanBalance !== null && i.existingLoanBalance > sellerNet) {
    reasons.push(`The ${money(i.existingLoanBalance)} loan is more than the seller's net — the sale can't pay it off.`);
    return { ...base, fit: "poor", score: 15, suggestedOffer: sellerNet, metric: round(targetProfit), reasons };
  }
  if (i.sellerAskingPrice === null) {
    reasons.push("Add the seller's asking price to see whether the net works for them.");
    return { ...base, fit: "possible", score: 45, suggestedOffer: sellerNet, metric: round(targetProfit), reasons };
  }
  const profitAtAsking = i.arv - sellingCosts - repairs - i.sellerAskingPrice;
  if (i.sellerAskingPrice <= sellerNet) {
    reasons.push(
      `Seller's ${money(i.sellerAskingPrice)} ask fits — you'd net about ${money(profitAtAsking)}. Best when they want more than a cash buyer pays.`,
    );
    return { ...base, fit: "strong", score: 80, suggestedOffer: round(i.sellerAskingPrice), metric: round(profitAtAsking), reasons };
  }
  if (profitAtAsking >= targetProfit / 2) {
    reasons.push(`At the seller's ${money(i.sellerAskingPrice)} ask you'd still net about ${money(profitAtAsking)} — thinner, but workable.`);
    return { ...base, fit: "possible", score: 55, suggestedOffer: sellerNet, metric: round(profitAtAsking), reasons };
  }
  reasons.push(`At the seller's ${money(i.sellerAskingPrice)} ask there's only ${money(profitAtAsking)} left — too thin.`);
  return { ...base, fit: "poor", score: 15, suggestedOffer: sellerNet, metric: round(profitAtAsking), reasons };
}

function evaluateSubjectTo(i: StrategyInputs): StrategyResult {
  const base = { key: "SUBJECT_TO" as const, label: "Subject-To", metricLabel: "Monthly cash flow" };
  if (i.existingLoanBalance === null || i.existingMonthlyPayment === null) {
    return {
      ...base,
      fit: "unknown",
      score: 0,
      suggestedOffer: null,
      cashToClose: null,
      metric: null,
      reasons: ["Enter the existing loan balance and monthly payment to evaluate Subject-To."],
    };
  }
  const arrears = i.loanArrears ?? 0;
  const reasons: string[] = [];
  // Seller walks away with whatever they ask above the loan, capped so the deal stays an equity play.
  const cashToSeller =
    i.sellerAskingPrice !== null ? Math.max(0, Math.min(i.sellerAskingPrice - i.existingLoanBalance, 10000)) : 0;
  const suggestedOffer = round(i.existingLoanBalance + cashToSeller);
  const cashToClose = round(arrears + cashToSeller);

  let score = 40;
  let cashFlow: number | null = null;
  if (i.monthlyRent !== null) {
    cashFlow = round(i.monthlyRent * (1 - SUBJECT_TO_RESERVE_RATE) - i.existingMonthlyPayment);
    if (cashFlow >= 200) {
      score += 30;
      reasons.push(`Rent covers the ${money(i.existingMonthlyPayment)} payment with about ${money(cashFlow)}/mo left after a 10% reserve.`);
    } else if (cashFlow >= 0) {
      score += 10;
      reasons.push(`Rent barely covers the payment (${money(cashFlow)}/mo after reserves).`);
    } else {
      score -= 30;
      reasons.push(`Rent doesn't cover the payment — about ${money(-cashFlow)}/mo short.`);
    }
  } else {
    reasons.push("Add market rent to check whether the payment cash-flows.");
  }

  if (i.arv !== null && i.arv > 0) {
    const ltv = i.existingLoanBalance / i.arv;
    if (ltv >= 0.75) {
      score += 15;
      reasons.push(`Loan is ${Math.round(ltv * 100)}% of ARV — little equity, which is exactly where Subject-To beats a cash offer.`);
    } else if (ltv < 0.5) {
      score -= 15;
      reasons.push(`Loan is only ${Math.round(ltv * 100)}% of ARV — the seller has real equity and will likely want it paid out.`);
    }
  }
  if (i.existingInterestRate !== null) {
    if (i.existingInterestRate <= 5) {
      score += 10;
      reasons.push(`The ${i.existingInterestRate}% rate is worth keeping.`);
    } else if (i.existingInterestRate >= 8) {
      score -= 10;
      reasons.push(`At ${i.existingInterestRate}%, the existing loan isn't much better than new financing.`);
    }
  }
  if (arrears > 0) reasons.push(`Bring ${money(arrears)} of missed payments current at closing.`);
  reasons.push("The lender can call the loan due on transfer (due-on-sale) — disclose this to the seller in writing.");

  score = Math.max(0, Math.min(100, score));
  const fit: StrategyFit = score >= 70 ? "strong" : score >= 45 ? "possible" : "poor";
  return { ...base, fit, score, suggestedOffer, cashToClose, metric: cashFlow, reasons };
}

export function evaluateStrategies(inputs: StrategyInputs): StrategyEvaluation {
  const results = [evaluateCash(inputs), evaluateNovation(inputs), evaluateSubjectTo(inputs)].sort(
    (a, b) => FIT_SCORE[b.fit] - FIT_SCORE[a.fit] || b.score - a.score,
  );
  const best = results[0] && (results[0].fit === "strong" || results[0].fit === "possible") ? results[0] : null;
  return { results, best };
}
