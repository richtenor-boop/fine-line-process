import { describe, it, expect } from "vitest";
import { PERMISSIONS, SYSTEM_ROLES, DEFAULT_ROLE_PERMISSIONS } from "./permissions";

describe("permission catalog", () => {
  it("has no duplicate permission keys", () => {
    const keys = PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("defines a default grant list for every system role", () => {
    for (const role of SYSTEM_ROLES) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it("only grants permission keys that exist in the catalog", () => {
    const validKeys = new Set(PERMISSIONS.map((p) => p.key));
    for (const role of SYSTEM_ROLES) {
      for (const key of DEFAULT_ROLE_PERMISSIONS[role]) {
        expect(validKeys.has(key)).toBe(true);
      }
    }
  });

  it("grants the Owner role every permission in the catalog", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Owner.length).toBe(PERMISSIONS.length);
  });

  it("grants the Read Only role no mutating permissions", () => {
    const mutatingSuffixes = [":edit", ":delete", ":manage", ":send", ":calls_make", ":upload"];
    for (const key of DEFAULT_ROLE_PERMISSIONS["Read Only"]) {
      expect(mutatingSuffixes.some((suffix) => key.endsWith(suffix))).toBe(false);
    }
  });
});
