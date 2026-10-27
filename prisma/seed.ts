import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = 'password123';

interface SeedUser {
  username: string;
  display_name: string;
  email: string;
  bio: string;
  location: string;
  website_url: string;
  is_verified: boolean;
}

const seedUsers: SeedUser[] = [
  {
    username: 'demouser',
    display_name: 'Demo User',
    email: 'demo@example.com',
    bio: 'Building the future one tweet at a time. Coffee enthusiast & open-source lover.',
    location: 'San Francisco, CA',
    website_url: 'https://example.com',
    is_verified: true,
  },
  {
    username: 'alice_dev',
    display_name: 'Alice Chen',
    email: 'alice@example.com',
    bio: 'Full-stack engineer. React & Node.js fanatic. Sometimes I sleep.',
    location: 'New York, NY',
    website_url: 'https://alice.dev',
    is_verified: false,
  },
  {
    username: 'bob_tech',
    display_name: 'Bob Martinez',
    email: 'bob@example.com',
    bio: 'DevOps engineer | Kubernetes aficionado | Dog dad',
    location: 'Austin, TX',
    website_url: 'https://bobmartinez.io',
    is_verified: true,
  },
  {
    username: 'carol_design',
    display_name: 'Carol White',
    email: 'carol@example.com',
    bio: 'Product Designer at @StartupXYZ. Figma wizard.',
    location: 'London, UK',
    website_url: 'https://carolwhite.design',
    is_verified: false,
  },
  {
    username: 'dan_startup',
    display_name: 'Dan Kim',
    email: 'dan@example.com',
    bio: 'Serial entrepreneur. 3x founder. Invested in 40+ startups.',
    location: 'Singapore',
    website_url: 'https://dankim.vc',
    is_verified: true,
  },
];

const avatar = (seed: string) => `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
const banner = (seed: string) => `https://picsum.photos/seed/${seed}banner/1200/400`;

const seedTweets: { author: string; content: string }[] = [
  {
    author: 'alice_dev',
    content:
      "Just shipped a new feature using React Server Components + Suspense. The DX is incredible. Can't believe how fast the page loads now! #ReactJS #WebDev",
  },
  {
    author: 'bob_tech',
    content:
      'Hot take: TypeScript strict mode should be the default for every new project. The extra 30 minutes of config saves 30 hours of debugging. Fight me. #TypeScript',
  },
  {
    author: 'carol_design',
    content:
      'Design principle I live by: if users need a tutorial to figure out how to use your UI, your UI has failed them. Keep it obvious. #ProductDesign #UX',
  },
  {
    author: 'dan_startup',
    content:
      "After 3 failed startups I finally understand: build something people desperately need, not something you think they'll kind of want. The market doesn't care about your vision. #Startup #Founder",
  },
  {
    author: 'bob_tech',
    content:
      'Kubernetes tip: always set resource requests AND limits. Running without them is a recipe for your pod getting OOM-killed at 3am. #DevOps #Kubernetes',
  },
  {
    author: 'alice_dev',
    content:
      "I refactored a 2000-line component into 12 small focused components today. The satisfaction is unreal. If you haven't done this yet — do it. Your future self will thank you. #CleanCode #React",
  },
  {
    author: 'dan_startup',
    content:
      "The best investment you can make is learning how to learn. Skills become obsolete. The ability to acquire new skills doesn't. #Learning #Growth",
  },
  {
    author: 'carol_design',
    content:
      "Color contrast is not a 'nice to have' — it's accessibility. At least 4.5:1 for normal text, 3:1 for large text. If your design fails WCAG, you're excluding users with visual impairments. #Accessibility #Design",
  },
  {
    author: 'demouser',
    content:
      "Hello world! This is my first tweet on this platform. Excited to be here! Let's build something amazing together. #FirstTweet",
  },
];

