import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';

// ─── Route modules ────────────────────────────────────────────────────────────
import authRoutes from '@/modules/auth/auth.routes';
import usersRoutes from '@/modules/users/users.routes';
import tweetsRoutes from '@/modules/tweets/tweets.routes';
import timelineRoutes from '@/modules/timeline/timeline.routes';
import bookmarksRoutes from '@/modules/bookmarks/bookmarks.routes';
import trendsRoutes from '@/modules/trends/trends.routes';
import exploreRoutes from '@/modules/explore/explore.routes';
import notificationsRoutes from '@/modules/notifications/notifications.routes';
import messagesRoutes from '@/modules/messages/messages.routes';
import uploadsRoutes from '@/modules/uploads/uploads.routes';

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: env.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ─── Rate limiting ────────────────────────────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests — please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts — please try again later.' },
});

app.use(globalLimiter);

// ─── Body parsing & logging ───────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isDev ? 'dev' : 'combined'));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.nodeEnv, timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────

const API = '/api/v1';

app.use(`${API}/auth`, authLimiter, authRoutes);
app.use(`${API}/users`, usersRoutes);
app.use(`${API}/tweets`, tweetsRoutes);
app.use(`${API}/timeline`, timelineRoutes);
app.use(`${API}/bookmarks`, bookmarksRoutes);
app.use(`${API}/trends`, trendsRoutes);
app.use(`${API}/explore`, exploreRoutes);
app.use(`${API}/notifications`, notificationsRoutes);
app.use(`${API}/conversations`, messagesRoutes);
app.use(`${API}/uploads`, uploadsRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────

// Must be registered last
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
