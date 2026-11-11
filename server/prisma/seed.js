// Fills the Category table with the business types from the proposal.
// Safe to run more than once: upsert skips categories that already exist.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = ['Barbershop', 'Salon', 'Clinic', 'Personal trainer', 'Consultant'];

for (const name of CATEGORIES) {
  await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
}

console.log(`Seeded ${CATEGORIES.length} categories`);
await prisma.$disconnect();