const seedReplies: { author: string; parentIndex: number; content: string }[] = [
  {
    author: 'bob_tech',
    parentIndex: 0,
    content: 'This is the way. Suspense boundaries changed how I structure every page.',
  },
  {
    author: 'carol_design',
    parentIndex: 0,
    content: 'Love this! The loading states feel so much smoother with RSC.',
  },
  {
    author: 'alice_dev',
    parentIndex: 4,
    content: 'Also set a PodDisruptionBudget while you are at it. Saved us during upgrades.',
  },
  {
    author: 'demouser',
    parentIndex: 0,
    content: 'Welcome to the RSC club! What did you use for data fetching?',
  },
];

const seedTrends = [
  { category: 'Technology', topic: '#ReactJS', post_count: 42_300 },
  { category: 'Technology', topic: '#TypeScript', post_count: 28_100 },
  { category: 'Business', topic: '#AI', post_count: 215_000 },
  { category: 'Technology', topic: '#OpenSource', post_count: 18_400 },
  { category: 'Entertainment', topic: '#Gaming', post_count: 87_600 },
  { category: 'Sports', topic: '#WorldCup', post_count: 312_000 },
  { category: 'Technology', topic: '#WebDev', post_count: 54_200 },
  { category: 'Science', topic: '#SpaceX', post_count: 63_000 },
];

