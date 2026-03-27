import express, { Request, Response } from "express";
import { NotAuthorizedError } from "@eftickets/common";
import { Order } from "../models/order";
import { canReadAllOrders } from "../middlewares/authorization";
import { buildAdminOrderOverview } from "../services/admin-overview";

const router = express.Router();

const adminOverviewPaths = [
  "/api/orders/admin/overview",
  "/api/v1/orders/admin/overview",
];

router.get(adminOverviewPaths, async (req: Request, res: Response) => {
  if (!canReadAllOrders(req)) {
    throw new NotAuthorizedError();
  }

  const orders = await Order.find({}).populate("ticket");
  const overview = buildAdminOrderOverview(orders, {
    days: req.query.days,
  });

  res.send(overview);
});

export { router as adminOverviewRouter };
