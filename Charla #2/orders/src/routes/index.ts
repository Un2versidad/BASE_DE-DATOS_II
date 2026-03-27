import express, { Request, Response } from "express";
import { NotAuthorizedError } from "@eftickets/common";
import { Order } from "../models/order";
import { canReadAllOrders, getRequesterId } from "../middlewares/authorization";

const router = express.Router();

const orderIndexPaths = ["/api/orders", "/api/v1/orders"];

const parsePositiveInt = (value: unknown, defaultValue: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue;
  }
  return Math.floor(parsed);
};

const getSortValue = (sortBy: unknown) => {
  switch (sortBy) {
    case "expiresAt":
      return "expiresAt";
    case "-expiresAt":
      return "-expiresAt";
    default:
      return "-_id";
  }
};

router.get(orderIndexPaths, async (req: Request, res: Response) => {
  const requesterId = getRequesterId(req);

  if (!canReadAllOrders(req) && !requesterId) {
    throw new NotAuthorizedError();
  }

  const filter = canReadAllOrders(req) ? {} : { userId: requesterId! };
  const isV1 = req.path.startsWith("/api/v1/");

  if (!isV1) {
    const orders = await Order.find(filter).populate("ticket");
    return res.send(orders);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const sort = getSortValue(req.query.sort);

  const [orders, total] = await Promise.all([
    Order.find(filter).populate("ticket").sort(sort).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));

  res.send({
    data: orders,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
    links: {
      self: `/api/v1/orders?page=${page}&limit=${limit}`,
      first: `/api/v1/orders?page=1&limit=${limit}`,
      prev: page > 1 ? `/api/v1/orders?page=${page - 1}&limit=${limit}` : null,
      next: page < pages ? `/api/v1/orders?page=${page + 1}&limit=${limit}` : null,
      last: `/api/v1/orders?page=${pages}&limit=${limit}`,
    },
  });
});

export { router as indexOrderRouter };
