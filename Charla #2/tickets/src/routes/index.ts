import express, { Request, Response } from "express";
import { Ticket } from "../models/ticket";

const router = express.Router();

const ticketIndexPaths = ["/api/tickets", "/api/v1/tickets"];

const parsePositiveInt = (value: unknown, defaultValue: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue;
  }
  return Math.floor(parsed);
};

const getSortValue = (sortBy: unknown) => {
  switch (sortBy) {
    case "price":
      return "price";
    case "-price":
      return "-price";
    case "title":
      return "title";
    case "-title":
      return "-title";
    default:
      return "-_id";
  }
};

router.get(ticketIndexPaths, async (req: Request, res: Response) => {
  const isV1 = req.path.startsWith("/api/v1/");

  if (!isV1) {
    const tickets = await Ticket.find({});
    return res.send(tickets);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const sort = getSortValue(req.query.sort);

  const [tickets, total] = await Promise.all([
    Ticket.find({}).sort(sort).skip(skip).limit(limit),
    Ticket.countDocuments({}),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));

  res.send({
    data: tickets,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
    links: {
      self: `/api/v1/tickets?page=${page}&limit=${limit}`,
      first: `/api/v1/tickets?page=1&limit=${limit}`,
      prev: page > 1 ? `/api/v1/tickets?page=${page - 1}&limit=${limit}` : null,
      next: page < pages ? `/api/v1/tickets?page=${page + 1}&limit=${limit}` : null,
      last: `/api/v1/tickets?page=${pages}&limit=${limit}`,
    },
  });
});

export { router as indexTicketRouter };
