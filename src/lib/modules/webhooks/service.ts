import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import type { CreateWebhookInput } from "./schema";

export async function listWebhooks(organizationId: string) {
  return prisma.webhook.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export async function createWebhook(organizationId: string, input: CreateWebhookInput) {
  const secret = crypto.randomBytes(24).toString("hex");
  return prisma.webhook.create({
    data: { organizationId, url: input.url, event: input.event, secret, isActive: true },
  });
}

export async function toggleWebhookActive(organizationId: string, webhookId: string, isActive: boolean) {
  const webhook = await prisma.webhook.findFirst({ where: { id: webhookId, organizationId } });
  if (!webhook) throw new Error("Webhook does not belong to this organization.");
  await prisma.webhook.update({ where: { id: webhookId }, data: { isActive } });
}

export async function deleteWebhook(organizationId: string, webhookId: string) {
  const webhook = await prisma.webhook.findFirst({ where: { id: webhookId, organizationId } });
  if (!webhook) throw new Error("Webhook does not belong to this organization.");
  await prisma.webhook.delete({ where: { id: webhookId } });
}

function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Real outbound send — no third-party credentials needed, just a destination URL (source spec
 * §6/docs/06-integrations.md "Webhooks (outbound)"). Payloads are HMAC-signed so receivers can
 * verify authenticity; a receiver failure is logged, not thrown, so one broken webhook can't take
 * down the automation run that triggered it.
 */
export async function sendConfiguredWebhook(organizationId: string, webhookId: string, data: Record<string, unknown>) {
  const webhook = await prisma.webhook.findFirst({ where: { id: webhookId, organizationId, isActive: true } });
  if (!webhook) return;

  const body = JSON.stringify({ event: webhook.event, data, sentAt: new Date().toISOString() });
  const signature = signPayload(webhook.secret, body);

  try {
    await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-FineLine-Signature": signature },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error(`[webhooks] delivery to ${webhook.url} failed:`, err);
  }
}
