import express, { Request, Response } from "express";
import {
  NotFoundError,
} from "@eftickets/common";
import { Order } from "../models/order";
import { ensureCanAccessUserOwnedResource } from "../middlewares/authorization";

const router = express.Router();
const showOrderPaths = ["/api/orders/:orderId", "/api/v1/orders/:orderId"];

router.get(
  showOrderPaths,
  async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.orderId).populate("ticket");

    if (!order) {
      throw new NotFoundError();
    }
    ensureCanAccessUserOwnedResource(req, order.userId);

    res.send(order);
  }
);

export { router as showOrderRouter };
