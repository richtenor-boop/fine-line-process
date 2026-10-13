/**
 * Pure underwriting math for the Deal Analyzer — no database, no I/O, so every formula is unit
 * tested directly (calc.test.ts). All figures assume an all-cash purchase; financing (loan points,
 * interest, cash-on-cash with leverage) is deliberately out of scope and labeled as such in the UI.
 *
 * Every output is `null` when an input it depends on is missing, so the UI shows "—" instead of a
 * misleading number computed from a silent zero.
 */

export interface DealInputs {
  arv: number | null;
  repairCost: number | null;
  purchasePrice: number | null;
  maoPercent: number;
  assignmentFee: number | null;
  closingCostPercent: number;
  sellingCostPercent: number;
  holdingMonths: number;
  monthlyHoldingCost: number | null;
  monthlyRent: number | null;
  monthlyExpenses: number | null;
}

export interface DealResults {
  /** Maximum allowable offer: ARV × MAO% − repairs (the "70% rule"). */
  mao: number | null;
  /** MAO minus the wholesaler's assignment fee — the most a wholesaler should offer the seller. */
  wholesaleOffer: number | null;
  /** Purchase price vs. MAO: positive means the offer is under MAO (room to spare). */
  spreadToMao: number | null;
  buyClosingCosts: number | null;
  sellingCosts: number | null;
  totalHoldingCosts: number;
  totalInvestment: number | null;
  flipProfit: number | null;
  /** Profit ÷ total cash invested, as a percentage. */
  flipRoiPercent: number | null;
  monthlyCashFlow: number | null;
  /** Annual net operating income ÷ (purchase + repairs), as a percentage. */
  capRatePercent: number | null;
  /** Monthly rent ≥ 1% of (purchase + repairs). */
  meetsOnePercentRule: boolean | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function analyzeDeal(input: DealInputs): DealResults {
  const repairs = input.repairCost ?? 0;
  const totalHoldingCosts = round2((input.monthlyHoldingCost ?? 0) * Math.max(0, input.holdingMonths));

  const mao = input.arv !== null ? round2((input.arv * input.maoPercent) / 100 - repairs) : null;
  const wholesaleOffer = mao !== null ? round2(mao - (input.assignmentFee ?? 0)) : null;
  const spreadToMao = mao !== null && input.purchasePrice !== null ? round2(mao - input.purchasePrice) : null;

  const buyClosingCosts =
    input.purchasePrice !== null ? round2((input.purchasePrice * input.closingCostPercent) / 100) : null;
  const sellingCosts = input.arv !== null ? round2((input.arv * input.sellingCostPercent) / 100) : null;

  const totalInvestment =
    input.purchasePrice !== null && buyClosingCosts !== null
      ? round2(input.purchasePrice + repairs + buyClosingCosts + totalHoldingCosts)
      : null;

  const flipProfit =
    input.arv !== null && totalInvestment !== null && sellingCosts !== null
      ? round2(input.arv - totalInvestment - sellingCosts)
      : null;
  const flipRoiPercent =
    flipProfit !== null && totalInvestment !== null && totalInvestment > 0
      ? round2((flipProfit / totalInvestment) * 100)
      : null;

  const monthlyCashFlow =
    input.monthlyRent !== null ? round2(input.monthlyRent - (input.monthlyExpenses ?? 0)) : null;
  const allInBasis = input.purchasePrice !== null ? input.purchasePrice + repairs : null;
  const capRatePercent =
    monthlyCashFlow !== null && allInBasis !== null && allInBasis > 0
      ? round2(((monthlyCashFlow * 12) / allInBasis) * 100)
      : null;
  const meetsOnePercentRule =
    input.monthlyRent !== null && allInBasis !== null && allInBasis > 0 ? input.monthlyRent >= allInBasis * 0.01 : null;

  return {
    mao,
    wholesaleOffer,
    spreadToMao,
    buyClosingCosts,
    sellingCosts,
    totalHoldingCosts,
    totalInvestment,
    flipProfit,
    flipRoiPercent,
    monthlyCashFlow,
    capRatePercent,
    meetsOnePercentRule,
  };
}
