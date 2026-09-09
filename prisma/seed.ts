/**
 * Development seed data. Fictional only — never commit real homeowner or user PII here
 * (source spec §34). Run with `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "../src/lib/rbac/permissions";
import { PIPELINE_TEMPLATES } from "../src/lib/modules/pipelines/templates";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "DemoPass123!"; // fictional demo-only credential, dev environments only

async function main() {
  console.log("Seeding permission catalog...");
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }

  const existing = await prisma.organization.findUnique({ where: { slug: "fine-line-demo" } });
  if (existing) {
    console.log("Demo organization already exists, skipping.");
    return;
  }

  console.log("Creating demo organization...");
  const organization = await prisma.organization.create({
    data: { name: "Fine Line Demo Investments", slug: "fine-line-demo" },
  });

  const roleIdByName = new Map<string, string>();
  for (const roleName of SYSTEM_ROLES) {
    const role = await prisma.role.create({
      data: { organizationId: organization.id, name: roleName, isSystem: true },
    });
    roleIdByName.set(roleName, role.id);

    const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleName];
    const permissionRows = await prisma.permission.findMany({ where: { key: { in: grantedKeys } } });
    await prisma.rolePermission.createMany({
      data: permissionRows.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const demoUsers = [
    { name: "Dana Whitfield", email: "dana@fineline.demo", role: "Owner" },
    { name: "Marcus Reyes", email: "marcus@fineline.demo", role: "Administrator" },
    { name: "Priya Anand", email: "priya@fineline.demo", role: "Acquisitions" },
    { name: "Leon Brooks", email: "leon@fineline.demo", role: "Dispositions" },
  ] as const;

  for (const u of demoUsers) {
    await prisma.user.create({
      data: {
        organizationId: organization.id,
        roleId: roleIdByName.get(u.role)!,
        name: u.name,
        email: u.email,
        passwordHash,
        status: "ACTIVE",
      },
    });
  }

  const defaultPipeline = await prisma.pipeline.create({
    data: {
      organizationId: organization.id,
      name: "General Acquisitions",
      type: "GENERAL",
      isDefault: true,
      stages: {
        create: PIPELINE_TEMPLATES.GENERAL.map((s, index) => ({
          name: s.name,
          order: index,
          isWon: s.isWon ?? false,
          isLost: s.isLost ?? false,
        })),
      },
    },
  });
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: defaultPipeline.id },
    orderBy: { order: "asc" },
  });
  const stageByName = new Map(stages.map((s) => [s.name, s.id]));

  const users = await prisma.user.findMany({ where: { organizationId: organization.id } });
  const userByEmail = new Map(users.map((u) => [u.email, u]));

  console.log("Creating demo properties, contacts, and leads...");
  const demoLeads = [
    {
      contact: { firstName: "Harold", lastName: "Devane", phone: "4045550142", email: "harold.devane@example.com" },
      property: {
        addressLine1: "118 Persimmon Ridge Rd",
        city: "Decatur",
        county: "DeKalb",
        state: "GA",
        zip: "30030",
        estimatedValue: 245000,
        mortgageBalance: 61000,
      },
      stage: "New",
      motivation: "UNKNOWN" as const,
      assignedTo: undefined as string | undefined,
      tags: [] as string[],
    },
    {
      contact: { firstName: "Yolanda", lastName: "Pruitt", phone: "4045550198", email: "y.pruitt@example.com" },
      property: {
        addressLine1: "742 Blue Heron Ct",
        city: "Stone Mountain",
        county: "DeKalb",
        state: "GA",
        zip: "30083",
        estimatedValue: 189000,
        mortgageBalance: 0,
      },
      stage: "Appointment Set",
      motivation: "HIGH" as const,
      assignedTo: "priya@fineline.demo",
      tags: ["Motivated Seller", "Absentee Owner"],
    },
    {
      contact: { firstName: "Wendell", lastName: "Okafor", phone: "6785550117", email: "wendell.okafor@example.com" },
      property: {
        addressLine1: "39 Foxglove Trail",
        city: "Marietta",
        county: "Cobb",
        state: "GA",
        zip: "30060",
        estimatedValue: 312000,
        mortgageBalance: 298000,
      },
      stage: "Offer Sent",
      motivation: "MEDIUM" as const,
      assignedTo: "priya@fineline.demo",
      tags: ["Motivated Seller"],
    },
    {
      contact: { firstName: "Carla", lastName: "Simmons", phone: "4705550163", email: "carla.simmons@example.com" },
      property: {
        addressLine1: "87 Redbud Landing",
        city: "Lawrenceville",
        county: "Gwinnett",
        state: "GA",
        zip: "30044",
        estimatedValue: 267000,
        mortgageBalance: 140000,
      },
      stage: "Under Contract",
      motivation: "HIGH" as const,
      assignedTo: "leon@fineline.demo",
      tags: [] as string[],
    },
  ];

  const createdLeads: { name: string; leadId: string; contactId: string; phoneId: string; emailId: string; propertyId: string }[] = [];

  for (const item of demoLeads) {
    const contact = await prisma.contact.create({
      data: {
        organizationId: organization.id,
        firstName: item.contact.firstName,
        lastName: item.contact.lastName,
        type: "SELLER",
        phoneNumbers: { create: [{ organizationId: organization.id, number: item.contact.phone, isPrimary: true }] },
        emailAddresses: { create: [{ organizationId: organization.id, email: item.contact.email, isPrimary: true }] },
      },
      include: { phoneNumbers: true, emailAddresses: true },
    });

    const property = await prisma.property.create({
      data: {
        organizationId: organization.id,
        addressLine1: item.property.addressLine1,
        city: item.property.city,
        county: item.property.county,
        state: item.property.state,
        zip: item.property.zip,
        estimatedValue: item.property.estimatedValue,
        mortgageBalance: item.property.mortgageBalance,
        estimatedEquity: item.property.estimatedValue - item.property.mortgageBalance,
      },
    });

    await prisma.propertyOwner.create({
      data: { organizationId: organization.id, propertyId: property.id, contactId: contact.id, ownershipType: "SOLE" },
    });

    const stageId = stageByName.get(item.stage)!;
    const assignedUser = item.assignedTo ? userByEmail.get(item.assignedTo) : undefined;

    const lead = await prisma.lead.create({
      data: {
        organizationId: organization.id,
        contactId: contact.id,
        propertyId: property.id,
        pipelineId: defaultPipeline.id,
        stageId,
        motivation: item.motivation,
        assignedUserId: assignedUser?.id,
      },
    });

    await prisma.leadStageHistory.create({ data: { leadId: lead.id, toStageId: stageId } });

    for (const tagName of item.tags) {
      const tag = await prisma.tag.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: tagName } },
        update: {},
        create: { organizationId: organization.id, name: tagName },
      });
      await prisma.tagAssignment.create({ data: { tagId: tag.id, leadId: lead.id } });
    }

    createdLeads.push({
      name: item.contact.firstName,
      leadId: lead.id,
      contactId: contact.id,
      phoneId: contact.phoneNumbers[0].id,
      emailId: contact.emailAddresses[0].id,
      propertyId: property.id,
    });
  }

  console.log("Seeding demo specialized case data (Phase 9)...");
  const harold9 = createdLeads.find((l) => l.name === "Harold")!;
  const wendell9 = createdLeads.find((l) => l.name === "Wendell")!;
  const yolanda9 = createdLeads.find((l) => l.name === "Yolanda")!;

  await prisma.foreclosure.create({
    data: {
      organizationId: organization.id,
      propertyId: wendell9.propertyId,
      status: "NOTICE_OF_DEFAULT",
      defaultAmount: 18500,
      trusteeName: "Cobb County Trustee Services",
      caseNumber: "FC-2026-00417",
    },
  });

  await prisma.probateCase.create({
    data: {
      organizationId: organization.id,
      propertyId: harold9.propertyId,
      status: "ESTATE_RESEARCH",
      county: "DeKalb",
      personalRepresentativeName: "Marcus Devane (fictional, demo data)",
    },
  });

  await prisma.propertyValuation.create({
    data: {
      organizationId: organization.id,
      propertyId: yolanda9.propertyId,
      source: "avm",
      value: 191500,
      asOfDate: new Date(),
    },
  });

  await prisma.repairEstimate.create({
    data: {
      organizationId: organization.id,
      propertyId: yolanda9.propertyId,
      category: "Roof",
      estimatedCost: 9200,
      notes: "Fictional demo estimate — 20-year shingle replacement quoted by a local contractor.",
    },
  });

  console.log("Seeding demo communications...");
  const yolanda = createdLeads.find((l) => l.name === "Yolanda")!;
  const wendell = createdLeads.find((l) => l.name === "Wendell")!;

  const smsConversation = await prisma.conversation.create({
    data: { organizationId: organization.id, leadId: yolanda.leadId, channel: "SMS" },
  });
  await prisma.smsMessage.create({
    data: {
      organizationId: organization.id,
      leadId: yolanda.leadId,
      conversationId: smsConversation.id,
      direction: "OUTBOUND",
      fromNumber: "+15550000000",
      toNumber: "4045550198",
      body: "Hi Yolanda, this is Priya with Fine Line Process — following up on the property at 742 Blue Heron Ct. Do you have a few minutes this week?",
      status: "SENT",
      sentByUserId: userByEmail.get("priya@fineline.demo")!.id,
    },
  });
  await prisma.smsMessage.create({
    data: {
      organizationId: organization.id,
      leadId: yolanda.leadId,
      conversationId: smsConversation.id,
      direction: "INBOUND",
      fromNumber: "4045550198",
      toNumber: "+15550000000",
      body: "Yes, Thursday afternoon works for me.",
      status: "RECEIVED",
    },
  });
  await prisma.conversation.update({ where: { id: smsConversation.id }, data: { lastMessageAt: new Date() } });

  const callConversation = await prisma.conversation.create({
    data: { organizationId: organization.id, leadId: yolanda.leadId, channel: "CALL" },
  });
  await prisma.call.create({
    data: {
      organizationId: organization.id,
      leadId: yolanda.leadId,
      conversationId: callConversation.id,
      handledByUserId: userByEmail.get("priya@fineline.demo")!.id,
      direction: "OUTBOUND",
      fromNumber: "+15550000000",
      toNumber: "4045550198",
      durationSeconds: 240,
      disposition: "APPOINTMENT_SET",
      notes: "Confirmed Thursday 2pm walkthrough.",
    },
  });

  // Demo AI score (a plausible mock-heuristic result, not derived by calling the provider —
  // src/lib/integrations/ai/mock.ts imports "server-only", which this seed script can't load).
  await prisma.lead.update({
    where: { id: yolanda.leadId },
    data: {
      aiScore: 87,
      aiScoreReason: [
        "Motivation: High",
        "Reason:",
        "- Seller-reported motivation is high.",
        "- An appointment is already scheduled.",
        "- Tagged \"Motivated Seller\".",
        "",
        "Recommended Action: High priority — call the seller today and work toward scheduling a consultation.",
      ].join("\n"),
    },
  });

  // Demonstrates the compliance panel — Wendell's number is marked DNC (fictional).
  await prisma.phoneNumber.update({ where: { id: wendell.phoneId }, data: { isDncListed: true } });
  await prisma.complianceEvent.create({
    data: {
      organizationId: organization.id,
      contactId: wendell.contactId,
      channel: "CALL",
      eventType: "DNC_REQUESTED",
      source: "manual",
    },
  });

  console.log("Seeding demo automation and campaign...");
  const dana = userByEmail.get("dana@fineline.demo")!;

  const automation = await prisma.automation.create({
    data: {
      organizationId: organization.id,
      name: "Notify owner on Appointment Set",
      triggerType: "STAGE_CHANGED",
      isActive: true,
      createdById: dana.id,
      steps: {
        create: [
          {
            order: 0,
            actionType: "CREATE_NOTIFICATION",
            actionConfig: { title: "Lead reached Appointment Set", body: "Check the calendar for confirmation details." },
            conditionJson: { field: "stageId", value: stageByName.get("Appointment Set")! },
          },
        ],
      },
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      name: "New Lead Nurture",
      status: "ACTIVE",
      respectQuietHours: true,
      respectBusinessHours: true,
      createdById: dana.id,
      steps: {
        create: [
          { order: 0, channel: "SMS", delayDays: 0, templateBody: "Hi, this is Fine Line Process reaching out about your property. Reply STOP to opt out." },
          { order: 1, channel: "SMS", delayDays: 3, templateBody: "Just checking back in — happy to answer any questions whenever works for you." },
        ],
      },
    },
  });
  const harold = createdLeads.find((l) => l.name === "Harold")!;
  await prisma.campaignEnrollment.create({ data: { campaignId: campaign.id, leadId: harold.leadId } });

  console.log(`  Automation: ${automation.name} (active)`);
  console.log(`  Campaign: ${campaign.name} — Harold Devane enrolled (try Settings > Campaigns > Process due steps now)`);

  console.log("Seeding demo buyer and deal...");
  const buyerContact = await prisma.contact.create({
    data: {
      organizationId: organization.id,
      firstName: "Marcus",
      lastName: "Tolliver",
      type: "BUYER",
      phoneNumbers: { create: [{ organizationId: organization.id, number: "6785550188", isPrimary: true }] },
      emailAddresses: { create: [{ organizationId: organization.id, email: "marcus.tolliver@example.com", isPrimary: true }] },
    },
  });
  const buyer = await prisma.buyer.create({
    data: {
      organizationId: organization.id,
      contactId: buyerContact.id,
      companyName: "Tolliver Capital LLC",
      markets: ["Gwinnett", "GA"],
      zipCodes: ["30044"],
      propertyTypes: ["SINGLE_FAMILY"],
      minPrice: 150000,
      maxPrice: 320000,
      isCashBuyer: true,
      strategy: "RENTAL",
    },
  });

  const carla = createdLeads.find((l) => l.name === "Carla")!;
  const carlaLead = await prisma.lead.findUniqueOrThrow({ where: { id: carla.leadId }, select: { propertyId: true } });
  const carlaOffer = await prisma.offer.create({
    data: {
      organizationId: organization.id,
      leadId: carla.leadId,
      amount: 215000,
      status: "ACCEPTED",
      sentAt: new Date(),
      respondedAt: new Date(),
    },
  });
  const carlaContract = await prisma.contract.create({
    data: { organizationId: organization.id, offerId: carlaOffer.id, status: "SIGNED", signedAt: new Date() },
  });
  const carlaDeal = await prisma.deal.create({
    data: {
      organizationId: organization.id,
      leadId: carla.leadId,
      propertyId: carlaLead.propertyId,
      contractId: carlaContract.id,
      ownerUserId: dana.id,
      purchasePrice: 215000,
      stage: "UNDER_CONTRACT",
    },
  });
  await prisma.transaction.create({
    data: { organizationId: organization.id, dealId: carlaDeal.id, type: "ACQUISITION_COST", amount: 215000, occurredOn: new Date() },
  });

  console.log(`  Buyer: ${buyer.companyName}`);
  console.log(`  Deal: Carla Simmons — Under Contract at $215,000`);

  console.log("Seed complete.");
  console.log(`  Organization: ${organization.name} (${organization.slug})`);
  console.log(`  Default pipeline: ${defaultPipeline.name}`);
  console.log(`  Demo leads: ${demoLeads.length}`);
  console.log(`  Demo users (password for all: ${DEMO_PASSWORD}):`);
  for (const u of demoUsers) console.log(`    - ${u.email} (${u.role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
