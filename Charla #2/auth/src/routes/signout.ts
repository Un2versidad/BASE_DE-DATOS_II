import express from "express";
import { clearSessionCookies, hashRefreshToken, revokeRefreshTokenByHash } from "../services/session";

const router = express.Router();
type ApiPrefix = "/api" | "/api/v1";
type SignoutPath = `${ApiPrefix}/users/signout` | "/api/v1/auth/signout";
const signoutPaths = [
  "/api/users/signout",
  "/api/v1/users/signout",
  "/api/v1/auth/signout",
] as const satisfies readonly SignoutPath[];

const clearAuthCookie = async (req: express.Request, res: express.Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (typeof refreshToken === "string" && refreshToken.length > 0) {
    await revokeRefreshTokenByHash(hashRefreshToken(refreshToken));
  }

  clearSessionCookies(res);
  res.send({});
};

router.post([...signoutPaths], clearAuthCookie);
router.delete("/api/v1/auth/sessions/current", clearAuthCookie);

export { router as signoutRouter };
