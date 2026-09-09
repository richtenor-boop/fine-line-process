/** Provider-agnostic transactional email interface — see docs/06-integrations.md §Email. */

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  bodyHtml: string;
}

export interface SendEmailResult {
  providerMessageId: string;
  status: "SENT" | "FAILED";
}

export interface EmailProvider {
  readonly name: string;
  readonly isLive: boolean;
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}
