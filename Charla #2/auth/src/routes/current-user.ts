import express from "express";
import { isAuthenticated } from "@eftickets/common";
import { User } from "../models/user";
import { resolveEffectiveRole } from "../services/admin-access";

const router = express.Router();

const currentUserPaths = [
  "/api/users/currentuser",
  "/api/v1/users/currentuser",
  "/api/v1/users/me",
];

router.get(currentUserPaths, isAuthenticated, async (req, res) => {
  if (!req.currentUser?.id) {
    res.send({ currentUser: null });
    return;
  }

  const user = await User.findById(req.currentUser.id).select("email role");
  if (!user) {
    res.send({ currentUser: null });
    return;
  }

  const role = resolveEffectiveRole(user.email, user.role);

  res.send({
    currentUser: {
      id: user.id,
      email: user.email,
      role,
    },
  });
});

export { router as currentUserRouter };
