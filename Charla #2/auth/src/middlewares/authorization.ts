import { NextFunction, Request, Response } from "express";
import { User } from "../models/user";
import { UserRole } from "../types/IUser";
import { resolveEffectiveRole } from "../services/admin-access";

const sendUnauthorized = (res: Response) => {
  res.status(401).send({
    errors: [{ message: "No autenticado." }],
  });
};

const sendForbidden = (res: Response) => {
  res.status(403).send({
    errors: [{ message: "No tienes permisos suficientes." }],
  });
};

export const requireAuthenticatedUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser?.id) {
    sendUnauthorized(res);
    return;
  }

  next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser?.id) {
      sendUnauthorized(res);
      return;
    }

    const user = await User.findById(req.currentUser.id).select("email role");
    if (!user) {
      sendUnauthorized(res);
      return;
    }

    const role = resolveEffectiveRole(user.email, (user.role || "user") as UserRole);
    if (!allowedRoles.includes(role)) {
      sendForbidden(res);
      return;
    }

    next();
  };
};
