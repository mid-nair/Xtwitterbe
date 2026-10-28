/**
 * Birthday seed for @vaishanavi — ADDITIVE, it never touches other users' data.
 *
 *   npm run db:seed:birthday                 create everything (skips if already seeded)
 *   npm run db:seed:birthday -- --force      rebuild the birthday content from scratch
 *   npm run db:seed:birthday -- --dry-run    validate content + media files, no DB / uploads
 *
 * What it does:
 *   1. Uploads the photos/videos in prisma/birthday-media/ to your Cloudinary account.
 *   2. Creates (or updates) her account, the friend accounts and the parody accounts.
 *   3. Creates posts, replies, likes, reposts, bookmarks, follows, notifications,
 *      DMs and birthday trends.
 *
 * It only ever deletes content that belongs to the accounts listed below, and only
 * when you pass --force.
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

// A dry run never touches the database, so don't even open a connection.
const prisma = DRY_RUN ? (null as unknown as PrismaClient) : new PrismaClient();

type NotificationType = 'FOLLOW' | 'LIKE' | 'REPLY' | 'REPOST' | 'MENTION';

const BCRYPT_ROUNDS = 12;
const MEDIA_DIR = path.join(__dirname, 'birthday-media');

// ─────────────────────────────────────────────────────────────────────────────
// Edit these if you want to change names / login details
// ─────────────────────────────────────────────────────────────────────────────

const HER = {
  username: 'vaishanavi',
  display_name: '@sonaris',
  email: 'vaishanavi@gmail.com',
  password: 'vaishanavi123',
  bio: 'manifesting everything 🔮 | tarot, yoga & Sudarshan Kriya 🧘‍♀️ | NCT Dream · ZB1 · Thai pop | LLB (Hons), 2nd rank ⚖️ | #JDforever 🍀 | Scorpio ♏ | 25 today 🎂',
  location: 'Manifesting from the 5th dimension ✨',
  // Her account says "Joined October 2001" (her birthday) — a tiny easter egg.
  created_at: new Date('2001-10-28T00:00:00.000Z'),
};

const CREATOR = {
  username: 'bestie_dev',
  display_name: 'Your Favourite Developer 💻',
  bio: 'Built an entire X because you deserve your own timeline. 💜',
};

interface Persona {
  username: string;
  display_name: string;
  bio: string;
  verified?: boolean;
}

const FRIENDS: Persona[] = [
  { username: 'neha_xo', display_name: 'Neha', bio: 'Professional best friend. 🎉' },
  { username: 'brinda_b', display_name: 'Brinda', bio: 'Here for the birthday cake. 🍰' },
  { username: 'samiksha_s', display_name: 'Samiksha', bio: 'Chai > everything. ☕' },
  { username: 'shandeepa', display_name: 'Shandeepa', bio: 'Vibes only. ✨' },
  { username: 'akarsha_', display_name: 'Akarsha', bio: 'Playlist curator. 🎧' },
  { username: 'pooja_p', display_name: 'Pooja', bio: 'Always hungry. 🍕' },
  { username: 'pranava_', display_name: 'Pranava', bio: 'Tiaras for everyone. 👑' },
  { username: 'bhavitha_', display_name: 'Bhavitha', bio: 'Brainrot enthusiast. 🧠' },
  { username: 'savii', display_name: 'Savitha', bio: 'Pretty! 😍 (her words, not mine)' },
  { username: 'rudra_r', display_name: 'Rudra', bio: 'Casual friend, formal wishes.' },
  { username: 'akshay_a', display_name: 'Akshay', bio: 'Wi-Fi permitting. 📶' },
];

const PARODY: Persona[] = [
  {
    username: 'daily_manifest',
    display_name: 'Daily Manifestation ✨',
    bio: 'Affirmations, tarot energy and gentle delusion. You are the universe. 🔮',
    verified: true,
  },
  {
    username: 'boardroom_buzz',
    display_name: 'Boardroom Buzz',
    bio: 'Corporate news, but make it unserious. Not financial advice. 📊',
    verified: true,
  },
  {
    username: 'jd_reunion_updates',
    display_name: 'JoongDunk Reunion Updates 🌙',
    bio: 'Fan account. 100% delulu, 0% sources, unlimited hope. #JDforever 🍀',
  },
  {
    username: 'astro_tarot',
    display_name: 'Astro & Tarot Bestie ♏',
    bio: 'Daily cards, retrograde survival tips, Scorpio appreciation. 🔮',
    verified: true,
  },
  {
    username: 'yoga_with_mochi',
    display_name: 'Yoga with Mochi 🧘',
    bio: 'A very small dog with very strong opinions about your posture. 🐶',
  },
  {
    username: 'brainrot_central',
    display_name: 'Brainrot Central 🧠',
    bio: 'Your daily dose of nonsense. No thoughts, head empty. 💀',
  },
  {
    username: 'nct_zb1_daily',
    display_name: 'NCTzen x ZB1 Daily 💚',
    bio: 'NCT Dream and ZEROBASEONE appreciation. Streaming is self-care. 🎧',
  },
  {
    username: 'hydrate_or_diedrate',
    display_name: 'Hydrate or Diedrate 💧',
    bio: 'Drink water. Stretch. Sleep. Repeat. 💧',
  },
];

// Parody accounts she does NOT follow, so they show up under "Who to follow".
const NOT_FOLLOWED_BY_HER = new Set(['brainrot_central', 'hydrate_or_diedrate']);

// ─────────────────────────────────────────────────────────────────────────────
// Media (files live in prisma/birthday-media/ — NOT committed to git)
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_FILES = [
  'avatar.jpg',
  'banner.jpg',
  'story-01.jpg',
  'story-02.jpg',
  'story-03.jpg',
  'story-04.jpg',
  'story-05.jpg',
  'story-06.jpg',
  'story-08.jpg',
  'story-09.jpg',
  'story-10.jpg',
  'story-11.jpg',
  'story-12.jpg',
  'story-13.jpg',
  'story-15.jpg',
  'story-16.jpg',
  'story-17.jpg',
  'story-18.jpg',
  'story-20.jpg',
  'story-21.jpg',
  'story-22.jpg',
  'laddoo.jpg',
  'graduation.jpg',
  'squad-with-dog.jpg',
  'sleeping-with-gifts.jpg',
  'video-rooftop.mp4',
  'video-joongdunk.mp4',
];

type MediaMap = Record<string, string>; // "story-01" -> https url

const isVideoFile = (file: string): boolean => /\.(mp4|webm|mov)$/i.test(file);
const keyOf = (file: string): string => file.replace(/\.[^.]+$/, '');

function parseCloudinaryUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'cloudinary:' || !url.hostname) return null;
    return {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password),
    };
  } catch {
    return null;
  }
}

function configureCloudinary(): string {
  const fromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  const cloudName = fromUrl?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '';
  const apiKey = fromUrl?.apiKey || process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = fromUrl?.apiSecret || process.env.CLOUDINARY_API_SECRET || '';
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Put CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your local .env (same values as on Render).',
    );
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return process.env.CLOUDINARY_FOLDER || 'twitter-clone';
}

function checkMediaFiles(): void {
  const missing = MEDIA_FILES.filter((file) => !fs.existsSync(path.join(MEDIA_DIR, file)));
  if (missing.length > 0) {
    throw new Error(
      `Missing media files in prisma/birthday-media/: ${missing.join(', ')}\n` +
        'Unzip birthday-media.zip into prisma/birthday-media/ and try again.',
    );
  }
}

/** Chunked upload for big videos, wrapped so it returns a normal Promise. */
function uploadLargeVideo(filePath: string, options: UploadApiOptions): Promise<UploadApiResponse> {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload_large(filePath, options, (error, result) => {
      if (error || !result) {
        reject(new Error(error?.message ?? 'Video upload failed.'));
        return;
      }
      resolve(result);
    });
  });
}

