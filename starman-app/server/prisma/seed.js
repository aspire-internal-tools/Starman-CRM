// Seed a demo org, advisors, and a few leads/intakes so the app is usable immediately.
// Idempotent: safe to run repeatedly (upserts by stable keys).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.org.upsert({
    where: { id: "demo-org" },
    update: {},
    create: { id: "demo-org", name: "Aspire Investments & Insurance" },
  });

  const pw = await bcrypt.hash("starman123", 10);
  const advisors = [
    { id: "u-al", email: "andrew@aspire.ca", name: "Andrew Lee", title: "President · CFP, CLU", role: "OWNER" },
    { id: "u-jb", email: "jillian@aspire.ca", name: "Jillian Brockman", title: "Partner · Associate Advisor", role: "ADVISOR" },
    { id: "u-ef", email: "elly@aspire.ca", name: "Elly Fayad", title: "Associate Advisor · EPC", role: "ADVISOR" },
    { id: "u-kn", email: "kaiden@aspire.ca", name: "Kaiden Nicholson", title: "Associate Advisor", role: "ADVISOR" },
  ];
  for (const a of advisors) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { name: a.name, title: a.title, role: a.role, orgId: org.id },
      create: { id: a.id, orgId: org.id, email: a.email, passwordHash: pw, name: a.name, title: a.title, role: a.role },
    });
  }

  const count = await prisma.lead.count({ where: { orgId: org.id } });
  if (count === 0) {
    await prisma.lead.createMany({
      data: [
        { orgId: org.id, firstName: "Sarah", lastName: "Mitchell", email: "sarah@example.ca", source: "Referral", status: "NEW", priority: "HIGH", advisorId: "u-al", productInterest: ["Investments", "Retirement"], estimatedAum: 250000 },
        { orgId: org.id, firstName: "Wong", lastName: "Holdings", email: "ops@wong.example.ca", source: "Web / Meta", status: "CONTACTED", priority: "MED", advisorId: "u-ef", estimatedAum: 850000 },
      ],
    });
    await prisma.intake.create({
      data: { orgId: org.id, type: "lead", name: "Emily Brewster", email: "emily@example.ca", source: "Seminar", priority: "MED", status: "NEW", advisorId: "u-kn", reason: "Retirement planning enquiry" },
    });
  }

  // Default connectors (config only — no secrets). Canada Life & Quadrus stay LOCKED.
  const connectors = [
    { provider: "meta_ads", displayName: "Meta Ads Manager / Business Suite", status: "NOT_CONFIGURED", config: { appId: "", adAccountId: "", pageId: "", leadFormId: "" } },
    { provider: "advisorstream", displayName: "AdvisorStream", status: "NOT_CONFIGURED", config: { importMethod: "API", topicField: "topic" } },
    { provider: "docusign", displayName: "DocuSign", status: "NOT_CONFIGURED", config: { environment: "demo", accountId: "" } },
    { provider: "canada_life", displayName: "Canada Life", status: "LOCKED", syncStatus: "manual", config: { note: "Official API access + dealer/compliance approval required. No screen scraping, no password storage. Manual CSV import available." } },
    { provider: "quadrus", displayName: "Quadrus", status: "LOCKED", syncStatus: "manual", config: { note: "Official API access + dealer approval required. No portal automation, no password storage. Manual CSV import available." } },
  ];
  for (const c of connectors) {
    await prisma.connector.upsert({
      where: { orgId_provider: { orgId: org.id, provider: c.provider } },
      update: { displayName: c.displayName },
      create: { orgId: org.id, ...c },
    });
  }

  console.log("Seed complete. Login: andrew@aspire.ca / starman123 (org: %s)", org.name);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
