import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

interface AttemptEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptEntry>();
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX_ATTEMPTS = 300;

const shouldSkipSecurity = () => process.env.NODE_ENV === "test";

const parseOrigin = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const getAllowedOrigins = (req: Request) => {
  const origins = new Set<string>(DEFAULT_ALLOWED_ORIGINS);

  const envCandidates = [process.env.CLIENT_URL, process.env.ALLOWED_ORIGINS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","));

  for (const candidate of envCandidates) {
    const normalized = parseOrigin(candidate.trim());
    if (normalized) {
      origins.add(normalized);
    }
  }

  const host = req.get("host");
  if (host) {
    const forwardedProto = req
      .get("x-forwarded-proto")
      ?.split(",")[0]
      .trim()
      .toLowerCase();

    const protocol = forwardedProto || req.protocol || "http";
    origins.add(`${protocol}://${host}`);
  }

  return origins;
};

const appendVary = (res: Response, value: string) => {
  const current = res.getHeader("Vary");
  const values = new Set<string>();

  if (typeof current === "string") {
    current
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => values.add(item));
  }

  values.add(value);
  res.setHeader("Vary", Array.from(values).join(", "));
};

const applySecurityHeaders = (res: Response) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
};

const applyCorsHeaders = (
  req: Request,
  res: Response,
  allowedOrigins: Set<string>
) => {
  const origin = parseOrigin(req.get("origin"));
  if (!origin || !allowedOrigins.has(origin)) {
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-CSRF-Token"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  appendVary(res, "Origin");
};

const getRateLimitWindowMs = () => {
  const envValue = Number(process.env.API_RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(envValue) && envValue > 0
    ? envValue
    : DEFAULT_RATE_LIMIT_WINDOW_MS;
};

const getRateLimitMaxAttempts = () => {
  const envValue = Number(process.env.API_RATE_LIMIT_MAX_ATTEMPTS);
  return Number.isFinite(envValue) && envValue > 0
    ? Math.floor(envValue)
    : DEFAULT_RATE_LIMIT_MAX_ATTEMPTS;
};

const isRateLimitEnabled = () => {
  if (shouldSkipSecurity()) {
    return false;
  }

  return process.env.API_RATE_LIMIT_ENABLED !== "false";
};

const applyRateLimit = (req: Request, res: Response) => {
  if (!isRateLimitEnabled()) {
    return true;
  }

  const now = Date.now();
  const windowMs = getRateLimitWindowMs();
  const maxAttempts = getRateLimitMaxAttempts();
  const key = `${req.ip}:${req.path}`;
  const existing = attempts.get(key);

  if (!existing || existing.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );

    res.setHeader("Retry-After", retryAfterSeconds.toString());
    res.status(429).send({
      errors: [
        {
          message:
            "Demasiadas solicitudes desde esta IP. Intenta nuevamente en unos minutos.",
        },
      ],
    });
    return false;
  }

  existing.count += 1;
  attempts.set(key, existing);
  return true;
};

const enforceHttps = (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const forwardedProto = req
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim()
    .toLowerCase();

  if (forwardedProto && forwardedProto !== "https") {
    res.status(426).send({
      errors: [
        {
          message: "HTTPS es obligatorio en producción.",
        },
      ],
    });
    return false;
  }

  return true;
};

const ensureCsrfCookie = (req: Request, res: Response) => {
  const existingToken =
    typeof req.cookies?.csrfToken === "string" ? req.cookies.csrfToken : "";

  if (existingToken) {
    return existingToken;
  }

  const csrfToken = crypto.randomBytes(24).toString("hex");
  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return csrfToken;
};

const getRequestOrigin = (req: Request) => {
  const originHeader = parseOrigin(req.get("origin"));
  if (originHeader) {
    return originHeader;
  }

  return parseOrigin(req.get("referer"));
};

const isUnsafeMethod = (method: string) =>
  UNSAFE_METHODS.has(method.toUpperCase());

const validateCsrf = (
  req: Request,
  res: Response,
  allowedOrigins: Set<string>,
  csrfCookieToken: string
) => {
  const hasAuthCookie =
    typeof req.cookies?.token === "string" && req.cookies.token.length > 0;

  if (!hasAuthCookie || !isUnsafeMethod(req.method)) {
    return true;
  }

  const requestOrigin = getRequestOrigin(req);
  if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
    res.status(403).send({
      errors: [
        {
          message: "Origen no permitido para esta operación.",
        },
      ],
    });
    return false;
  }

  const csrfHeaderToken = req.get("x-csrf-token");
  if (!csrfHeaderToken || csrfHeaderToken !== csrfCookieToken) {
    res.status(403).send({
      errors: [
        {
          message: "Token CSRF inválido o ausente.",
        },
      ],
    });
    return false;
  }

  return true;
};

export const securityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (shouldSkipSecurity()) {
    return next();
  }

  applySecurityHeaders(res);

  const allowedOrigins = getAllowedOrigins(req);
  applyCorsHeaders(req, res, allowedOrigins);

  if (req.method.toUpperCase() === "OPTIONS") {
    return res.status(204).send();
  }

  if (!enforceHttps(req, res)) {
    return;
  }

  if (!applyRateLimit(req, res)) {
    return;
  }

  const csrfCookieToken = ensureCsrfCookie(req, res);
  if (!validateCsrf(req, res, allowedOrigins, csrfCookieToken)) {
    return;
  }

  next();
};
