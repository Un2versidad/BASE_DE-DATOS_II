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
  isMockPaymentsEnabled,
  isMockSessionForOrder,
  stripe,
} from "../stripe";
import { Order } from "../models/order";
import { Payment } from "../models/payment";
import { PaymentCreatedPublisher } from "../events/publishers/payment-created-publisher";
import { rabbitWrapper } from "../rabbit-wrapper";
import { ensureCanAccessUserOwnedResource } from "../middlewares/authorization";

const router = express.Router();
const confirmPaymentPaths = ["/api/payments/confirm", "/api/v1/payments/confirm"];

const resolveStripePaymentId = (
  session: Awaited<ReturnType<NonNullable<typeof stripe>["checkout"]["sessions"]["retrieve"]>>
) => {
  return typeof session.payment_intent === "string" ? session.payment_intent : session.id;
};

router.post(
  confirmPaymentPaths,
  [
    body("orderId")
      .not()
      .isEmpty()
      .withMessage("orderId es requerido")
      .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
      .withMessage("orderId debe ser válido"),
    body("sessionId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("sessionId es requerido"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { orderId, sessionId } = req.body as { orderId: string; sessionId: string };

    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError();
    }

    ensureCanAccessUserOwnedResource(req, order.userId);

    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestError("No se puede confirmar una orden cancelada");
    }

    const existingPayment = await Payment.findOne({ orderId: order.id });
    if (existingPayment) {
      return res.send({
        ok: true,
        alreadyConfirmed: true,
        orderId: existingPayment.orderId,
        paymentId: existingPayment.id,
        stripeId: existingPayment.stripeId,
        checkoutSessionId: existingPayment.checkoutSessionId,
      });
    }

    let stripePaymentId = sessionId;
    let checkoutSessionId = sessionId;

    if (isMockPaymentsEnabled) {
      if (!isMockSessionForOrder(order.id, sessionId)) {
        throw new BadRequestError("La sesión simulada no corresponde a esta orden");
      }
    } else {
      const session = await stripe!.checkout.sessions.retrieve(sessionId);
      const sessionOrderId =
        typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : session.metadata?.orderId;

      if (sessionOrderId !== order.id) {
        throw new BadRequestError("La sesión de pago no corresponde a esta orden");
      }

      if (session.payment_status !== "paid") {
        throw new BadRequestError("El pago aún no fue confirmado por Stripe");
      }

      stripePaymentId = resolveStripePaymentId(session);
      checkoutSessionId = session.id;
    }

    const payment = Payment.build({
      orderId: order.id,
      stripeId: stripePaymentId,
      checkoutSessionId,
    });
    await payment.save();

    await new PaymentCreatedPublisher(rabbitWrapper.client).publish({
      id: payment.id,
      orderId: payment.orderId,
      stripeId: payment.stripeId,
    });

    res.status(201).send({
      ok: true,
      orderId: payment.orderId,
      paymentId: payment.id,
      stripeId: payment.stripeId,
      checkoutSessionId: payment.checkoutSessionId,
    });
  }
);

export { router as confirmPaymentRouter };
