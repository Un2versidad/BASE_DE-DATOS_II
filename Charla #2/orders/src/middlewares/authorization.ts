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

const getGuestId = (req: Request): string | null => {
  const headerValue = req.header("x-guest-id");
  if (!headerValue) {
    return null;
  }

  const guestId = headerValue.trim();
  if (!guestId.startsWith("guest_")) {
    return null;
  }

  return guestId;
};

export const getRequesterId = (req: Request): string | null => {
  if (req.currentUser?.id) {
    return req.currentUser.id;
  }

  return getGuestId(req);
};

export const canAccessUserOwnedResource = (
  req: Request,
  ownerId: string
): boolean => {
  const requesterId = getRequesterId(req);

  if (!requesterId) {
    return false;
  }

  if (requesterId === ownerId) {
    return true;
  }

  if (!req.currentUser?.id) {
    return false;
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

export const canReadAllOrders = (req: Request): boolean => {
  if (!req.currentUser?.id) {
    return false;
  }

  return isElevatedRole(getCurrentUserRole(req));
};
