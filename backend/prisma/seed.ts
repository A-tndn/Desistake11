import { PrismaClient, UserRole, UserStatus, AgentType, MatchStatus, MatchType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Configurations
  console.log('Creating configurations...');
  const configs = [
    { key: 'PLATFORM_NAME', value: 'Cricket Betting Platform', category: 'general', description: 'Platform display name' },
    { key: 'PLATFORM_COMMISSION', value: '0.2', category: 'commission', description: 'Platform commission percentage' },
    { key: 'AGENT_COMMISSION', value: '1.0', category: 'commission', description: 'Agent commission percentage' },
    { key: 'MASTER_AGENT_COMMISSION', value: '0.5', category: 'commission', description: 'Master Agent commission percentage' },
    { key: 'SUPER_MASTER_COMMISSION', value: '0.3', category: 'commission', description: 'Super Master commission percentage' },
    { key: 'MIN_BET_AMOUNT', value: '10', category: 'limits', description: 'Minimum bet amount' },
    { key: 'MAX_BET_AMOUNT', value: '100000', category: 'limits', description: 'Maximum bet amount' },
    { key: 'DEFAULT_CREDIT_LIMIT', value: '10000', category: 'limits', description: 'Default credit limit for new players' },
    { key: 'MAINTENANCE_MODE', value: 'false', category: 'general', description: 'Maintenance mode status' },
    { key: 'ALLOW_NEW_REGISTRATIONS', value: 'true', category: 'general', description: 'Allow new user registrations' },
  ];

  for (const config of configs) {
    await prisma.configuration.upsert({
      where: { key: config.key },
      update: config,
      create: config,
    });
  }

  // 2. Create Super Admin
  console.log('Creating super admin...');
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'admin@cricketbetting.com',
      password: hashedPassword,
      displayName: 'Super Administrator',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      balance: 0,
      creditLimit: 0,
    },
  });

  // 3. Create Sample Super Master Agent
  console.log('Creating super master agent...');
  const superMaster = await prisma.agent.upsert({
    where: { username: 'supermaster1' },
    update: {},
    create: {
      username: 'supermaster1',
      email: 'supermaster@example.com',
      phone: '+919999999991',
      password: await bcrypt.hash('SuperMaster@123', 10),
      displayName: 'Super Master Agent 1',
      agentType: AgentType.SUPER_MASTER,
      status: UserStatus.ACTIVE,
      balance: 1000000,
      creditLimit: 5000000,
      riskDeposit: 500000,
      commissionRate: 0.3,
      kycVerified: true,
      kycVerifiedAt: new Date(),
    },
  });

  // 4. Create Sample Master Agent
  console.log('Creating master agent...');
  const masterAgent = await prisma.agent.upsert({
    where: { username: 'master1' },
    update: {},
    create: {
      username: 'master1',
      email: 'master@example.com',
      phone: '+919999999992',
      password: await bcrypt.hash('Master@123', 10),
      displayName: 'Master Agent 1',
      agentType: AgentType.MASTER,
      status: UserStatus.ACTIVE,
      parentAgentId: superMaster.id,
      balance: 500000,
      creditLimit: 2000000,
      commissionRate: 0.5,
      kycVerified: true,
      kycVerifiedAt: new Date(),
    },
  });

  // 5. Create Sample Regular Agent
  console.log('Creating regular agent...');
  const regularAgent = await prisma.agent.upsert({
    where: { username: 'agent1' },
    update: {},
    create: {
      username: 'agent1',
      email: 'agent@example.com',
      phone: '+919999999993',
      password: await bcrypt.hash('Agent@123', 10),
      displayName: 'Agent 1',
      agentType: AgentType.AGENT,
      status: UserStatus.ACTIVE,
      parentAgentId: masterAgent.id,
      balance: 100000,
      creditLimit: 500000,
      commissionRate: 1.0,
      kycVerified: true,
      kycVerifiedAt: new Date(),
    },
  });

  // 6. Create Sample Players
  console.log('Creating sample players...');
  for (let i = 1; i <= 5; i++) {
    await prisma.user.upsert({
      where: { username: `player${i}` },
      update: {},
      create: {
        username: `player${i}`,
        email: `player${i}@example.com`,
        phone: `+91888888888${i}`,
        password: await bcrypt.hash('Player@123', 10),
        displayName: `Player ${i}`,
        role: UserRole.PLAYER,
        status: UserStatus.ACTIVE,
        agentId: regularAgent.id,
        balance: 5000 + (i * 1000),
        creditLimit: 10000,
      },
    });
  }

  // 7. Create Sample Matches
  console.log('Creating sample matches...');
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const matches = [
    {
      name: 'India vs Australia - 1st T20I',
      shortName: 'IND vs AUS',
      matchType: MatchType.T20,
      venue: 'Wankhede Stadium',
      city: 'Mumbai',
      country: 'India',
      team1: 'India',
      team2: 'Australia',
      tournament: 'India vs Australia T20I Series 2026',
      startTime: tomorrow,
      status: MatchStatus.UPCOMING,
    },
    {
      name: 'Pakistan vs England - 2nd ODI',
      shortName: 'PAK vs ENG',
      matchType: MatchType.ODI,
      venue: 'National Stadium',
      city: 'Karachi',
      country: 'Pakistan',
      team1: 'Pakistan',
      team2: 'England',
      tournament: 'Pakistan vs England ODI Series 2026',
      startTime: nextWeek,
      status: MatchStatus.UPCOMING,
    },
    {
      name: 'South Africa vs New Zealand - 3rd Test',
      shortName: 'SA vs NZ',
      matchType: MatchType.TEST,
      venue: 'Newlands',
      city: 'Cape Town',
      country: 'South Africa',
      team1: 'South Africa',
      team2: 'New Zealand',
      tournament: 'SA vs NZ Test Series 2026',
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: MatchStatus.UPCOMING,
    },
  ];

  for (const matchData of matches) {
    const existing = await prisma.match.findFirst({
      where: { name: matchData.name },
    });
    if (!existing) {
      await prisma.match.create({ data: matchData });
    }
  }

  console.log('Seed completed successfully!');
  console.log('\nSummary:');
  console.log('- Super Admin: superadmin / Admin@123');
  console.log('- Super Master Agent: supermaster1 / SuperMaster@123');
  console.log('- Master Agent: master1 / Master@123');
  console.log('- Regular Agent: agent1 / Agent@123');
  console.log('- Players: player1-5 / Player@123');
  console.log('- Matches: 3 upcoming matches created');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
