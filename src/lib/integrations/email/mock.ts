import "server-only";
import crypto from "node:crypto";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./types";

export const mockEmailProvider: EmailProvider = {
  name: "mock",
  isLive: false,

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    console.log(`[mock email] ${input.from} -> ${input.to}: ${input.subject}`);
    return { providerMessageId: `mock_email_${crypto.randomUUID()}`, status: "SENT" };
  },
};
