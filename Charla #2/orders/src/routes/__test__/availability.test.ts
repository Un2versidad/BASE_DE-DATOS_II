import request from "supertest";
import mongoose from "mongoose";
import { OrderStatus } from "@eftickets/common";
import { app } from "../../app";
import { Order } from "../../models/order";
import { Ticket } from "../../models/ticket";

const createTicket = async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "Hoppers: Operacion Castor",
    price: 8.5,
  });

  await ticket.save();
  return ticket;
};

it("returns reserved seats grouped by showtime for active orders", async () => {
  const ticket = await createTicket();

  await Order.build({
    userId: "guest_alpha",
    status: OrderStatus.Created,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ticket,
    showtimeId: "centro-2026-03-25-19-30-2d",
    showtimeDate: "2026-03-25",
    showtimeTime: "19:30",
    showtimeFormat: "2D",
    seats: ["a1", "a2"],
    totalPrice: 17,
  }).save();

  await Order.build({
    userId: "guest_beta",
    status: OrderStatus.Complete,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ticket,
    showtimeId: "centro-2026-03-25-19-30-2d",
    showtimeDate: "2026-03-25",
    showtimeTime: "19:30",
    showtimeFormat: "2D",
    seats: ["B1"],
    totalPrice: 8.5,
  }).save();

  await Order.build({
    userId: "guest_gamma",
    status: OrderStatus.Cancelled,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ticket,
    showtimeId: "centro-2026-03-25-19-30-2d",
    showtimeDate: "2026-03-25",
    showtimeTime: "19:30",
    showtimeFormat: "2D",
    seats: ["Z9"],
    totalPrice: 8.5,
  }).save();

  const response = await request(app)
    .get(`/api/orders/availability/${ticket.id}`)
    .send()
    .expect(200);

  expect(response.body.ticketId).toEqual(ticket.id);
  expect(response.body.showtimes).toEqual([
    {
      id: "centro-2026-03-25-19-30-2d",
      reservedSeats: ["A1", "A2", "B1"],
      reservedCount: 3,
    },
  ]);
});

it("returns 400 for an invalid ticket id", async () => {
  await request(app).get("/api/orders/availability/not-valid").send().expect(400);
});
