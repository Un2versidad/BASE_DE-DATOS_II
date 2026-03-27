import express, { Request, Response } from "express";
import { NotAuthorizedError } from "@eftickets/common";
import { RefreshToken } from "../models/refresh-token";
import { User } from "../models/user";
import { UserDocMethod } from "../types/IUser";
import {
  clearSessionCookies,
  hashRefreshToken,
  issueSession,
  revokeAllUserRefreshTokens,
  setSessionCookies,
} from "../services/session";
import { syncEffectiveUserRole } from "../services/admin-access";

const router = express.Router();

type ApiPrefix = "/api" | "/api/v1";
type RefreshSessionPath = `${ApiPrefix}/users/refresh` | "/api/v1/auth/refresh";

const refreshSessionPaths = [
  "/api/users/refresh",
  "/api/v1/users/refresh",
  "/api/v1/auth/refresh",
] as const satisfies readonly RefreshSessionPath[];

router.post([...refreshSessionPaths], async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new NotAuthorizedError();
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash: refreshTokenHash });
  if (!storedToken) {
    clearSessionCookies(res);
    throw new NotAuthorizedError();
  }

  const isExpired = storedToken.expiresAt.getTime() <= Date.now();
  if (storedToken.revokedAt || isExpired) {
    await revokeAllUserRefreshTokens(storedToken.userId);
    clearSessionCookies(res);
    throw new NotAuthorizedError();
  }

  const user = await User.findById(storedToken.userId);
  if (!user) {
    await revokeAllUserRefreshTokens(storedToken.userId);
    clearSessionCookies(res);
    throw new NotAuthorizedError();
  }

  const role = await syncEffectiveUserRole(user as UserDocMethod);

  const session = await issueSession({
    user: user as UserDocMethod,
    req,
    previousTokenHash: refreshTokenHash,
  });
  setSessionCookies(res, session.accessToken, session.refreshToken);

  res.status(200).send({
    id: user.id,
    email: user.email,
    role,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
  });
});

export { router as refreshSessionRouter };
