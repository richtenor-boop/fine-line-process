import { describe, it, expect } from "vitest";
import { createPropertySchema } from "@/lib/modules/properties/schema";
import { createLeadSchema } from "@/lib/modules/leads/schema";

describe("blank optional number fields", () => {
  it("lets a property save with blank year built / bedrooms instead of rejecting or storing 0", () => {
    const parsed = createPropertySchema.parse({
      addressLine1: "1 Main St",
      city: "Atlanta",
      state: "GA",
      zip: "30314",
      propertyType: "SINGLE_FAMILY",
      yearBuilt: "",
      bedrooms: "",
      estimatedValue: "",
    });
    expect(parsed.yearBuilt).toBeUndefined();
    expect(parsed.bedrooms).toBeUndefined();
    expect(parsed.estimatedValue).toBeUndefined();
  });

  it("still parses and validates numbers that are filled in", () => {
    const base = { addressLine1: "1 Main St", city: "Atlanta", state: "GA", zip: "30314", propertyType: "SINGLE_FAMILY" };
    expect(createPropertySchema.parse({ ...base, yearBuilt: "1965", bedrooms: "3" })).toMatchObject({ yearBuilt: 1965, bedrooms: 3 });
    expect(createPropertySchema.safeParse({ ...base, yearBuilt: "12" }).success).toBe(false);
  });

  it("keeps a blank asking price empty on a new lead", () => {
    const parsed = createLeadSchema.parse({ contactMode: "new", firstName: "A", lastName: "B", askingPrice: "" });
    expect(parsed.askingPrice).toBeUndefined();
  });
});
