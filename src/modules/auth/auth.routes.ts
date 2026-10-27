import { Router } from 'express';
import { env } from '@/config/env';
import { validate } from '@/middleware/validate.middleware';
import { loginSchema, registerSchema } from './auth.dto';
import { loginHandler, registerHandler } from './auth.controller';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
router.post('/login', validate(loginSchema), loginHandler);

/**
 * POST /api/v1/auth/register
 * Body: { email, password, username, display_name }
 */
router.post('/register', validate(registerSchema), registerHandler);

// Browsers open URLs with GET. Redirect humans to the frontend auth pages;
// API clients must use POST with a JSON body.
router.get('/login', (_req, res) => {
  res.redirect(`${env.frontendUrl}/login`);
});
router.get('/register', (_req, res) => {
  res.redirect(`${env.frontendUrl}/register`);
});

export default router;