async function uploadMedia(): Promise<MediaMap> {
  const baseFolder = configureCloudinary();
  const urls: MediaMap = {};

  for (const file of MEDIA_FILES) {
    const filePath = path.join(MEDIA_DIR, file);
    const key = keyOf(file);
    const publicId = `${baseFolder}/birthday/${key}`;
    process.stdout.write(`  uploading ${file} ... `);

    if (isVideoFile(file)) {
      const result = await uploadLargeVideo(filePath, {
        resource_type: 'video',
        public_id: publicId,
        overwrite: true,
        chunk_size: 6_000_000,
      });
      // Request .mp4 so Cloudinary transcodes on delivery (plays everywhere).
      urls[key] = cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'mp4',
        version: result.version,
        secure: true,
      });
    } else {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'image',
        public_id: publicId,
        overwrite: true,
      });
      urls[key] = result.secure_url;
    }
    console.log('done');
  }

  return urls;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────────────────────

const MIN = 1;
const HOUR = 60;
const DAY = 24 * 60;

interface PostSpec {
  key: string;
  author: string; // username
  text: string;
  media?: string[]; // media keys, e.g. "story-01", "video-rooftop"
  agoMin: number; // minutes before the script runs
  replyTo?: string; // key of the parent post
  long?: boolean; // allowed to exceed 280 characters (the friends' letters)
}

const HER_U = HER.username;
const C = CREATOR.username;

