import type { PipelineType } from "@prisma/client";

interface StageTemplate {
  name: string;
  isWon?: boolean;
  isLost?: boolean;
}

/**
 * Single source of truth for default stage sets, mirroring the source spec's §5/§6/§16 stage
 * lists exactly. `registerOrganization` and `prisma/seed.ts` both create the GENERAL pipeline from
 * this template so there's one place to update, and `/settings/pipelines` offers the rest when an
 * admin creates a specialized pipeline (Pre-Foreclosure, Tax Surplus, Probate, Short Sale,
 * Dispositions) — see docs/05-mvp-plan.md Phase 3.
 */
export const PIPELINE_TEMPLATES: Record<PipelineType, StageTemplate[]> = {
  GENERAL: [
    { name: "New" },
    { name: "Attempting Contact" },
    { name: "Contacted" },
    { name: "Follow-Up" },
    { name: "Appointment Set" },
    { name: "Appointment Completed" },
    { name: "Offer Needed" },
    { name: "Offer Sent" },
    { name: "Negotiating" },
    { name: "Contract Sent" },
    { name: "Under Contract" },
    { name: "Due Diligence" },
    { name: "Closing" },
    { name: "Closed Won", isWon: true },
    { name: "Closed Lost", isLost: true },
    { name: "Dead Lead", isLost: true },
  ],
  PRE_FORECLOSURE: [
    { name: "New Foreclosure" },
    { name: "Research Needed" },
    { name: "Owner Located" },
    { name: "Contact Attempted" },
    { name: "Contacted" },
    { name: "Consultation" },
    { name: "Solution Review" },
    { name: "Offer/Option Presented" },
    { name: "Follow-Up" },
    { name: "Resolved", isWon: true },
    { name: "Acquired", isWon: true },
    { name: "Dead", isLost: true },
  ],
  TAX_SURPLUS: [
    { name: "New Surplus" },
    { name: "Funds Verification Needed" },
    { name: "Funds Available" },
    { name: "Owner Research" },
    { name: "Heir Research" },
    { name: "Contact Attempted" },
    { name: "Contacted" },
    { name: "Agreement Sent" },
    { name: "Agreement Signed" },
    { name: "Claim Preparation" },
    { name: "Claim Submitted" },
    { name: "County Review" },
    { name: "Payment Pending" },
    { name: "Paid", isWon: true },
    { name: "Closed", isLost: true },
  ],
  PROBATE: [
    { name: "New Probate" },
    { name: "Estate Research" },
    { name: "Personal Representative Located" },
    { name: "Heir Research" },
    { name: "Property Research" },
    { name: "Contact Attempted" },
    { name: "Contacted" },
    { name: "Appointment" },
    { name: "Offer" },
    { name: "Negotiation" },
    { name: "Contract" },
    { name: "Closing", isWon: true },
  ],
  SHORT_SALE: [
    { name: "New" },
    { name: "Seller Contacted" },
    { name: "Application Needed" },
    { name: "Application Received" },
    { name: "Authorization Received" },
    { name: "Financial Package" },
    { name: "Offer Prepared" },
    { name: "Submitted to Lender" },
    { name: "Lender Review" },
    { name: "BPO/Appraisal" },
    { name: "Negotiation" },
    { name: "Approval" },
    { name: "Closing" },
    { name: "Closed", isWon: true },
  ],
  DISPOSITIONS: [
    { name: "Available" },
    { name: "Buyer Outreach" },
    { name: "Interested Buyers" },
    { name: "Showing" },
    { name: "Offers Received" },
    { name: "Buyer Selected" },
    { name: "Assignment/Contract" },
    { name: "Closing" },
    { name: "Sold", isWon: true },
  ],
};

export const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  GENERAL: "General",
  PRE_FORECLOSURE: "Pre-Foreclosure",
  TAX_SURPLUS: "Tax Surplus",
  PROBATE: "Probate",
  SHORT_SALE: "Short Sale",
  DISPOSITIONS: "Dispositions",
};
