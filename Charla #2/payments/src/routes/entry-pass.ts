import express, { Request, Response } from "express";
import { body, param } from "express-validator";
import mongoose from "mongoose";
import {
  BadRequestError,
  NotFoundError,
  OrderStatus,
  requireAuth,
  validateRequest,
} from "@eftickets/common";
import { EntryPass } from "../models/entry-pass";
import { Order } from "../models/order";
import { Payment } from "../models/payment";
import {
  ensureCanAccessUserOwnedResource,
  ensureElevatedRole,
} from "../middlewares/authorization";
import {
  createEntryPassToken,
  hashEntryPassToken,
  verifyEntryPassToken,
} from "../services/entry-pass-token";

const issueEntryPassPaths = ["/api/payments/entry-pass", "/api/v1/payments/entry-pass"];
const validateEntryPassPaths = [
  "/api/payments/entry-pass/validate",
  "/api/v1/payments/entry-pass/validate",
];
const revokeEntryPassPaths = [
  "/api/payments/entry-pass/revoke",
  "/api/v1/payments/entry-pass/revoke",
];
const reissueEntryPassPaths = [
  "/api/payments/entry-pass/reissue",
  "/api/v1/payments/entry-pass/reissue",
];
const entryPassHistoryPaths = [
  "/api/payments/entry-pass/history/:orderId",
  "/api/v1/payments/entry-pass/history/:orderId",
];

const router = express.Router();

const appendEntryPassEvent = (
  entryPass: {
    events?: Array<{ action: string; at: Date; by?: string | null; note?: string | null }>;
  },
  action: "ISSUE" | "REISSUE" | "REVOKE" | "CHECK_IN",
  by?: string,
  note?: string
) => {
  const nextEvents = entryPass.events ? [...entryPass.events] : [];
  nextEvents.push({
    action,
    at: new Date(),
    by: by || null,
    note: note || null,
  });

  return nextEvents;
};

const resolveEntryPassTtlMinutes = (): number => {
  const rawTtl = process.env.ENTRY_PASS_TTL_MINUTES;
  if (!rawTtl) {
    return 720;
  }

  const parsed = Number(rawTtl);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 720;
  }

  return Math.floor(parsed);
};

