import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rentnest.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'RentNest Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin ready: ${admin.email} / ${adminPassword}`);

  const categoryNames = ['Apartment', 'House', 'Studio', 'Duplex', 'Room Share'];
  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ ${categoryNames.length} categories seeded`);

  // Sample landlord + property for quick manual testing
  const landlordPassword = await bcrypt.hash('landlord123', 10);
  const landlord = await prisma.user.upsert({
    where: { email: 'landlord@rentnest.com' },
    update: {},
    create: {
      name: 'Demo Landlord',
      email: 'landlord@rentnest.com',
      password: landlordPassword,
      role: 'LANDLORD',
    },
  });

  const category = await prisma.category.findFirst({ where: { name: 'Apartment' } });

  await prisma.property.upsert({
    where: { id: 'seed-property-1' },
    update: {},
    create: {
      id: 'seed-property-1',
      title: 'Cozy 2-Bed Apartment in Rangpur',
      description: 'A well-maintained apartment close to the city center.',
      address: 'Station Road',
      city: 'Rangpur',
      price: 8000,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ['Parking', 'Generator', 'Water Supply'],
      images: [],
      categoryId: category!.id,
      landlordId: landlord.id,
    },
  });
  console.log('✅ Sample landlord + property seeded (landlord@rentnest.com / landlord123)');

  const tenantPassword = await bcrypt.hash('tenant123', 10);
  await prisma.user.upsert({
    where: { email: 'tenant@rentnest.com' },
    update: {},
    create: {
      name: 'Demo Tenant',
      email: 'tenant@rentnest.com',
      password: tenantPassword,
      role: 'TENANT',
    },
  });
  console.log('✅ Sample tenant seeded (tenant@rentnest.com / tenant123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
