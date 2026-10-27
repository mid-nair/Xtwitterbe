import { Router } from 'express';
import type { Request, Response } from 'express';
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

// Browsers open URLs with GET. Auth endpoints are POST-only, so return a clear
// 405 instead of Express's default "Cannot GET" 404.
router.get('/login', methodNotAllowed);
router.get('/register', methodNotAllowed);

function methodNotAllowed(_req: Request, res: Response): void {
  res
    .set('Allow', 'POST')
    .status(405)
    .json({ message: 'Method Not Allowed. Send a POST request with a JSON body.' });
}

export default router;
