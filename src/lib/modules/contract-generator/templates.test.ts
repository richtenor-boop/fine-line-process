import { describe, it, expect } from "vitest";
import { generateContractSchema } from "./schema";
import { renderContract, contractToHtml, contractToText, ATTORNEY_REVIEW_NOTICE } from "./templates";

const common = {
  propertyId: "p1",
  sellerNames: "John Smith",
  buyerName: "Fine Line Investments LLC and/or assigns",
  propertyAddress: "80 Howard St NW, Atlanta, GA 30314",
  purchasePrice: "95000",
  earnestMoney: "100",
  closingAgent: "Peachtree Title",
  closingDate: "2026-11-15",
  inspectionDays: "10",
};

describe("contract templates", () => {
  it("cash: price, all-cash, assignment, and the attorney notice", () => {
    const text = contractToText(renderContract(generateContractSchema.parse({ ...common, type: "CASH" })));
    expect(text).toContain("CASH PURCHASE AGREEMENT");
    expect(text).toContain("$95,000.00");
    expect(text).toContain("not contingent on Buyer obtaining financing");
    expect(text).toContain("may assign this agreement");
    expect(text).toContain("November 15, 2026");
    expect(text).toContain(ATTORNEY_REVIEW_NOTICE);
  });

  it("novation: seller's net, marketing period, and no-agency acknowledgment", () => {
    const text = contractToText(
      renderContract(generateContractSchema.parse({ ...common, type: "NOVATION", marketingDays: "120", repairBudget: "8000" })),
    );
    expect(text).toContain("Seller's Net");
    expect(text).toContain("120 days");
    expect(text).toContain("$8,000.00");
    expect(text).toContain("not acting as Seller's real estate agent");
  });

  it("Subject-To: existing loan terms and the due-on-sale disclosure", () => {
    const text = contractToText(
      renderContract(
        generateContractSchema.parse({
          ...common,
          type: "SUBJECT_TO",
          purchasePrice: "170000",
          lenderName: "Mr. Cooper",
          loanBalance: "165000",
          monthlyPayment: "1100",
          loanArrears: "2200",
          cashToSeller: "5000",
        }),
      ),
    );
    expect(text).toContain("subject to the existing loan with Mr. Cooper");
    expect(text).toContain("$165,000.00");
    expect(text).toContain("$2,200.00 to bring the loan current");
    expect(text).toContain("due-on-sale");
  });

  it("requires loan details for Subject-To and a marketing period for novation", () => {
    expect(generateContractSchema.safeParse({ ...common, type: "SUBJECT_TO" }).success).toBe(false);
    expect(generateContractSchema.safeParse({ ...common, type: "NOVATION" }).success).toBe(false);
  });

  it("escapes user text in the saved HTML file", () => {
    const html = contractToHtml(
      renderContract(generateContractSchema.parse({ ...common, type: "CASH", sellerNames: "<script>alert(1)</script>" })),
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
