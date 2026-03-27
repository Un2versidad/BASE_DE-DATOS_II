import express, { Request, Response } from "express";
import {
  requireAuth,
  NotFoundError,
  OrderCancelledEvent,
} from "@eftickets/common";
import { Order, OrderStatus } from "../models/order";
import { OrderCancelledPublisher } from "../events/publishers/order-cancelled-publisher";
import { rabbitWrapper } from "../rabbit-wrapper";
import { ensureCanAccessUserOwnedResource } from "../middlewares/authorization";

const router = express.Router();
const deleteOrderPaths = ["/api/orders/:orderId", "/api/v1/orders/:orderId"];

router.delete(
  deleteOrderPaths,
  requireAuth,
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate("ticket");

    if (!order) {
      throw new NotFoundError();
    }
    ensureCanAccessUserOwnedResource(req, order.userId);
    order.status = OrderStatus.Cancelled;
    await order.save();

    // publishing an event saying this was cancelled!
    const eventPayload: OrderCancelledEvent["data"] & {
      showtimeId?: string;
      seats?: string[];
    } = {
      id: order.id,
      version: order.version,
      ticket: {
        id: order.ticket.id,
      },
      showtimeId: order.showtimeId,
      seats: order.seats,
    };

    await new OrderCancelledPublisher(rabbitWrapper.client).publish(eventPayload);

    res.status(204).send();
  }
);

export { router as deleteOrderRouter };
