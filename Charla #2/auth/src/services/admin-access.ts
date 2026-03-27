import { UserDocMethod, UserRole } from "../types/IUser";

const normalizeEmail = (email: string | null | undefined) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

export const getConfiguredAdminEmail = () =>
  normalizeEmail(process.env.ADMIN_EMAIL);

export const isAdminEmail = (email: string | null | undefined) =>
  Boolean(getConfiguredAdminEmail()) &&
  normalizeEmail(email) === getConfiguredAdminEmail();

export const resolveEffectiveRole = (
  email: string | null | undefined,
  _currentRole: UserRole = "user"
): UserRole => {
  if (isAdminEmail(email)) {
    return "admin";
  }

  return "user";
};

export const syncEffectiveUserRole = async (
  user: UserDocMethod
): Promise<UserRole> => {
  const nextRole = resolveEffectiveRole(user.email, user.role);

  if (user.role !== nextRole) {
    user.role = nextRole;
    await user.save();
  }

  return nextRole;
};
