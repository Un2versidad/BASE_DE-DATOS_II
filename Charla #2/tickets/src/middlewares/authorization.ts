import { Request } from "express";
import { NotAuthorizedError } from "@eftickets/common";

type UserRole = "user" | "moderator" | "admin";

const normalizeEmail = (email: string | null | undefined) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const getConfiguredAdminEmail = () =>
  normalizeEmail(process.env.ADMIN_EMAIL);

const getCurrentUserRole = (req: Request): UserRole => {
  const email = normalizeEmail(
    (req.currentUser as { email?: unknown } | undefined)?.email as
      | string
      | undefined
  );
  if (getConfiguredAdminEmail() && email === getConfiguredAdminEmail()) {
    return "admin";
  }

  return "user";
};

const isElevatedRole = (role: UserRole) => role === "admin";

export const canAccessUserOwnedResource = (
  req: Request,
  ownerId: string
): boolean => {
  if (!req.currentUser?.id) {
    return false;
  }

  if (req.currentUser.id === ownerId) {
    return true;
  }

  return isElevatedRole(getCurrentUserRole(req));
};

export const ensureCanAccessUserOwnedResource = (
  req: Request,
  ownerId: string
): void => {
  if (!canAccessUserOwnedResource(req, ownerId)) {
    throw new NotAuthorizedError();
  }
};

export const ensureAdminUser = (req: Request): void => {
  if (getCurrentUserRole(req) !== "admin") {
    throw new NotAuthorizedError();
  }
};
