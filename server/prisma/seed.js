// Fills the Category table with the business types from the proposal.
// Safe to run more than once: upsert skips categories that already exist.
// Loads server/.env itself, so it works however `npm install` was run.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = ['Barbershop', 'Salon', 'Clinic', 'Personal trainer', 'Consultant'];

try {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log(`Seeded ${CATEGORIES.length} categories`);
} finally {
  await prisma.$disconnect();
}
