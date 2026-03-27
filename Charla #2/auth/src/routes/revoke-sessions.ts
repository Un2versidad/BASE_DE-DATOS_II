import express, { Request, Response } from "express";
import { isAuthenticated } from "@eftickets/common";
import { body, param } from "express-validator";
import { validateRequest } from "@eftickets/common";
import {
  clearSessionCookies,
  revokeAllUserRefreshTokens,
} from "../services/session";
import {
  requireAuthenticatedUser,
  requireRole,
} from "../middlewares/authorization";

const router = express.Router();

router.post(
  "/api/v1/auth/sessions/revoke-all",
  isAuthenticated,
  requireAuthenticatedUser,
  async (req: Request, res: Response) => {
    await revokeAllUserRefreshTokens(req.currentUser!.id);
    clearSessionCookies(res);

    res.status(200).send({
      message: "Todas las sesiones activas del usuario fueron revocadas.",
    });
  }
);

router.post(
  "/api/v1/auth/admin/users/:userId/sessions/revoke-all",
  isAuthenticated,
  requireAuthenticatedUser,
  requireRole("admin"),
  [
    param("userId")
      .trim()
      .notEmpty()
      .withMessage("El userId es obligatorio."),
    body("reason")
      .optional()
      .isString()
      .isLength({ min: 3, max: 200 })
      .withMessage("La razon debe tener entre 3 y 200 caracteres."),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    await revokeAllUserRefreshTokens(userId);

    if (req.currentUser!.id === userId) {
      clearSessionCookies(res);
    }

    res.status(200).send({
      message: "Sesiones del usuario objetivo revocadas correctamente.",
      userId,
    });
  }
);

export { router as revokeSessionsRouter };
