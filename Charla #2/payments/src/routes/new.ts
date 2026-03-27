import express, { Request, Response } from "express";
import { body } from "express-validator";
import mongoose from "mongoose";
import {
  validateRequest,
  BadRequestError,
  NotFoundError,
  OrderStatus,
} from "@eftickets/common";
import {
  buildMockSessionId,
  isMockPaymentsEnabled,
  stripe,
} from "../stripe";
import { Order } from "../models/order";
import { Payment } from "../models/payment";
import { ensureCanAccessUserOwnedResource } from "../middlewares/authorization";

const router = express.Router();
const createPaymentPaths = ["/api/payments", "/api/v1/payments"];

const resolveOrdersServiceBaseUrl = () =>
  (process.env.ORDERS_SERVICE_URL || "http://orders:3000").replace(/\/$/, "");

const resolveClientBaseUrl = () => {
  const fallbackUrl = "http://localhost:3000";
  const rawUrl = process.env.CLIENT_URL || fallbackUrl;

  try {
    return new URL(rawUrl).origin;
  } catch {
    throw new BadRequestError("CLIENT_URL inválida en el servidor");
  }
};

const fetchLatestOrderSnapshot = async (
  req: Request,
  orderId: string
): Promise<{ totalPrice: number; status?: string } | null> => {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const nativeFetch = (globalThis as { fetch?: unknown }).fetch;
  if (typeof nativeFetch !== "function") {
    return null;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const cookie = req.header("cookie");
  if (cookie) {
    headers["cookie"] = cookie;
  }

  const guestId = req.header("x-guest-id");
  if (guestId) {
    headers["x-guest-id"] = guestId;
  }

  try {
    const response = await (
      nativeFetch as (
        input: string,
        init?: Record<string, unknown>
      ) => Promise<{
        ok: boolean;
        json(): Promise<Record<string, unknown>>;
      }>
    )(`${resolveOrdersServiceBaseUrl()}/api/orders/${orderId}`, {
      headers,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const totalPrice = Number(payload.totalPrice ?? payload.price);
    const status = typeof payload.status === "string" ? payload.status : undefined;

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return null;
    }

    return {
      totalPrice,
      status,
    };
  } catch {
    return null;
  }
};

router.post(
  createPaymentPaths,
  [
    body("orderId")
      .not()
      .isEmpty()
      .withMessage("orderId es requerido")
      .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
      .withMessage("orderId debe ser válido"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError();
    }
    ensureCanAccessUserOwnedResource(req, order.userId);

    const latestOrderSnapshot = await fetchLatestOrderSnapshot(req, order.id);
    const effectiveStatus = latestOrderSnapshot?.status || order.status;
    const latestChargeAmount =
      latestOrderSnapshot && Number.isFinite(latestOrderSnapshot.totalPrice)
        ? latestOrderSnapshot.totalPrice
        : order.price;

    if (effectiveStatus === OrderStatus.Cancelled) {
      throw new BadRequestError("No se puede pagar una orden cancelada");
    }
    if (effectiveStatus === OrderStatus.Complete) {
      throw new BadRequestError("Esta orden ya fue pagada");
    }

    const existingPayment = await Payment.findOne({ orderId: order.id });
    if (existingPayment) {
      throw new BadRequestError("Ya existe un pago para esta orden");
    }

    if (Number.isFinite(latestChargeAmount) && latestChargeAmount > 0 && latestChargeAmount !== order.price) {
      order.set({ price: latestChargeAmount });
      await order.save();
    }

    const clientBaseUrl = resolveClientBaseUrl();

    if (isMockPaymentsEnabled) {
      const sessionId = buildMockSessionId(order.id);

      return res.status(201).send({
        sessionId,
        url: `${clientBaseUrl}/payment/success?orderId=${order.id}&session_id=${sessionId}`,
        mode: "mock",
      });
    }

    const session = await stripe!.checkout.sessions.create({
      payment_method_types: ["card"],
      client_reference_id: order.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Orden de ticket #${order.id.slice(-6)}`,
            },
            unit_amount: Math.round(Number(latestChargeAmount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        orderId: order.id,
      },

      success_url: `${clientBaseUrl}/payment/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientBaseUrl}/payment/cancel?orderId=${order.id}`,
    });

    res
      .status(201)
      .send({ sessionId: session.id, url: session.url });
  }
);

export { router as createChargeRouter };
