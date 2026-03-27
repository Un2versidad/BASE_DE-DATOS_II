import express, { Request, Response } from "express";
import { body } from "express-validator";
import {
  requireAuth,
  validateRequest,
} from "@eftickets/common";
import { Ticket } from "../models/ticket";
import { TicketCreatedPublisher } from "../events/publishers/ticket-created-publisher";
import { rabbitWrapper } from "../rabbit-wrapper";
import { normalizeTicketShowtimes } from "../services/showtime-utils";
import { ensureAdminUser } from "../middlewares/authorization";

const router = express.Router();
const createTicketPaths = ["/api/tickets", "/api/v1/tickets"];

router.post(
  createTicketPaths,
  requireAuth,
  [
    body("title").not().isEmpty().withMessage("Title is required"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be greater than 0"),
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
    ensureAdminUser(req);

    const { title, price, showtimes } = req.body;
    const ticket = Ticket.build({
      title,
      price,
      userId: req.currentUser!.id,
      showtimes: normalizeTicketShowtimes(showtimes),
    });
    await ticket.save();
    await new TicketCreatedPublisher(rabbitWrapper.client).publish({
      id: ticket.id,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
      version: ticket.version,
    });

    res.location(`/api/v1/tickets/${ticket.id}`).status(201).send(ticket);
  }
);

export { router as createTicketRouter };