async function main(): Promise<void> {
  console.log('Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.like.deleteMany();
  await prisma.repost.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.tweetMedia.deleteMany();
  // Delete replies first: the self-relation blocks a single deleteMany().
  await prisma.tweet.deleteMany({ where: { reply_to_tweet_id: { not: null } } });
  await prisma.tweet.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.trend.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users...');
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const users: Record<string, { id: string }> = {};
  for (const u of seedUsers) {
    const created = await prisma.user.create({
      data: {
        username: u.username,
        display_name: u.display_name,
        email: u.email,
        password_hash,
        bio: u.bio,
        avatar_url: avatar(u.username),
        banner_url: banner(u.username),
        location: u.location,
        website_url: u.website_url,
        is_verified: u.is_verified,
      },
    });
    users[u.username] = created;
  }

  console.log('Creating follows...');
  const demo = users.demouser;
  for (const username of ['alice_dev', 'bob_tech', 'carol_design']) {
    await prisma.follow.create({
      data: { follower_id: demo.id, following_id: users[username].id },
    });
  }
  await prisma.follow.create({
    data: { follower_id: users.alice_dev.id, following_id: demo.id },
  });
  await prisma.follow.create({
    data: { follower_id: users.dan_startup.id, following_id: demo.id },
  });

  console.log('Creating tweets...');
  // Insert oldest-first so ObjectId order matches chronological order. This
  // keeps cursor pagination (which compares ObjectIds) consistent with the
  // `created_at DESC` ordering used by the feeds.
  const gapMs = 47 * 60 * 1000;
  const startMs = Date.now() - (seedTweets.length + seedReplies.length) * gapMs;
  const tweetIds: string[] = [];

  for (let i = 0; i < seedTweets.length; i++) {
    const t = seedTweets[i];
    const created = await prisma.tweet.create({
      data: {
        content: t.content,
        author_id: users[t.author].id,
        created_at: new Date(startMs + i * gapMs),
      },
    });
    tweetIds.push(created.id);
  }

  const replyIds: string[] = [];
  for (let i = 0; i < seedReplies.length; i++) {
    const reply = seedReplies[i];
    const created = await prisma.tweet.create({
      data: {
        content: reply.content,
        author_id: users[reply.author].id,
        reply_to_tweet_id: tweetIds[reply.parentIndex],
        created_at: new Date(startMs + (seedTweets.length + i) * gapMs),
      },
    });
    replyIds.push(created.id);
  }

  console.log('Creating engagement...');
  const demoFirstTweet = tweetIds[8];
  const aliceFirstTweet = tweetIds[0];
  const bobTweet = tweetIds[4];

  await prisma.like.createMany({
    data: [
      { user_id: users.bob_tech.id, tweet_id: aliceFirstTweet },
      { user_id: users.carol_design.id, tweet_id: aliceFirstTweet },
      { user_id: demo.id, tweet_id: aliceFirstTweet },
      { user_id: users.alice_dev.id, tweet_id: demoFirstTweet },
      { user_id: users.dan_startup.id, tweet_id: bobTweet },
    ],
  });

  await prisma.repost.createMany({
    data: [
      { user_id: demo.id, tweet_id: aliceFirstTweet },
      { user_id: users.alice_dev.id, tweet_id: demoFirstTweet },
      { user_id: users.bob_tech.id, tweet_id: aliceFirstTweet },
    ],
  });

  await prisma.bookmark.createMany({
    data: [
      { user_id: demo.id, tweet_id: aliceFirstTweet },
      { user_id: demo.id, tweet_id: bobTweet },
    ],
  });

  console.log('Creating notifications...');
  await prisma.notification.createMany({
    data: [
      {
        recipient_id: demo.id,
        actor_id: users.bob_tech.id,
        type: 'FOLLOW',
      },
      {
        recipient_id: demo.id,
        actor_id: users.alice_dev.id,
        type: 'LIKE',
        tweet_id: demoFirstTweet,
      },
      {
        recipient_id: demo.id,
        actor_id: users.carol_design.id,
        type: 'REPLY',
        tweet_id: replyIds[3],
      },
      {
        recipient_id: demo.id,
        actor_id: users.alice_dev.id,
        type: 'REPOST',
        tweet_id: demoFirstTweet,
      },
      {
        recipient_id: users.alice_dev.id,
        actor_id: demo.id,
        type: 'LIKE',
        tweet_id: aliceFirstTweet,
      },
      {
        recipient_id: users.alice_dev.id,
        actor_id: users.bob_tech.id,
        type: 'REPLY',
        tweet_id: replyIds[0],
      },
      {
        recipient_id: users.bob_tech.id,
        actor_id: users.alice_dev.id,
        type: 'REPLY',
        tweet_id: replyIds[2],
      },
      {
        recipient_id: users.bob_tech.id,
        actor_id: demo.id,
        type: 'LIKE',
        tweet_id: bobTweet,
      },
    ],
  });

  console.log('Creating conversations...');
  const now = Date.now();
  const minute = 60 * 1000;

  async function seedConversation(
    otherUsername: string,
    messages: { sender: 'demo' | 'other'; content: string; minutesAgo: number; unread?: boolean }[],
  ) {
    const other = users[otherUsername];
    const conversation = await prisma.conversation.create({
      data: {
        participant_ids: [demo.id, other.id].sort(),
        last_message_at: new Date(now - messages[messages.length - 1].minutesAgo * minute),
      },
    });

    for (const message of messages) {
      const createdAt = new Date(now - message.minutesAgo * minute);
      await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          sender_id: message.sender === 'demo' ? demo.id : other.id,
          content: message.content,
          created_at: createdAt,
          read_at: message.unread ? null : createdAt,
        },
      });
    }
  }

  await seedConversation('alice_dev', [
    { sender: 'other', content: 'Hey! Did you see the new React docs?', minutesAgo: 180 },
    { sender: 'demo', content: 'Yes! The new examples are so much clearer.', minutesAgo: 175 },
    { sender: 'other', content: 'Want to pair on a small demo this weekend?', minutesAgo: 12, unread: true },
  ]);

  await seedConversation('bob_tech', [
    { sender: 'demo', content: 'Your Kubernetes thread was super helpful.', minutesAgo: 240 },
    { sender: 'other', content: 'Glad it helped! Ping me if you hit any issues.', minutesAgo: 230 },
  ]);

  await seedConversation('dan_startup', [
    { sender: 'other', content: 'Loved your first tweet. Welcome aboard!', minutesAgo: 45 },
    { sender: 'demo', content: 'Thanks Dan! Excited to be here.', minutesAgo: 40 },
  ]);

  console.log('Creating trends...');
  await prisma.trend.createMany({ data: seedTrends });

  console.log('\nSeed complete.');
  console.log('Demo login: demo@example.com / password123');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