const posts: PostSpec[] = [
  // ── Older timeline filler from the parody accounts ────────────────────────
  {
    key: 'dm_1',
    author: 'daily_manifest',
    agoMin: 14 * DAY,
    text: 'Say it with me: I am not behind. I am simply on a different timeline. ✨🔮 #ManifestingIt',
  },
  {
    key: 'bb_1',
    author: 'boardroom_buzz',
    agoMin: 13 * DAY,
    text: 'BREAKING: Local employee finishes meeting that could have been an email. Productivity unchanged. Coffee futures up 4%. ☕📈',
  },
  {
    key: 'at_1',
    author: 'astro_tarot',
    agoMin: 12 * DAY,
    text: "Scorpio season reminder: you are not 'too much'. You are a limited edition. ♏ Today's card: The Star ⭐ #ScorpioSeason",
  },
  {
    key: 'jd_1',
    author: 'jd_reunion_updates',
    agoMin: 11 * DAY,
    text: "Day 214 of being unbothered and extremely delulu. They are NOT apart, they're just on a very long break from each other's timelines. 🍀 #JDforever",
  },
  {
    key: 'nct_1',
    author: 'nct_zb1_daily',
    agoMin: 10 * DAY,
    text: 'Reminder that NCT Dream and ZB1 content is a valid form of therapy. Hydrate, stream, repeat. 💚🎧',
  },
  {
    key: 'ym_1',
    author: 'yoga_with_mochi',
    agoMin: 9 * DAY,
    text: 'Pose of the day: Downward Dog. Mochi has been doing it since 2021 and still has better form than you. 🐶🧘',
  },
  {
    key: 'hy_1',
    author: 'hydrate_or_diedrate',
    agoMin: 8 * DAY,
    text: 'Your body is 60% water and 40% anxiety. Please drink water. 💧',
  },
  {
    key: 'br_1',
    author: 'brainrot_central',
    agoMin: 7 * DAY,
    text: "me: I'll sleep early.\nmy brain at 2am: remember that thing you said in 2016? 💀",
  },
  {
    key: 'bb_2',
    author: 'boardroom_buzz',
    agoMin: 6 * DAY + 4 * HOUR,
    text: 'Market update: vibes are bullish, inflation is cooked, and the intern\'s laptop has 47 tabs open. Sources: trust me. 📊',
  },
  {
    key: 'dm_2',
    author: 'daily_manifest',
    agoMin: 5 * DAY,
    text: 'Manifestation checklist: 1) believe 2) drink water 3) apply for the job 4) believe harder. ✨',
  },
  {
    key: 'at_2',
    author: 'astro_tarot',
    agoMin: 4 * DAY + 5 * HOUR,
    text: 'Mercury retrograde is just the universe asking you to re-read your texts before sending. 🔮 #MercuryRetrograde',
  },
  {
    key: 'jd_2',
    author: 'jd_reunion_updates',
    agoMin: 3 * DAY + 2 * HOUR,
    media: ['video-joongdunk'],
    text: "Compilation of 'proof' they're still each other's person. Evidence: vibes. Admissibility: pending. 🌙 #JDforever",
  },
  {
    key: 'nct_2',
    author: 'nct_zb1_daily',
    agoMin: 2 * DAY + 3 * HOUR,
    text: 'Unpopular opinion: you can love NCT Dream AND ZB1 AND Thai pop AND your own devotional playlist. Range. 💚🛕',
  },
  {
    key: 'br_2',
    author: 'brainrot_central',
    agoMin: 1 * DAY + 6 * HOUR,
    text: "tell me you're almost 25 without telling me you're almost 25: \"I'm so tired\" (it's 8pm)",
  },

  // ── Her own posts (captions are her own words from her stories) ───────────
  {
    key: 'her_ny',
    author: HER_U,
    agoMin: 26 * DAY,
    media: ['story-12'],
    text: "new year same me because i'm perfect 🪞✨",
  },
  {
    key: 'her_spotify',
    author: HER_U,
    agoMin: 22 * DAY,
    media: ['story-08'],
    text: 'my top genres: K-Pop, Thai Pop, Swedish Pop, Tollywood, Devotional. why is this so funny 😭🎧',
  },
  {
    key: 'her_stress',
    author: HER_U,
    agoMin: 19 * DAY,
    media: ['story-09'],
    text: 'Friendship ended with STRESS. Now SUDARSHAN KRIYA is my best friend 🧘‍♀️✨',
  },
  {
    key: 'her_proxy',
    author: HER_U,
    agoMin: 17 * DAY,
    media: ['story-01'],
    text: 'parents doing my proxy 🎭😭',
  },
  {
    key: 'her_medal',
    author: HER_U,
    agoMin: 15 * DAY,
    media: ['story-06'],
    text: "tmi: my mom sent my tenant's relative all the way to Bangalore to retrieve my medal because I was too lazy to collect it myself 🏅😭",
  },
  {
    key: 'her_devotional',
    author: HER_U,
    agoMin: 12 * DAY + 3 * HOUR,
    media: ['story-10', 'story-11'],
    text: 'always in my devotional era 🛕🎶 (my running playlist is built different)',
  },
  {
    key: 'her_snuggles',
    author: HER_U,
    agoMin: 10 * DAY + 2 * HOUR,
    media: ['story-15'],
    text: 'All I want is snuggles. All I got is struggles. 🥲💗',
  },
  {
    key: 'her_sobbing',
    author: HER_U,
    agoMin: 9 * DAY + 5 * HOUR,
    media: ['story-16'],
    text: 'HAHAHA im so funny HAHAHA (typing this while sobbing) 🫠',
  },
  {
    key: 'her_notover',
    author: HER_U,
    agoMin: 8 * DAY + 3 * HOUR,
    media: ['story-02'],
    text: 'It is not over until I want it to. 🍀 #JDforever',
  },
  {
    key: 'her_dump1',
    author: HER_U,
    agoMin: 6 * DAY + 2 * HOUR,
    media: ['story-03', 'story-05', 'story-13', 'story-17'],
    text: 'random dump. do not ask. 🎞️',
  },
  {
    key: 'her_roof',
    author: HER_U,
    agoMin: 4 * DAY,
    media: ['video-rooftop'],
    text: 'rooftop sunset spin cycle = therapy 🌅💃',
  },
  {
    key: 'her_laddoo',
    author: HER_U,
    agoMin: 3 * DAY,
    media: ['laddoo'],
    text: 'laddoos by me 🥣✨ taste tested. approved.',
  },
  {
    key: 'her_grad',
    author: HER_U,
    agoMin: 2 * DAY + 6 * HOUR,
    media: ['graduation'],
    text: 'caps off. LLB (Hons) era: complete 🎓⚖️',
  },
  {
    key: 'her_squad',
    author: HER_U,
    agoMin: 2 * DAY,
    media: ['squad-with-dog'],
    text: 'my people 🫶 (and one very judgy dog)',
  },
  {
    key: 'her_dump2',
    author: HER_U,
    agoMin: 1 * DAY,
    media: ['story-18', 'story-20', 'story-21', 'story-22'],
    text: 'photo dump. (_.savii said pretty, so it is official 😌) #JDforever 🍀',
  },

  // ── Birthday morning (today) ──────────────────────────────────────────────
  {
    key: 'c_yearago',
    author: C,
    agoMin: 6 * HOUR,
    media: ['story-04'],
    text: 'ONE YEAR AGO TODAY: your 24th birthday grid. Nothing has changed except you now have your own website. 😌🎂',
  },
  {
    key: 'c_sleeping',
    author: C,
    agoMin: 4 * HOUR,
    media: ['sleeping-with-gifts'],
    text: 'Exhibit A: the birthday girl, asleep, surrounded by presents. Every polaroid wrapped with love. 🎁😴 Case closed, Your Honour. ⚖️',
  },
  {
    key: 'jd_bday',
    author: 'jd_reunion_updates',
    agoMin: 3 * HOUR,
    text: '🚨 BREAKING 🚨 Sources close to my imagination confirm: JoongDunk are back together. Official statement: none. Evidence: none. Emotional support: unlimited. Happy birthday @vaishanavi 🍀 (this account is delulu and proud) #JDforever',
  },
  {
    key: 'at_bday',
    author: 'astro_tarot',
    agoMin: 150,
    text: "Happy birthday to every Scorpio born on Oct 28 ♏ Today's forecast: cake. Tomorrow's forecast: more cake. Your card: The Sun ☀️ @vaishanavi 🔮",
  },
  {
    key: 'bb_bday',
    author: 'boardroom_buzz',
    agoMin: 120,
    text: 'MARKETS: 25-year-old @vaishanavi hits all-time high valuation. Analysts cite "excellent vibes" and "strong cake fundamentals". Outlook: bullish. 📈🎂',
  },
  {
    key: 'nct_bday',
    author: 'nct_zb1_daily',
    agoMin: 95,
    text: 'Birthday playlist loading: NCT Dream, ZB1, a little Thai pop, and one (1) Hanuman Chalisa for balance. 💚🎧🎂 @vaishanavi',
  },
  {
    key: 'ym_bday',
    author: 'yoga_with_mochi',
    agoMin: 75,
    text: 'Birthday yoga: Cake Pose (lie down, eat cake). Mochi approves. Happy birthday @vaishanavi 🐶🍰',
  },
  {
    key: 'br_bday',
    author: 'brainrot_central',
    agoMin: 58,
    text: '@vaishanavi is 25. no thoughts. head empty. only cake. 🎂🧠',
  },
  {
    key: 'dm_bday',
    author: 'daily_manifest',
    agoMin: 42,
    text: 'Manifest this: a year full of laughter, plot twists in your favour and zero buffering. Happy birthday @vaishanavi ✨🔮',
  },
  {
    key: 'hy_bday',
    author: 'hydrate_or_diedrate',
    agoMin: 30,
    text: '@vaishanavi birthday reminder: one glass of water per slice of cake. That is science. (It is not.) 💧',
  },

  // ── The main birthday post ────────────────────────────────────────────────
  {
    key: 'main',
    author: C,
    agoMin: 12 * MIN,
    text: '🎂 HAPPY 25th BIRTHDAY @vaishanavi!! 🎉✨ I built an entire X for you because you deserve your own timeline. Manifestations, tarot, delulu JD updates and all your favourite people live here. Log off, make a wish, and scroll. 🔮💜',
  },

  // ── Replies on the main post ──────────────────────────────────────────────
  { key: 'r_samiksha', author: 'samiksha_s', replyTo: 'main', agoMin: 9 * MIN, text: 'May your chai be hot and your JD stay forever. Happy birthday!! 🍀☕' },
  { key: 'r_shandeepa', author: 'shandeepa', replyTo: 'main', agoMin: 9 * MIN - 1, text: 'Eat the cake, skip the stress. Sudarshan Kriya can wait one day. Happy birthday!! 😂🧘‍♀️' },
  { key: 'r_akarsha', author: 'akarsha_', replyTo: 'main', agoMin: 8 * MIN, text: 'May your playlist be 90% NCT Dream and 10% Hanuman Chalisa today. Happy birthday! 🎧🛕' },
  { key: 'r_pooja', author: 'pooja_p', replyTo: 'main', agoMin: 8 * MIN - 1, text: 'Scorpio queen turning 25. The universe is fully yours. ♏✨ Happy birthday!!' },
  { key: 'r_pranava', author: 'pranava_', replyTo: 'main', agoMin: 7 * MIN, text: 'Tiaras for everyone, but especially you. 👑 Happy birthday, birthday girl!!' },
  { key: 'r_bhavitha', author: 'bhavitha_', replyTo: 'main', agoMin: 6 * MIN, text: 'Happy birthday to my favourite brainrot supplier. 🧠💜 Never change.' },
  { key: 'r_savitha', author: 'savii', replyTo: 'main', agoMin: 6 * MIN - 1, text: 'Pretty, funny and impossible to dislike. Happy birthday! (Still the cutest in every dump.) 😍' },
  { key: 'r_rudra', author: 'rudra_r', replyTo: 'main', agoMin: 5 * MIN, text: 'Please accept this very formal birthday wish from a very casual friend. Many happy returns! 🎉' },
  { key: 'r_dm', author: 'daily_manifest', replyTo: 'main', agoMin: 4 * MIN, text: 'Affirmation of the day: you are 25 and the universe RSVP\'d yes. ✨' },
  { key: 'r_at', author: 'astro_tarot', replyTo: 'main', agoMin: 4 * MIN - 1, text: 'Scorpio season is fully activated. Mercury says: eat cake before 6pm. ♏🔮' },
  { key: 'r_bb', author: 'boardroom_buzz', replyTo: 'main', agoMin: 3 * MIN, text: 'BREAKING: birthday girl valuation up 25% year on year. Analysts recommend: buy her a gift. 📈' },
  { key: 'r_jd', author: 'jd_reunion_updates', replyTo: 'main', agoMin: 3 * MIN - 1, text: 'Sources say JD also sends their regards. Source: me. Reliability: delulu. 🍀' },
  { key: 'r_ym', author: 'yoga_with_mochi', replyTo: 'main', agoMin: 2 * MIN, text: 'Mochi would like to wish you a happy birthday. Mochi has no hands, so this is a woof. 🐶' },
  { key: 'r_nct', author: 'nct_zb1_daily', replyTo: 'main', agoMin: 2 * MIN - 1, text: "Even NCT Dream wishes you a happy 25. (We made that up, but we believe in it.) 💚" },
  { key: 'r_br', author: 'brainrot_central', replyTo: 'main', agoMin: 1 * MIN, text: 'happy birthday to the girl who is literally so real for this 💀🎂' },
  { key: 'r_hy', author: 'hydrate_or_diedrate', replyTo: 'main', agoMin: 1 * MIN, text: 'Birthday reminder: drink a glass of water between slices. 💧' },

  // ── Replies on her own posts ──────────────────────────────────────────────
  { key: 'rg_rudra', author: 'rudra_r', replyTo: 'her_grad', agoMin: 2 * DAY + 4 * HOUR, text: 'Counsel for the vibes, sorted. ⚖️' },
  { key: 'rs_pooja', author: 'pooja_p', replyTo: 'her_squad', agoMin: 2 * DAY - 30, text: 'The dog is judging us again 😭' },
  { key: 'rd_savitha', author: 'savii', replyTo: 'her_dump2', agoMin: 1 * DAY - 40, text: 'Pretty!! 😍 (I stand by it.)' },
];

