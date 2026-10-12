import { describe, it, expect } from "vitest";
import { analyzeDeal, type DealInputs } from "./calc";

const base: DealInputs = {
  arv: 200000,
  repairCost: 30000,
  purchasePrice: 100000,
  maoPercent: 70,
  assignmentFee: 10000,
  closingCostPercent: 2,
  sellingCostPercent: 8,
  holdingMonths: 6,
  monthlyHoldingCost: 1000,
  monthlyRent: 1800,
  monthlyExpenses: 600,
};

describe("analyzeDeal", () => {
  it("applies the 70% rule: MAO = ARV × 70% − repairs, wholesale offer subtracts the fee", () => {
    const r = analyzeDeal(base);
    expect(r.mao).toBe(110000);
    expect(r.wholesaleOffer).toBe(100000);
    expect(r.spreadToMao).toBe(10000);
  });

  it("computes flip profit and ROI from all-cash costs", () => {
    const r = analyzeDeal(base);
    // 100k purchase + 30k repairs + 2k buy closing + 6k holding = 138k invested
    expect(r.totalInvestment).toBe(138000);
    expect(r.sellingCosts).toBe(16000);
    // 200k − 138k − 16k
    expect(r.flipProfit).toBe(46000);
    expect(r.flipRoiPercent).toBe(33.33);
  });

  it("computes rental cash flow, cap rate, and the 1% rule", () => {
    const r = analyzeDeal(base);
    expect(r.monthlyCashFlow).toBe(1200);
    // 14,400 NOI ÷ 130,000 basis
    expect(r.capRatePercent).toBe(11.08);
    expect(r.meetsOnePercentRule).toBe(true);
    expect(analyzeDeal({ ...base, monthlyRent: 1000 }).meetsOnePercentRule).toBe(false);
  });

  it("returns null rather than a fake number when a required input is missing", () => {
    const r = analyzeDeal({ ...base, arv: null, purchasePrice: null, monthlyRent: null });
    expect(r.mao).toBeNull();
    expect(r.wholesaleOffer).toBeNull();
    expect(r.flipProfit).toBeNull();
    expect(r.totalInvestment).toBeNull();
    expect(r.capRatePercent).toBeNull();
    expect(r.meetsOnePercentRule).toBeNull();
    expect(r.totalHoldingCosts).toBe(6000);
  });

  it("treats missing repairs and fee as zero, not as missing", () => {
    const r = analyzeDeal({ ...base, repairCost: null, assignmentFee: null });
    expect(r.mao).toBe(140000);
    expect(r.wholesaleOffer).toBe(140000);
  });
});
