import "server-only";
import { prisma } from "@/lib/db";
import type { CustomFieldEntity } from "@prisma/client";
import type { CreateCustomFieldInput } from "./schema";

export async function listCustomFieldDefinitions(organizationId: string, entity?: CustomFieldEntity) {
  return prisma.customFieldDefinition.findMany({
    where: { organizationId, ...(entity ? { entity } : {}) },
    orderBy: { createdAt: "asc" },
  });
}

export async function createCustomFieldDefinition(organizationId: string, input: CreateCustomFieldInput) {
  const options =
    input.fieldType === "SELECT" && input.options
      ? input.options.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined;

  return prisma.customFieldDefinition.create({
    data: {
      organizationId,
      entity: input.entity,
      label: input.label,
      fieldType: input.fieldType,
      options: options ?? undefined,
      isRequired: input.isRequired,
    },
  });
}

export async function deleteCustomFieldDefinition(organizationId: string, definitionId: string) {
  const def = await prisma.customFieldDefinition.findFirst({ where: { id: definitionId, organizationId } });
  if (!def) throw new Error("Custom field does not belong to this organization.");
  await prisma.customFieldDefinition.delete({ where: { id: definitionId } });
}

/** Upserts one value; `entityId` must match whichever FK the definition's `entity` implies. */
export async function setCustomFieldValue(
  organizationId: string,
  definitionId: string,
  entityId: string,
  value: string,
) {
  const definition = await prisma.customFieldDefinition.findFirst({
    where: { id: definitionId, organizationId },
  });
  if (!definition) throw new Error("Custom field does not belong to this organization.");

  const scopeField =
    definition.entity === "LEAD"
      ? "leadId"
      : definition.entity === "PROPERTY"
        ? "propertyId"
        : definition.entity === "CONTACT"
          ? "contactId"
          : definition.entity === "DEAL"
            ? "dealId"
            : null;
  if (!scopeField) throw new Error(`Custom field values for ${definition.entity} are not supported yet.`);

  const existing = await prisma.customFieldValue.findFirst({
    where: { definitionId, [scopeField]: entityId },
  });

  if (existing) {
    return prisma.customFieldValue.update({ where: { id: existing.id }, data: { value } });
  }
  return prisma.customFieldValue.create({
    data: { definitionId, value, [scopeField]: entityId },
  });
}
