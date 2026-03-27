import express, { Request, Response } from "express";
import { body } from "express-validator";
import {
  validateRequest,
  NotFoundError,
  requireAuth,
} from "@eftickets/common";
import { Ticket } from "../models/ticket";
import { TicketUpdatedPublisher } from "../events/publishers/ticket-updated-publisher";
import { rabbitWrapper } from "../rabbit-wrapper";
import { ensureCanAccessUserOwnedResource } from "../middlewares/authorization";
import { normalizeTicketShowtimes } from "../services/showtime-utils";

const router = express.Router();
const updateTicketPaths = ["/api/tickets/:id", "/api/v1/tickets/:id"];

router.put(
  updateTicketPaths,
  requireAuth,
  [
    body("title").not().isEmpty().withMessage("Title is required"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be provided and must be greater than 0"),
    body("showtimes")
      .optional()
      .isArray()
      .withMessage("showtimes must be an array"),
    body("showtimes.*.id")
      .optional()
      .isString()
      .withMessage("showtimes.id must be a string"),
    body("showtimes.*.cinemaId")
      .optional()
      .isString()
      .withMessage("showtimes.cinemaId must be a string"),
    body("showtimes.*.cinemaName")
      .optional()
      .isString()
      .withMessage("showtimes.cinemaName must be a string"),
    body("showtimes.*.date")
      .optional()
      .isString()
      .withMessage("showtimes.date must be a string"),
    body("showtimes.*.time")
      .optional()
      .isString()
      .withMessage("showtimes.time must be a string"),
    body("showtimes.*.format")
      .optional()
      .isString()
      .withMessage("showtimes.format must be a string"),
    body("showtimes.*.status")
      .optional()
      .isString()
      .withMessage("showtimes.status must be a string"),
    body("showtimes.*.soldSeats")
      .optional()
      .isArray()
      .withMessage("showtimes.soldSeats must be an array"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      throw new NotFoundError();
    }

    ensureCanAccessUserOwnedResource(req, ticket.userId);

    ticket.set({
      title: req.body.title,
      price: req.body.price,
      showtimes: normalizeTicketShowtimes(req.body.showtimes),
    });
    await ticket.save();
    await new TicketUpdatedPublisher(rabbitWrapper.client).publish({
      id: ticket.id,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
      version: ticket.version,
    });

    res.send(ticket);
  }
);

export { router as updateTicketRouter };