const ALL_FRIENDS = FRIENDS.map((f) => f.username);
const ALL_PARODY = PARODY.map((p) => p.username);
const ALL_SEEDED = [HER_U, C, ...ALL_FRIENDS, ...ALL_PARODY];

/** Who likes what. 'FRIENDS' / 'PARODY' / 'EVERYONE' are shortcuts. */
const likeSpec: Record<string, string[] | 'FRIENDS' | 'PARODY' | 'EVERYONE'> = {
  main: 'EVERYONE',
  c_sleeping: 'FRIENDS',
  c_yearago: 'FRIENDS',
  jd_bday: ['neha_xo', 'brinda_b', 'bhavitha_', 'savii'],
  at_bday: ['pooja_p', 'neha_xo', 'savii'],
  bb_bday: ['rudra_r', 'akshay_a', 'brinda_b'],
  nct_bday: ['akarsha_', 'neha_xo', 'bhavitha_'],
  ym_bday: 'FRIENDS',
  dm_bday: ['pranava_', 'savii', 'neha_xo'],
  br_bday: ['bhavitha_', 'pooja_p'],
  hy_bday: ['samiksha_s', 'shandeepa'],
  her_ny: 'FRIENDS',
  her_spotify: 'FRIENDS',
  her_stress: 'FRIENDS',
  her_proxy: ['neha_xo', 'brinda_b', 'savii', 'rudra_r', 'pooja_p'],
  her_medal: 'FRIENDS',
  her_devotional: ['akarsha_', 'pranava_', 'savii', 'samiksha_s'],
  her_snuggles: ['neha_xo', 'bhavitha_', 'savii'],
  her_sobbing: ['neha_xo', 'bhavitha_', 'pranava_', 'jd_reunion_updates'],
  her_notover: ['jd_reunion_updates', 'neha_xo', 'bhavitha_', 'savii', 'nct_zb1_daily'],
  her_dump1: ['neha_xo', 'savii'],
  her_roof: 'FRIENDS',
  her_laddoo: 'FRIENDS',
  her_grad: 'EVERYONE',
  her_squad: 'FRIENDS',
  her_dump2: 'FRIENDS',
  jd_2: [HER_U], // She has already liked the JD video — a little wink
  dm_1: [HER_U],
  at_1: [HER_U],
};

