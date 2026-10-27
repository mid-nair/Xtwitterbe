import { Router } from 'express';
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

export default router;
