import { Request, Response, NextFunction } from "express";

interface AttemptEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptEntry>();

const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 20;

const getWindowMs = () => {
  const envValue = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(envValue) && envValue > 0
    ? envValue
    : DEFAULT_WINDOW_MS;
};

const getMaxAttempts = () => {
  const envValue = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS);
  return Number.isFinite(envValue) && envValue > 0
    ? Math.floor(envValue)
    : DEFAULT_MAX_ATTEMPTS;
};

const isRateLimitEnabled = () => {
  if (process.env.NODE_ENV === "test") {
    return false;
  }
  return process.env.AUTH_RATE_LIMIT_ENABLED !== "false";
};

const buildKey = (req: Request) => {
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  return `${req.ip}:${req.path}:${email.toLowerCase()}`;
};

export const authRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRateLimitEnabled()) {
    return next();
  }

  const now = Date.now();
  const windowMs = getWindowMs();
  const maxAttempts = getMaxAttempts();
  const key = buildKey(req);
  const existing = attempts.get(key);

  if (!existing || existing.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );
    res.setHeader("Retry-After", retryAfterSeconds.toString());
    return res.status(429).send({
      errors: [
        {
          message:
            "Demasiados intentos de autenticación. Intenta nuevamente en unos minutos.",
        },
      ],
    });
  }

  existing.count += 1;
  attempts.set(key, existing);
  next();
};
