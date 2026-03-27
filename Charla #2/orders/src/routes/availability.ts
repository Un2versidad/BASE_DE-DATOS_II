import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { param } from "express-validator";
import { OrderStatus, validateRequest } from "@eftickets/common";
import { Order } from "../models/order";

const router = express.Router();
const availabilityPaths = [
  "/api/orders/availability/:ticketId",
  "/api/v1/orders/availability/:ticketId",
];

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.Created,
  OrderStatus.AwaitingPayment,
  OrderStatus.Complete,
];

const normalizeSeat = (seat: string) => seat.trim().toUpperCase();

router.get(
  availabilityPaths,
  [
    param("ticketId")
      .custom((value: string) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("ticketId must be valid"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const orders = await Order.find({
      ticket: req.params.ticketId,
      status: { $in: ACTIVE_ORDER_STATUSES },
    });

    const byShowtime = new Map<string, Set<string>>();

    orders.forEach((order) => {
      if (!order.showtimeId) {
        return;
      }

      const seats = byShowtime.get(order.showtimeId) || new Set<string>();
      (order.seats || []).forEach((seat) => {
        const normalized = normalizeSeat(seat);
        if (normalized) {
          seats.add(normalized);
        }
      });
      byShowtime.set(order.showtimeId, seats);
    });

    res.send({
      ticketId: req.params.ticketId,
      showtimes: Array.from(byShowtime.entries()).map(([id, seats]) => ({
        id,
        reservedSeats: Array.from(seats).sort((left, right) => left.localeCompare(right)),
        reservedCount: seats.size,
      })),
    });
  }
);

export { router as availabilityOrderRouter };