router.post(
  issueEntryPassPaths,
  [
    body("orderId")
      .not()
      .isEmpty()
      .withMessage("orderId es requerido")
      .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("orderId debe ser válido"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { orderId } = req.body as { orderId: string };

    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError();
    }

    ensureCanAccessUserOwnedResource(req, order.userId);

    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestError("No se puede emitir QR para una orden cancelada");
    }

    const payment = await Payment.findOne({ orderId: order.id });
    if (!payment) {
      throw new BadRequestError("La orden aún no tiene pago confirmado");
    }

    const existingEntryPass = await EntryPass.findOne({ orderId: order.id });
    if (existingEntryPass?.usedAt) {
      throw new BadRequestError(
        "Este QR ya fue validado en puerta. Si necesitas soporte, acércate a taquilla."
      );
    }

    if (existingEntryPass?.revokedAt) {
      throw new BadRequestError(
        "Este QR fue revocado por taquilla. Solicita asistencia para reemitirlo."
      );
    }

    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + resolveEntryPassTtlMinutes() * 60 * 1000
    );

    const qrToken = createEntryPassToken(order.id, order.userId, expiresAt);
    const tokenHash = hashEntryPassToken(qrToken);

    const nextEvents = appendEntryPassEvent(
      existingEntryPass || {},
      existingEntryPass ? "REISSUE" : "ISSUE",
      req.currentUser?.id,
      existingEntryPass ? "Reemisión desde flujo de usuario" : "Emisión inicial"
    );

    await EntryPass.findOneAndUpdate(
      { orderId: order.id },
      {
        orderId: order.id,
        userId: order.userId,
        tokenHash,
        expiresAt,
        issuedAt,
        usedAt: null,
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
        events: nextEvents,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).send({
      orderId: order.id,
      qrToken,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }
);

router.post(
  validateEntryPassPaths,
  requireAuth,
  [
    body("token")
      .not()
      .isEmpty()
      .withMessage("token es requerido")
      .isString()
      .withMessage("token debe ser una cadena")
      .trim()
      .isLength({ min: 20, max: 4096 })
      .withMessage("token QR inválido")
      .matches(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
      .withMessage("token QR inválido o manipulado"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    ensureElevatedRole(req);

    const { token } = req.body as { token: string };
    const payload = verifyEntryPassToken(token);

    if (!payload) {
      throw new BadRequestError("QR inválido o manipulado");
    }

    const now = Date.now();
    if (payload.exp <= now) {
      throw new BadRequestError("QR expirado");
    }

    const tokenHash = hashEntryPassToken(token);
    const entryPass = await EntryPass.findOne({
      orderId: payload.orderId,
      userId: payload.userId,
      tokenHash,
    });

    if (!entryPass) {
      throw new BadRequestError("QR inválido");
    }

    if (entryPass.usedAt) {
      throw new BadRequestError("QR ya fue utilizado");
    }

    if (entryPass.revokedAt) {
      throw new BadRequestError("QR revocado por taquilla");
    }

    if (entryPass.expiresAt.getTime() <= now) {
      throw new BadRequestError("QR expirado");
    }

    entryPass.set({
      usedAt: new Date(),
      events: appendEntryPassEvent(entryPass, "CHECK_IN", req.currentUser?.id),
    });
    await entryPass.save();

    const checkedInAt = entryPass.usedAt
      ? new Date(entryPass.usedAt).toISOString()
      : new Date().toISOString();

    res.send({
      valid: true,
      orderId: entryPass.orderId,
      userId: entryPass.userId,
      checkedInAt,
      expiresAt: entryPass.expiresAt.toISOString(),
    });
  }
);

router.post(
  revokeEntryPassPaths,
  requireAuth,
  [
    body("orderId")
      .not()
      .isEmpty()
      .withMessage("orderId es requerido")
      .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("orderId debe ser válido"),
    body("reason")
      .optional()
      .isString()
      .withMessage("reason debe ser texto")
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("reason debe tener entre 3 y 200 caracteres"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    ensureElevatedRole(req);

    const { orderId, reason } = req.body as {
      orderId: string;
      reason?: string;
    };

    const entryPass = await EntryPass.findOne({ orderId });
    if (!entryPass) {
      throw new NotFoundError();
    }

    if (entryPass.usedAt) {
      throw new BadRequestError("No se puede revocar un QR ya utilizado");
    }

    entryPass.set({
      revokedAt: new Date(),
      revokedBy: req.currentUser!.id,
      revokedReason: reason || "Revocado por soporte de taquilla",
      events: appendEntryPassEvent(
        entryPass,
        "REVOKE",
        req.currentUser?.id,
        reason || "Revocado por soporte de taquilla"
      ),
    });
    await entryPass.save();

    res.send({
      ok: true,
      orderId: entryPass.orderId,
      revokedAt: entryPass.revokedAt?.toISOString(),
      revokedBy: entryPass.revokedBy,
      revokedReason: entryPass.revokedReason,
    });
  }
);

router.post(
  reissueEntryPassPaths,
  requireAuth,
  [
    body("orderId")
      .not()
      .isEmpty()
      .withMessage("orderId es requerido")
      .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("orderId debe ser válido"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    ensureElevatedRole(req);

    const { orderId } = req.body as { orderId: string };
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError();
    }

    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestError("No se puede reemitir QR para una orden cancelada");
    }

    const payment = await Payment.findOne({ orderId: order.id });
    if (!payment) {
      throw new BadRequestError("La orden aún no tiene pago confirmado");
    }

    const existingEntryPass = await EntryPass.findOne({ orderId: order.id });
    if (existingEntryPass?.usedAt) {
      throw new BadRequestError("No se puede reemitir un QR ya utilizado");
    }

    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + resolveEntryPassTtlMinutes() * 60 * 1000
    );

    const qrToken = createEntryPassToken(order.id, order.userId, expiresAt);
    const tokenHash = hashEntryPassToken(qrToken);

    const nextEvents = appendEntryPassEvent(
      existingEntryPass || {},
      "REISSUE",
      req.currentUser?.id,
      "Reemisión desde taquilla"
    );

    await EntryPass.findOneAndUpdate(
      { orderId: order.id },
      {
        orderId: order.id,
        userId: order.userId,
        tokenHash,
        expiresAt,
        issuedAt,
        usedAt: null,
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
        events: nextEvents,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).send({
      orderId: order.id,
      qrToken,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      reissuedBy: req.currentUser!.id,
    });
  }
);

router.get(
  entryPassHistoryPaths,
  requireAuth,
  [
    param("orderId")
      .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("orderId debe ser válido"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    ensureElevatedRole(req);

    const { orderId } = req.params as { orderId: string };
    const entryPass = await EntryPass.findOne({ orderId });

    if (!entryPass) {
      throw new NotFoundError();
    }

    const now = Date.now();
    const currentStatus = entryPass.revokedAt
      ? "revoked"
      : entryPass.usedAt
      ? "checked_in"
      : entryPass.expiresAt.getTime() <= now
      ? "expired"
      : "active";

    const history = (entryPass.events || [])
      .slice()
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .map((event) => ({
        action: event.action,
        at: event.at.toISOString(),
        by: event.by || null,
        note: event.note || null,
      }));

    res.send({
      orderId: entryPass.orderId,
      currentStatus,
      issuedAt: entryPass.issuedAt.toISOString(),
      expiresAt: entryPass.expiresAt.toISOString(),
      usedAt: entryPass.usedAt ? entryPass.usedAt.toISOString() : null,
      revokedAt: entryPass.revokedAt ? entryPass.revokedAt.toISOString() : null,
      revokedReason: entryPass.revokedReason || null,
      history,
    });
  }
);

export { router as entryPassRouter };
