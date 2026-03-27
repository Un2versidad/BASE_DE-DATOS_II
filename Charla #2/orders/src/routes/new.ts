import mongoose from "mongoose";
import express, { Request, Response } from "express";
import {
  validateRequest,
  NotFoundError,
  OrderStatus,
  BadRequestError,
  OrderCreatedEvent,
} from "@eftickets/common";
import { body } from "express-validator";
import { Ticket } from "../models/ticket";
import { Order } from "../models/order";
import { OrderCreatedPublisher } from "../events/publishers/order-created-publisher";
import { rabbitWrapper } from "../rabbit-wrapper";
import { getRequesterId } from "../middlewares/authorization";
import {
  calculateOrderTotals,
  normalizeConcessions,
} from "../services/order-pricing";

const router = express.Router();
const createOrderPaths = ["/api/orders", "/api/v1/orders"];

const EXPIRATION_WINDOW_SECONDS = 7 * 60;
const ACTIVE_ORDER_STATUSES = [
  OrderStatus.Created,
  OrderStatus.AwaitingPayment,
  OrderStatus.Complete,
];

const normalizeSeat = (seat: string) => seat.trim().toUpperCase();

const resolveTicketsServiceBaseUrl = () =>
  (process.env.TICKETS_SERVICE_URL || "http://tickets:3000").replace(/\/$/, "");

const fetchTicketFromTicketsService = async (
  ticketId: string
): Promise<{ id: string; title: string; price: number } | null> => {
  const nativeFetch = (globalThis as { fetch?: unknown }).fetch;
  if (typeof nativeFetch !== "function") {
    return null;
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
    )(`${resolveTicketsServiceBaseUrl()}/api/tickets/${ticketId}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const title = typeof payload.title === "string" ? payload.title : "";
    const price = Number(payload.price);
    const id = typeof payload.id === "string" ? payload.id : "";

    if (!id || !title || !Number.isFinite(price) || price <= 0) {
      return null;
    }

    return {
      id,
      title,
      price,
    };
  } catch {
    return null;
  }
};

const findOrSyncTicket = async (ticketId: string) => {
  const existingTicket = await Ticket.findById(ticketId);
  if (existingTicket) {
    return existingTicket;
  }

  const remoteTicket = await fetchTicketFromTicketsService(ticketId);
  if (!remoteTicket) {
    return null;
  }

  const syncedTicket = Ticket.build(remoteTicket);
  await syncedTicket.save();
  return syncedTicket;
};

router.post(
  createOrderPaths,
  [
    body("ticketId")
      .not()
      .isEmpty()
      .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
      .withMessage("TicketId must be provided"),
    body("showtimeId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("showtimeId must be provided"),
    body("cinemaId")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("cinemaId must be valid"),
    body("cinemaName")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("cinemaName must be valid"),
    body("showtimeDate")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("showtimeDate must be provided"),
    body("showtimeTime")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("showtimeTime must be provided"),
    body("showtimeFormat")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("showtimeFormat must be provided"),
    body("seats")
      .isArray({ min: 1 })
      .withMessage("At least one seat must be provided"),
    body("seats.*")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Each seat must be a non-empty string"),
    body("concessions")
      .optional()
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
    const requesterId = getRequesterId(req);
    if (!requesterId) {
      throw new BadRequestError(
        "No pudimos identificar al comprador. Inténtalo nuevamente."
      );
    }

    const {
      ticketId,
      cinemaId,
      cinemaName,
      showtimeId,
      showtimeDate,
      showtimeTime,
      showtimeFormat,
      seats,
      concessions,
    } = req.body;
    const normalizedSeats = [...new Set((Array.isArray(seats) ? seats : []).map(normalizeSeat))];
    const normalizedConcessions = normalizeConcessions(concessions);

    // Find the ticket the user is trying to order in the database
    const ticket = await findOrSyncTicket(ticketId);
    if (!ticket) {
      throw new NotFoundError();
    }

    const existingOrders = await Order.find({
      ticket,
      status: {
        $in: ACTIVE_ORDER_STATUSES,
      },
      showtimeId,
    });

    const overlappingOrder = existingOrders.find((order) =>
      (order.seats || []).some((seat) => normalizedSeats.includes(normalizeSeat(seat)))
    );

    if (overlappingOrder) {
      throw new BadRequestError(
        "Uno o más asientos ya no están disponibles para esta función."
      );
    }

    // Calculate an expiration date for this order
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS);
    const { concessionsTotal, totalPrice } = calculateOrderTotals({
      ticketPrice: ticket.price,
      showtimeFormat,
      seatsCount: normalizedSeats.length,
      concessions: normalizedConcessions,
    });

    // Build the order and save it to the database
    const order = Order.build({
      userId: requesterId,
      status: OrderStatus.Created,
      expiresAt: expiration,
      ticket,
      cinemaId,
      cinemaName,
      showtimeId,
      showtimeDate,
      showtimeTime,
      showtimeFormat,
      seats: normalizedSeats,
      concessions: normalizedConcessions,
      concessionsTotal,
      totalPrice,
    });
    await order.save();

    // Publish an event saying that an order was created
    const eventPayload: OrderCreatedEvent["data"] & {
      showtimeId: string;
      showtimeDate: string;
      showtimeTime: string;
      showtimeFormat: string;
      seats: string[];
    } = {
      id: order.id,
      version: order.version,
      status: order.status,
      userId: order.userId,
      expiresAt: order.expiresAt.toISOString(),
      ticket: {
        id: ticket.id,
        price: totalPrice,
      },
      showtimeId,
      showtimeDate,
      showtimeTime,
      showtimeFormat,
      seats: normalizedSeats,
    };

    await new OrderCreatedPublisher(rabbitWrapper.client).publish(eventPayload);

    res.location(`/api/v1/orders/${order.id}`).status(201).send(order);
  }
);

export { router as newOrderRouter };
