import { describe, it, expect } from "vitest";
import { evaluateStrategies, type StrategyInputs } from "./strategy";

const base: StrategyInputs = {
  arv: 200000,
  repairCost: 30000,
  maoPercent: 70,
  assignmentFee: 10000,
  sellingCostPercent: 8,
  sellerAskingPrice: null,
  existingLoanBalance: null,
  existingMonthlyPayment: null,
  existingInterestRate: null,
  loanArrears: null,
  monthlyRent: null,
};

const byKey = (inputs: StrategyInputs) => Object.fromEntries(evaluateStrategies(inputs).results.map((r) => [r.key, r]));

describe("evaluateStrategies", () => {
  it("recommends cash when the seller asks at or under MAO", () => {
    const evaluation = evaluateStrategies({ ...base, sellerAskingPrice: 95000, existingLoanBalance: 40000 });
    expect(evaluation.best?.key).toBe("CASH");
    expect(evaluation.best?.fit).toBe("strong");
    // MAO 110k − 10k fee = 100k, but never offer more than they asked.
    expect(evaluation.best?.suggestedOffer).toBe(95000);
  });

  it("recommends novation when the seller wants more than cash pays but there is retail margin", () => {
    // Seller net ceiling: 200k − 16k selling − 30k repairs − 10k target = 144k.
    const r = byKey({ ...base, sellerAskingPrice: 140000, existingLoanBalance: 60000 });
    expect(r.CASH.fit).toBe("poor");
    expect(r.NOVATION.fit).toBe("strong");
    expect(r.NOVATION.suggestedOffer).toBe(140000);
    expect(r.NOVATION.metric).toBe(14000);
    expect(evaluateStrategies({ ...base, sellerAskingPrice: 140000, existingLoanBalance: 60000 }).best?.key).toBe("NOVATION");
  });

  it("recommends Subject-To for a low-equity, low-rate loan that cash-flows", () => {
    const inputs: StrategyInputs = {
      ...base,
      sellerAskingPrice: 170000,
      existingLoanBalance: 165000,
      existingMonthlyPayment: 1100,
      existingInterestRate: 3.5,
      loanArrears: 2200,
      monthlyRent: 1700,
    };
    const r = byKey(inputs);
    expect(r.CASH.fit).toBe("poor"); // loan exceeds MAO
    expect(r.NOVATION.fit).toBe("poor"); // loan exceeds seller net
    expect(r.SUBJECT_TO.fit).toBe("strong");
    expect(r.SUBJECT_TO.suggestedOffer).toBe(170000); // loan + 5k cash to seller
    expect(r.SUBJECT_TO.cashToClose).toBe(7200); // 2.2k arrears + 5k to seller
    expect(r.SUBJECT_TO.metric).toBe(430); // 1700 × 0.9 − 1100
    expect(evaluateStrategies(inputs).best?.key).toBe("SUBJECT_TO");
  });

  it("marks Subject-To poor when rent can't cover the payment", () => {
    const r = byKey({ ...base, existingLoanBalance: 150000, existingMonthlyPayment: 2000, monthlyRent: 1500, existingInterestRate: 8.5 });
    expect(r.SUBJECT_TO.fit).toBe("poor");
  });

  it("returns unknown (never a fake recommendation) when key inputs are missing", () => {
    const evaluation = evaluateStrategies({ ...base, arv: null });
    expect(evaluation.results.every((r) => r.fit === "unknown")).toBe(true);
    expect(evaluation.best).toBeNull();
  });
});
