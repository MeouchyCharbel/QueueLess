// Fills the Category table with the business types from the proposal.
// Safe to run more than once: upsert skips categories that already exist.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = ['Barbershop', 'Salon', 'Clinic', 'Personal trainer', 'Consultant'];

try {
  // Idempotent schema guard for this project, which intentionally adds no
  // new Prisma migration folder. This runs after migrate deploy in the Render
  // build command and whenever `npm run db:seed` is executed locally.
  //
  // IMPORTANT: if duplicate ownerIds already exist, creating this index
  // fails deliberately rather than deleting or altering anyone's data.
  // A conventional Prisma migration is preferable for long-term maintenance.
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "Business_ownerId_key" ON "Business" ("ownerId")',
  );

  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log(`Ensured unique business owner index; seeded ${CATEGORIES.length} categories`);
} finally {
  await prisma.$disconnect();
}
