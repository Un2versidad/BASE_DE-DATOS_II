import express, { Request, Response } from "express";
import { body } from "express-validator";
import { validateRequest, BadRequestError } from "@eftickets/common";
import { Password } from "../services/password";
import { User } from "../models/user";
import { UserDocMethod } from "../types/IUser";
import { verifyHCaptcha } from "../services/hcaptcha";
import { authRateLimit } from "../middlewares/auth-rate-limit";
import { issueSession, setSessionCookies } from "../services/session";
import { syncEffectiveUserRole } from "../services/admin-access";

const router = express.Router();

type ApiPrefix = "/api" | "/api/v1";
type SignInPath = `${ApiPrefix}/users/signin` | "/api/v1/auth/sessions";

const signInPaths = [
  "/api/users/signin",
  "/api/v1/users/signin",
  "/api/v1/auth/sessions",
] as const satisfies readonly SignInPath[];

router.post(
  [...signInPaths],
  authRateLimit,
  [
    body("email")
      .trim()
      .normalizeEmail({ gmail_remove_dots: false })
      .isEmail()
      .withMessage("El correo debe ser válido"),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("Debes proporcionar una contraseña"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password, captchaToken } = req.body;

    await verifyHCaptcha(captchaToken, req.ip);

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throw new BadRequestError("Credenciales inválidas");
    }

    const passwordsMatch = await Password.compare(
      existingUser.password,
      password
    );
    if (!passwordsMatch) {
      throw new BadRequestError("Credenciales inválidas");
    }

    const role = await syncEffectiveUserRole(existingUser as UserDocMethod);

    const session = await issueSession({
      user: existingUser as UserDocMethod,
      req,
    });
    setSessionCookies(res, session.accessToken, session.refreshToken);

    res.status(200).send({
      id: existingUser.id,
      email: existingUser.email,
      role,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    });
  }
);

export { router as signinRouter };
