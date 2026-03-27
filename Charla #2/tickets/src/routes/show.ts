import express, { Request, Response } from "express";
import { NotFoundError } from "@eftickets/common";
import { Ticket } from "../models/ticket";

const router = express.Router();
const showTicketPaths = ["/api/tickets/:id", "/api/v1/tickets/:id"];

router.get(showTicketPaths, async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    throw new NotFoundError();
  }

  res.send(ticket);
});

export { router as showTicketRouter };
