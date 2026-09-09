/**
 * Every module service function takes `organizationId` as its first argument and threads it
 * into the Prisma `where` clause via this helper — never accept a client-supplied organization id
 * and never omit it from a query. See docs/02-database-erd.md and docs/08-security-checklist.md.
 */
export function scopedTo<T extends Record<string, unknown>>(organizationId: string, where: T = {} as T) {
  return { ...where, organizationId };
}
