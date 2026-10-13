import { describe, it, expect, afterEach } from "vitest";
import { isRegistrationOpen } from "./service";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
describe.skipIf(process.env.RUN_DB_TESTS !== "1")("sign-up lock", () => {
  const original = process.env.ALLOW_REGISTRATION;
  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_REGISTRATION;
    else process.env.ALLOW_REGISTRATION = original;
  });

  it("closes once an organization exists unless ALLOW_REGISTRATION=true", async () => {
    // The test database always holds organizations from other suites.
    delete process.env.ALLOW_REGISTRATION;
    expect(await isRegistrationOpen()).toBe(false);
    process.env.ALLOW_REGISTRATION = "true";
    expect(await isRegistrationOpen()).toBe(true);
  });
});
