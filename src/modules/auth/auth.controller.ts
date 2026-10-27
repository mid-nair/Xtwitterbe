import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import type { LoginDto, RegisterDto } from './auth.dto';

export async function loginHandler(
  req: Request<object, object, LoginDto>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await authService.login(req.body);
    res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function registerHandler(
  req: Request<object, object, RegisterDto>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await authService.register(req.body);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
}