const repostSpec: Record<string, string[]> = {
  main: ['neha_xo', 'brinda_b', 'savii', 'daily_manifest'],
  her_grad: ['brinda_b', 'rudra_r', 'neha_xo'],
  her_notover: ['jd_reunion_updates'],
  her_dump2: ['savii', 'neha_xo'],
};

const herBookmarks = ['jd_2', 'dm_2', 'at_2'];

interface NotificationSpec {
  actor: string;
  type: NotificationType;
  tweetKey?: string;
  agoMin: number;
  read?: boolean;
}

/** Notifications that land in HER notification tab. */
const herNotifications: NotificationSpec[] = [
  { actor: C, type: 'MENTION', tweetKey: 'main', agoMin: 12 },
  ...['r_samiksha', 'r_shandeepa', 'r_akarsha', 'r_pooja', 'r_pranava', 'r_bhavitha', 'r_savitha', 'r_rudra'].map(
    (key, index): NotificationSpec => ({
      actor: posts.find((p) => p.key === key)!.author,
      type: 'REPLY',
      tweetKey: key,
      agoMin: 10 - Math.floor(index / 2),
    }),
  ),
  { actor: 'jd_reunion_updates', type: 'MENTION', tweetKey: 'jd_bday', agoMin: 180 },
  { actor: 'astro_tarot', type: 'MENTION', tweetKey: 'at_bday', agoMin: 150 },
  { actor: 'boardroom_buzz', type: 'MENTION', tweetKey: 'bb_bday', agoMin: 120 },
  { actor: 'nct_zb1_daily', type: 'MENTION', tweetKey: 'nct_bday', agoMin: 95 },
  { actor: 'neha_xo', type: 'REPOST', tweetKey: 'her_grad', agoMin: 2 * DAY, read: true },
  { actor: 'brinda_b', type: 'LIKE', tweetKey: 'her_grad', agoMin: 2 * DAY, read: true },
  { actor: 'savii', type: 'LIKE', tweetKey: 'her_dump2', agoMin: 1 * DAY - 20, read: true },
  { actor: 'bestie_dev', type: 'FOLLOW', agoMin: 3 * DAY, read: true },
];

