import express, { Request, Response } from "express";
import { body } from "express-validator";
import { validateRequest, BadRequestError } from "@eftickets/common";

import { User } from "../models/user";
import { verifyHCaptcha } from "../services/hcaptcha";
import { authRateLimit } from "../middlewares/auth-rate-limit";
import { resolveEffectiveRole } from "../services/admin-access";

const router = express.Router();

const signUpPaths = ["/api/users/signup", "/api/v1/users/signup", "/api/v1/users"];

router.post(
  signUpPaths,
  authRateLimit,
  [
    body("email")
      .trim()
      .normalizeEmail({ gmail_remove_dots: false })
      .isEmail()
      .withMessage("El correo debe ser válido"),
    body("password")
      .trim()
      .isLength({ min: 8, max: 64 })
      .withMessage("La contraseña debe tener entre 8 y 64 caracteres")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      .withMessage(
        "La contraseña debe incluir al menos una mayúscula, una minúscula y un número"
      ),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password, captchaToken } = req.body;

    await verifyHCaptcha(captchaToken, req.ip);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new BadRequestError("Este correo ya está en uso");
    }

    const user = User.build({ email, password });
    user.role = resolveEffectiveRole(email);
    await user.save();

    res.location("/api/v1/users/me").status(201).send(user);
  }
);

export { router as signupRouter };
