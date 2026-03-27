import express, { Request, Response } from "express";
import { body, param } from "express-validator";
import mongoose from "mongoose";
import {
  BadRequestError,
  NotFoundError,
  OrderStatus,
  validateRequest,
} from "@eftickets/common";
import { Order } from "../models/order";
import { ensureCanAccessUserOwnedResource } from "../middlewares/authorization";
import {
  calculateOrderTotals,
  normalizeConcessions,
} from "../services/order-pricing";

const router = express.Router();
const updateOrderConcessionsPaths = [
  "/api/orders/:orderId/concessions",
  "/api/v1/orders/:orderId/concessions",
];

router.patch(
  updateOrderConcessionsPaths,
  [
    param("orderId")
      .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("orderId debe ser válido"),
    body("concessions")
      .isArray({ max: 20 })
      .withMessage("concessions must be an array"),
    body("concessions.*.title")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each concession title must be a non-empty string"),
    body("concessions.*.quantity")
      .optional()
      .isInt({ gt: 0 })
      .withMessage("Each concession quantity must be greater than 0"),
    body("concessions.*.unitPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Each concession unitPrice must be valid"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.orderId).populate("ticket");

    if (!order) {
      throw new NotFoundError();
    }

    ensureCanAccessUserOwnedResource(req, order.userId);

    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestError(
        "No se puede modificar la dulcería de una orden cancelada"
      );
    }

    if (order.status === OrderStatus.Complete) {
      throw new BadRequestError(
        "No se puede modificar la dulcería de una orden ya pagada"
      );
    }

    const ticketPrice = Number(order.ticket?.price);
    if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
      throw new BadRequestError(
        "No pudimos recalcular el total de la orden. Inténtalo nuevamente."
      );
    }

    const normalizedConcessions = normalizeConcessions(req.body.concessions);
    const { concessionsTotal, totalPrice } = calculateOrderTotals({
      ticketPrice,
      showtimeFormat: order.showtimeFormat || "2D",
      seatsCount: Array.isArray(order.seats) ? order.seats.length : 0,
      concessions: normalizedConcessions,
    });

    order.set({
      concessions: normalizedConcessions,
      concessionsTotal,
      totalPrice,
    });
    await order.save();

    res.send(order);
  }
);

export { router as updateOrderConcessionsRouter };
