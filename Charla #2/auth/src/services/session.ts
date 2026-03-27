import crypto from "crypto";
import { Request, Response } from "express";
import { UserDocMethod } from "../types/IUser";
import { RefreshToken } from "../models/refresh-token";
import type {
  AccessToken,
  AccessTokenTtlSeconds,
  IssuedSession,
  Iso8601UtcString,
  RefreshTokenHash,
  RefreshTokenTtlDays,
  RefreshTokenValue,
} from "../types/session";

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;

interface SessionCookieOptions {
  maxAge?: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  secure?: boolean;
}

interface IssueSessionParams {
  user: UserDocMethod;
  req: Request;
  previousTokenHash?: RefreshTokenHash;
}

const parsePositiveNumber = <TBrand extends string>(
  value: string | undefined,
  fallback: number
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback as number & { readonly __brand: TBrand };
  }

  return Math.floor(parsed) as number & { readonly __brand: TBrand };
};

const toIso8601UtcString = (value: Date) =>
  value.toISOString() as Iso8601UtcString;

const toAccessToken = (value: string) => value as AccessToken;

const toRefreshToken = (value: string) => value as RefreshTokenValue;

export const getAccessTokenTtlSeconds = (): AccessTokenTtlSeconds =>
  parsePositiveNumber<"AccessTokenTtlSeconds">(
    process.env.ACCESS_TOKEN_TTL_SECONDS,
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS
  );

export const getRefreshTokenTtlDays = (): RefreshTokenTtlDays =>
  parsePositiveNumber<"RefreshTokenTtlDays">(
    process.env.REFRESH_TOKEN_TTL_DAYS,
    DEFAULT_REFRESH_TOKEN_TTL_DAYS
  );

export const hashRefreshToken = (token: string): RefreshTokenHash =>
  crypto.createHash("sha256").update(token).digest("hex") as RefreshTokenHash;

const createRefreshTokenValue = (): RefreshTokenValue =>
  toRefreshToken(crypto.randomBytes(48).toString("hex"));

const buildAccessCookieOptions = (): SessionCookieOptions => {
  const options: SessionCookieOptions = {
    maxAge: getAccessTokenTtlSeconds() * 1000,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  return options;
};

const buildRefreshCookieOptions = (): SessionCookieOptions => {
  const options: SessionCookieOptions = {
    maxAge: getRefreshTokenTtlDays() * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  return options;
};

const buildAccessClearCookieOptions = (): SessionCookieOptions => {
  const options: SessionCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  return options;
};

const buildRefreshClearCookieOptions = (): SessionCookieOptions => {
  const options: SessionCookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  return options;
};

export const clearSessionCookies = (res: Response) => {
  res.clearCookie("token", buildAccessClearCookieOptions());
  res.clearCookie("refreshToken", buildRefreshClearCookieOptions());
};

export const revokeRefreshTokenByHash = async (
  tokenHash: RefreshTokenHash,
  replacedByTokenHash?: RefreshTokenHash
) => {
  const existing = await RefreshToken.findOne({ tokenHash });
  if (!existing || existing.revokedAt) {
    return existing;
  }

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = replacedByTokenHash || null;
  await existing.save();
  return existing;
};

export const revokeAllUserRefreshTokens = async (userId: string) => {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

export const issueSession = async ({
  user,
  req,
  previousTokenHash,
}: IssueSessionParams): Promise<IssuedSession> => {
  const accessTokenTtlSeconds = getAccessTokenTtlSeconds();
  const refreshTokenTtlDays = getRefreshTokenTtlDays();

  const accessToken = toAccessToken(user.getJwtToken(accessTokenTtlSeconds));
  const refreshToken = createRefreshTokenValue();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = new Date(
    Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000
  );

  if (previousTokenHash) {
    await revokeRefreshTokenByHash(previousTokenHash, refreshTokenHash);
  }

  await RefreshToken.build({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: refreshTokenExpiresAt,
    createdByIp: req.ip,
    userAgent: req.get("user-agent"),
  }).save();

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: toIso8601UtcString(
      new Date(Date.now() + accessTokenTtlSeconds * 1000)
    ),
    refreshTokenExpiresAt: toIso8601UtcString(refreshTokenExpiresAt),
    refreshTokenHash,
  };
};

export const setSessionCookies = (
  res: Response,
  accessToken: AccessToken,
  refreshToken: RefreshTokenValue
) => {
  res.cookie("token", accessToken, buildAccessCookieOptions());
  res.cookie("refreshToken", refreshToken, buildRefreshCookieOptions());
};
