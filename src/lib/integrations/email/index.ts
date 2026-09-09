import "server-only";
import { mockEmailProvider } from "./mock";
import type { EmailProvider } from "./types";

export function getEmailProvider(): EmailProvider {
  if (process.env.SENDGRID_API_KEY) {
    console.warn(
      "[email] SENDGRID_API_KEY is set, but no real SendGrid provider is implemented yet — falling back to mock. See docs/06-integrations.md.",
    );
  }
  return mockEmailProvider;
}
