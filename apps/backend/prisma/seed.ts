/**
 * Database seed script.
 * Creates initial admin account, demo users, categories, and sample tickets.
 * Safe to re-run — uses upsert to avoid duplicates.
 */
import { PrismaClient, UserRole, TicketStatus, TicketPriority } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed TicketSequence (ensure it exists)
  await prisma.ticketSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastValue: 0 },
  });

  // Seed admin account
  const adminPassword = await argon2.hash('Admin@123456');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@supportdesk.local' },
    update: {},
    create: {
      email: 'admin@supportdesk.local',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    },
  });
  console.log(`  ✅ Admin: ${admin.email}`);

  // Seed agent accounts
  const agentPassword = await argon2.hash('Agent@123456');
  const agent1 = await prisma.user.upsert({
    where: { email: 'agent.sarah@supportdesk.local' },
    update: {},
    create: {
      email: 'agent.sarah@supportdesk.local',
      password: agentPassword,
      firstName: 'Sarah',
      lastName: 'Chen',
      role: UserRole.AGENT,
    },
  });
  const agent2 = await prisma.user.upsert({
    where: { email: 'agent.marcus@supportdesk.local' },
    update: {},
    create: {
      email: 'agent.marcus@supportdesk.local',
      password: agentPassword,
      firstName: 'Marcus',
      lastName: 'Rivera',
      role: UserRole.AGENT,
    },
  });
  console.log(`  ✅ Agent: ${agent1.email}`);
  console.log(`  ✅ Agent: ${agent2.email}`);

  // Seed customer accounts
  const customerPassword = await argon2.hash('Customer@123456');
  const customer1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      password: customerPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: UserRole.CUSTOMER,
    },
  });
  const customer2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      password: customerPassword,
      firstName: 'Bob',
      lastName: 'Martinez',
      role: UserRole.CUSTOMER,
    },
  });
  console.log(`  ✅ Customer: ${customer1.email}`);
  console.log(`  ✅ Customer: ${customer2.email}`);

  // Seed categories
  const categories = await Promise.all([
    prisma.ticketCategory.upsert({
      where: { name: 'Technical Support' },
      update: {},
      create: { name: 'Technical Support', description: 'Software bugs, errors, and technical issues' },
    }),
    prisma.ticketCategory.upsert({
      where: { name: 'Billing' },
      update: {},
      create: { name: 'Billing', description: 'Payment, invoicing, and subscription issues' },
    }),
    prisma.ticketCategory.upsert({
      where: { name: 'Account Management' },
      update: {},
      create: { name: 'Account Management', description: 'Account access, permissions, and settings' },
    }),
    prisma.ticketCategory.upsert({
      where: { name: 'Feature Request' },
      update: {},
      create: { name: 'Feature Request', description: 'Suggestions for new features or improvements' },
    }),
    prisma.ticketCategory.upsert({
      where: { name: 'General Inquiry' },
      update: {},
      create: { name: 'General Inquiry', description: 'General questions and information requests' },
    }),
  ]);
  console.log(`  ✅ Categories: ${categories.map((c) => c.name).join(', ')}`);

  // Helper: atomically get next ticket number
  async function nextTicketNumber(): Promise<string> {
    const result = await prisma.$executeRaw`
      UPDATE ticket_sequence SET last_value = last_value + 1 WHERE id = 1
    `;
    const seq = await prisma.ticketSequence.findUnique({ where: { id: 1 } });
    return `TKT-${String(seq!.lastValue).padStart(5, '0')}`;
  }

  // Seed sample tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: await nextTicketNumber(),
      subject: 'Cannot log into my account',
      description: 'I keep getting "Invalid credentials" even though I just reset my password.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      customerId: customer1.id,
      categoryId: categories[2].id, // Account Management
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: await nextTicketNumber(),
      subject: 'Invoice shows wrong amount',
      description: 'My latest invoice shows $199 but I should be on the $99/mo plan.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.MEDIUM,
      customerId: customer1.id,
      categoryId: categories[1].id, // Billing
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      ticketNumber: await nextTicketNumber(),
      subject: 'Export to CSV not working',
      description: 'When I click "Export to CSV" nothing happens. No download, no error message.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.LOW,
      customerId: customer2.id,
      categoryId: categories[0].id, // Technical Support
    },
  });

  console.log(`  ✅ Tickets: ${ticket1.ticketNumber}, ${ticket2.ticketNumber}, ${ticket3.ticketNumber}`);

  // Seed assignment for ticket1
  await prisma.ticketAssignment.create({
    data: {
      ticketId: ticket1.id,
      agentId: agent1.id,
      assignedById: admin.id,
    },
  });

  // Seed messages
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: ticket1.id,
        authorId: customer1.id,
        body: 'I have tried resetting my password twice now and still cannot get in. Very frustrating!',
      },
      {
        ticketId: ticket1.id,
        authorId: agent1.id,
        body: "Hi Alice, I'm looking into this for you now. Can you tell me which browser you're using?",
      },
      {
        ticketId: ticket2.id,
        authorId: customer1.id,
        body: "Please review my account. I downgraded last month and my invoice is still at the old rate.",
      },
    ],
  });

  console.log('  ✅ Messages seeded');
  console.log('\n🎉 Seed complete!\n');
  console.log('Demo credentials:');
  console.log('  Admin:    admin@supportdesk.local  / Admin@123456');
  console.log('  Agent:    agent.sarah@supportdesk.local / Agent@123456');
  console.log('  Customer: alice@example.com / Customer@123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
