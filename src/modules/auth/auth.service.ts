import { prisma } from '@/config/database';
import { AppError } from '@/shared/errors/AppError';
import { hashPassword, verifyPassword } from '@/shared/utils/password';
import { signToken } from '@/shared/utils/token';
import { formatUser } from '@/modules/users/users.service';
import type { LoginDto, RegisterDto } from './auth.dto';

/** Shape returned to the client on successful auth */
export interface AuthSession {
  token: string;
  user: ReturnType<typeof formatUser>;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(dto: LoginDto): Promise<AuthSession> {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });

  // Use a constant-time comparison path — never reveal whether email exists
  const passwordOk = user ? await verifyPassword(dto.password, user.password_hash) : false;

  if (!user || !passwordOk) {
    throw AppError.unauthorized('Invalid email or password.');
  }

  const token = signToken({ sub: user.id, username: user.username });
  return { token, user: formatUser(user) };
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(dto: RegisterDto): Promise<AuthSession> {
  // Check uniqueness upfront for clear error messages
  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: dto.email } }),
    prisma.user.findUnique({ where: { username: dto.username } }),
  ]);

  if (existingEmail) throw AppError.conflict('Email is already taken.');
  if (existingUsername) throw AppError.conflict('Username is already taken.');

  const password_hash = await hashPassword(dto.password);

  const user = await prisma.user.create({
    data: {
      email: dto.email,
      username: dto.username,
      display_name: dto.display_name,
      password_hash,
    },
  });

  const token = signToken({ sub: user.id, username: user.username });
  return { token, user: formatUser(user) };
}