interface DmSpec {
  with: string;
  messages: { fromHer: boolean; text: string; agoMin: number; unread?: boolean }[];
}

const dms: DmSpec[] = [
  {
    with: C,
    messages: [
      { fromHer: false, text: 'Psst. Open your notifications. 👀', agoMin: 9, unread: true },
      {
        fromHer: false,
        text: "Happy 25th birthday, V! 🎂 I built this whole X just for you. Things to try: tap the X logo three times, draw your tarot card, open the Memories tab, and like something (you'll see). 💜",
        agoMin: 8,
        unread: true,
      },
    ],
  },
  {
    with: 'savii',
    messages: [{ fromHer: false, text: 'HAPPY BIRTHDAY!!! Go check your gifts 🎁😭', agoMin: 35, unread: true }],
  },
];

const trends = [
  { category: 'Birthday · Trending', topic: '#HappyBirthdayVaishanavi', post_count: 2_810_000 },
  { category: 'Thai BL · Trending', topic: '#JDforever', post_count: 1_420_000 },
  { category: 'K-pop · Trending', topic: '#NCTDream', post_count: 986_000 },
  { category: 'K-pop · Trending', topic: '#ZB1', post_count: 764_000 },
  { category: 'Spirituality · Trending', topic: '#ManifestingIt', post_count: 641_000 },
  { category: 'Astrology · Trending', topic: 'Mercury Retrograde', post_count: 512_000 },
  { category: 'Wellness · Trending', topic: '#SudarshanKriya', post_count: 428_000 },
  { category: 'Astrology · Trending', topic: 'Scorpio Season', post_count: 391_000 },
  { category: 'Business · Trending', topic: '#CorporateTwitter', post_count: 337_000 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Letters from friends (kept in a private, git-ignored file)
// ─────────────────────────────────────────────────────────────────────────────

interface LetterSpec {
  username: string;
  text: string;
}

/**
 * The friends' real, personal messages live in prisma/birthday-media/letters.json
 * so they never end up in a public GitHub repo:
 *   [ { "username": "neha_xo", "text": "..." }, ... ]
 * Each one becomes a top-level post from that friend, and the Letters page in the
 * app shows them as sealed envelopes.
 */
function loadLetters(): LetterSpec[] {
  const file = path.join(MEDIA_DIR, 'letters.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      'Missing prisma/birthday-media/letters.json. Unzip birthday-media.zip (or birthday-letters.zip) into prisma/ and try again.',
    );
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('letters.json must be a list of { username, text } objects.');

  return parsed.map((item, index) => {
    const letter = item as Partial<LetterSpec>;
    if (typeof letter.username !== 'string' || typeof letter.text !== 'string' || !letter.text.trim()) {
      throw new Error(`letters.json item #${index + 1} needs a "username" and a "text".`);
    }
    return { username: letter.username, text: letter.text };
  });
}

function addLetterPosts(): void {
  loadLetters().forEach((letter, index) => {
    const key = `letter_${letter.username}`;
    posts.push({ key, author: letter.username, agoMin: 300 - index * 20, text: letter.text, long: true });
    likeSpec[key] = 'FRIENDS';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation (also what --dry-run prints)
// ─────────────────────────────────────────────────────────────────────────────

function validateContent(): void {
  const keys = new Set<string>();
  const sorted = [...posts].sort((a, b) => b.agoMin - a.agoMin);
  const seen = new Set<string>();
  const usernames = new Set(ALL_SEEDED);
  const usedMedia = new Set(MEDIA_FILES.map(keyOf));

  for (const post of sorted) {
    if (keys.has(post.key)) throw new Error(`Duplicate post key: ${post.key}`);
    keys.add(post.key);
    if (!usernames.has(post.author)) throw new Error(`Unknown author "${post.author}" in ${post.key}`);
    if (!post.long && post.text.length > 280) throw new Error(`Post ${post.key} is ${post.text.length} chars (max 280)`);
    if (post.replyTo && !seen.has(post.replyTo)) {
      throw new Error(`Reply ${post.key} must come after its parent ${post.replyTo}`);
    }
    for (const media of post.media ?? []) {
      if (!usedMedia.has(media)) throw new Error(`Post ${post.key} uses unknown media "${media}"`);
    }
    seen.add(post.key);
  }

  for (const key of [...Object.keys(likeSpec), ...Object.keys(repostSpec), ...herBookmarks]) {
    if (!keys.has(key)) throw new Error(`Engagement references unknown post "${key}"`);
  }
  for (const n of herNotifications) {
    if (n.tweetKey && !keys.has(n.tweetKey)) throw new Error(`Notification references unknown post "${n.tweetKey}"`);
  }

  const dupes = ALL_SEEDED.filter((u, i) => ALL_SEEDED.indexOf(u) !== i);
  if (dupes.length) throw new Error(`Duplicate usernames: ${dupes.join(', ')}`);

  console.log(`Content OK: ${posts.length} posts, ${ALL_SEEDED.length} accounts, ${trends.length} trends.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Database helpers
// ─────────────────────────────────────────────────────────────────────────────

type IdMap = Record<string, string>; // username -> user id

async function upsertUser(
  data: {
    username: string;
    display_name: string;
    email: string;
    password_hash: string;
    bio: string;
    avatar_url?: string;
    banner_url?: string;
    location?: string;
    is_verified?: boolean;
    created_at?: Date;
  },
  updatePassword: boolean,
): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { username: data.username } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        display_name: data.display_name,
        bio: data.bio,
        avatar_url: data.avatar_url ?? existing.avatar_url,
        banner_url: data.banner_url ?? existing.banner_url,
        location: data.location ?? existing.location,
        is_verified: data.is_verified ?? existing.is_verified,
        ...(data.created_at ? { created_at: data.created_at } : {}),
        ...(updatePassword ? { password_hash: data.password_hash } : {}),
      },
    });
    return existing.id;
  }

  const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
  if (emailTaken) {
    throw new Error(
      `The email ${data.email} already belongs to @${emailTaken.username}. Delete that account first or change the email in seed-birthday.ts.`,
    );
  }

  const created = await prisma.user.create({
    data: {
      username: data.username,
      display_name: data.display_name,
      email: data.email,
      password_hash: data.password_hash,
      bio: data.bio,
      avatar_url: data.avatar_url ?? '',
      banner_url: data.banner_url ?? '',
      location: data.location ?? '',
      is_verified: data.is_verified ?? false,
      ...(data.created_at ? { created_at: data.created_at } : {}),
    },
  });
  return created.id;
}

/** Remove everything the birthday accounts own (and replies to it). Nothing else. */
async function cleanup(ids: string[]): Promise<void> {
  console.log('Removing previous birthday content (--force)...');

  // Collect every tweet by a seeded account plus all replies underneath them.
  const levels: string[][] = [];
  let frontier = (
    await prisma.tweet.findMany({ where: { author_id: { in: ids } }, select: { id: true } })
  ).map((t) => t.id);
  const all = new Set<string>(frontier);

  while (frontier.length > 0) {
    levels.push(frontier);
    const children = (
      await prisma.tweet.findMany({
        where: { reply_to_tweet_id: { in: frontier } },
        select: { id: true },
      })
    )
      .map((t) => t.id)
      .filter((id) => !all.has(id));
    children.forEach((id) => all.add(id));
    frontier = children;
  }

  const tweetIds = [...all];

  await prisma.notification.deleteMany({
    where: { OR: [{ recipient_id: { in: ids } }, { actor_id: { in: ids } }, { tweet_id: { in: tweetIds } }] },
  });
  const conversations = await prisma.conversation.findMany({
    where: { participant_ids: { hasSome: ids } },
    select: { id: true },
  });
  const conversationIds = conversations.map((c) => c.id);
  await prisma.message.deleteMany({
    where: { OR: [{ conversation_id: { in: conversationIds } }, { sender_id: { in: ids } }] },
  });
  await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  await prisma.like.deleteMany({ where: { OR: [{ user_id: { in: ids } }, { tweet_id: { in: tweetIds } }] } });
  await prisma.repost.deleteMany({ where: { OR: [{ user_id: { in: ids } }, { tweet_id: { in: tweetIds } }] } });
  await prisma.bookmark.deleteMany({ where: { OR: [{ user_id: { in: ids } }, { tweet_id: { in: tweetIds } }] } });
  await prisma.tweetMedia.deleteMany({ where: { tweet_id: { in: tweetIds } } });

  // Deepest replies first (the self-relation blocks deleting a parent first).
  for (const level of [...levels].reverse()) {
    await prisma.tweet.deleteMany({ where: { id: { in: level } } });
  }

  await prisma.follow.deleteMany({
    where: { OR: [{ follower_id: { in: ids } }, { following_id: { in: ids } }] },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  addLetterPosts();
  validateContent();
  checkMediaFiles();

  if (DRY_RUN) {
    console.log('Dry run complete: all media files found, nothing was uploaded or written.');
    return;
  }

  const existingHer = await prisma.user.findUnique({ where: { username: HER.username } });
  if (existingHer) {
    const herTweets = await prisma.tweet.count({ where: { author_id: existingHer.id } });
    if (herTweets > 0 && !FORCE) {
      console.log(
        `@${HER.username} already has ${herTweets} posts, so the birthday content looks seeded already.\n` +
          'Run with --force to rebuild it (this only removes content owned by the birthday accounts).',
      );
      return;
    }
  }

  console.log('Uploading media to Cloudinary...');
  const media = await uploadMedia();

  console.log('Creating accounts...');
  const herHash = await bcrypt.hash(HER.password, BCRYPT_ROUNDS);
  // Everyone else gets a random password nobody knows (they are not meant to be logged into).
  const lockedHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), BCRYPT_ROUNDS);

  const users: IdMap = {};
  users[HER.username] = await upsertUser(
    {
      username: HER.username,
      display_name: HER.display_name,
      email: HER.email,
      password_hash: herHash,
      bio: HER.bio,
      avatar_url: media['avatar'],
      banner_url: media['banner'],
      location: HER.location,
      is_verified: true,
      created_at: HER.created_at,
    },
    true,
  );
  users[CREATOR.username] = await upsertUser(
    {
      username: CREATOR.username,
      display_name: CREATOR.display_name,
      email: `${CREATOR.username}@birthday.invalid`,
      password_hash: lockedHash,
      bio: CREATOR.bio,
      is_verified: true,
    },
    false,
  );
  for (const persona of [...FRIENDS, ...PARODY]) {
    users[persona.username] = await upsertUser(
      {
        username: persona.username,
        display_name: persona.display_name,
        email: `${persona.username}@birthday.invalid`,
        password_hash: lockedHash,
        bio: persona.bio,
        is_verified: persona.verified ?? false,
      },
      false,
    );
  }

  const seededIds = ALL_SEEDED.map((u) => users[u]);
  if (FORCE) await cleanup(seededIds);

  console.log('Creating follows...');
  const followPairs: { follower: string; following: string }[] = [];
  // She follows everyone except the two "Who to follow" suggestions.
  for (const u of ALL_SEEDED) {
    if (u === HER_U || NOT_FOLLOWED_BY_HER.has(u)) continue;
    followPairs.push({ follower: HER_U, following: u });
  }
  // Everyone follows her back, and the friends follow the parody accounts.
  for (const u of ALL_SEEDED) {
    if (u !== HER_U) followPairs.push({ follower: u, following: HER_U });
  }
  for (const friend of ALL_FRIENDS) {
    for (const parody of ALL_PARODY) followPairs.push({ follower: friend, following: parody });
  }
  for (const pair of followPairs) {
    await prisma.follow.upsert({
      where: {
        follower_id_following_id: { follower_id: users[pair.follower], following_id: users[pair.following] },
      },
      update: {},
      create: { follower_id: users[pair.follower], following_id: users[pair.following] },
    });
  }

  console.log('Creating posts...');
  // Oldest first, so ObjectId order matches chronological order. The feeds use
  // ObjectIds for cursor pagination and created_at for sorting; they must agree.
  const now = Date.now();
  const sorted = [...posts].sort((a, b) => b.agoMin - a.agoMin);
  const tweetIds: Record<string, string> = {};

  for (const post of sorted) {
    const created = await prisma.tweet.create({
      data: {
        content: post.text,
        author_id: users[post.author],
        reply_to_tweet_id: post.replyTo ? tweetIds[post.replyTo] : undefined,
        created_at: new Date(now - post.agoMin * 60_000),
        media: {
          create: (post.media ?? []).map((mediaKey) => ({
            url: media[mediaKey],
            media_type: mediaKey.startsWith('video-') ? 'video' : 'image',
          })),
        },
      },
    });
    tweetIds[post.key] = created.id;
  }

  console.log('Creating likes, reposts and bookmarks...');
  const expand = (spec: string[] | 'FRIENDS' | 'PARODY' | 'EVERYONE'): string[] =>
    spec === 'FRIENDS'
      ? ALL_FRIENDS
      : spec === 'PARODY'
        ? ALL_PARODY
        : spec === 'EVERYONE'
          ? [C, ...ALL_FRIENDS, ...ALL_PARODY]
          : spec;

  for (const [postKey, spec] of Object.entries(likeSpec)) {
    const owner = posts.find((p) => p.key === postKey)!.author;
    // The birthday girl is left to like the main post herself — that's the fun part.
    const likers = expand(spec).filter((u) => u !== owner);
    for (const liker of likers) {
      await prisma.like.upsert({
        where: { user_id_tweet_id: { user_id: users[liker], tweet_id: tweetIds[postKey] } },
        update: {},
        create: { user_id: users[liker], tweet_id: tweetIds[postKey] },
      });
    }
  }
  for (const [postKey, reposters] of Object.entries(repostSpec)) {
    for (const reposter of reposters) {
      await prisma.repost.upsert({
        where: { user_id_tweet_id: { user_id: users[reposter], tweet_id: tweetIds[postKey] } },
        update: {},
        create: { user_id: users[reposter], tweet_id: tweetIds[postKey] },
      });
    }
  }
  for (const postKey of herBookmarks) {
    await prisma.bookmark.upsert({
      where: { user_id_tweet_id: { user_id: users[HER_U], tweet_id: tweetIds[postKey] } },
      update: {},
      create: { user_id: users[HER_U], tweet_id: tweetIds[postKey] },
    });
  }

  console.log('Creating notifications...');
  const notifications = [...herNotifications].sort((a, b) => b.agoMin - a.agoMin);
  for (const n of notifications) {
    const createdAt = new Date(now - n.agoMin * 60_000);
    await prisma.notification.create({
      data: {
        recipient_id: users[HER_U],
        actor_id: users[n.actor],
        type: n.type,
        tweet_id: n.tweetKey ? tweetIds[n.tweetKey] : undefined,
        created_at: createdAt,
        read_at: n.read ? createdAt : null,
      },
    });
  }

  console.log('Creating messages...');
  for (const dm of dms) {
    const other = users[dm.with];
    const ordered = [...dm.messages].sort((a, b) => b.agoMin - a.agoMin);
    const last = ordered[ordered.length - 1];
    const conversation = await prisma.conversation.create({
      data: {
        participant_ids: [users[HER_U], other].sort(),
        last_message_at: new Date(now - last.agoMin * 60_000),
      },
    });
    for (const message of ordered) {
      const createdAt = new Date(now - message.agoMin * 60_000);
      await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          sender_id: message.fromHer ? users[HER_U] : other,
          content: message.text,
          created_at: createdAt,
          read_at: message.unread ? null : createdAt,
        },
      });
    }
  }

  console.log('Creating trends...');
  for (const trend of trends) {
    await prisma.trend.upsert({
      where: { topic: trend.topic },
      update: { category: trend.category, post_count: trend.post_count },
      create: trend,
    });
  }

  console.log('\nBirthday seed complete! 🎂');
  console.log(`Login:  ${HER.email}  /  ${HER.password}`);
}

main()
  .catch((err) => {
    console.error('Birthday seed failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!DRY_RUN) await prisma.$disconnect();
  });
