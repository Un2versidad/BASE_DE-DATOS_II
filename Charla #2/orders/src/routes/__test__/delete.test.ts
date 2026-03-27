import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Ticket } from "../../models/ticket";
import { Order, OrderStatus } from "../../models/order";
import { rabbitWrapper } from "../../rabbit-wrapper";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "fl2on@proton.me";

const buildReservationPayload = (ticketId: string, overrides: Record<string, unknown> = {}) => ({
  ticketId,
  showtimeId: "showtime-1",
  showtimeDate: "2026-03-25",
  showtimeTime: "19:30",
  showtimeFormat: "2D",
  seats: ["A1", "A2"],
  ...overrides,
});

it("marks an order as cancelled", async () => {
  // create a ticket with Ticket Model
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  const user = global.signin();
  // make a request to create an order
  const { body: order } = await request(app)
    .post("/api/orders")
    .set("Cookie", user)
    .send(buildReservationPayload(ticket.id))
    .expect(201);

  // make a request to cancel the order
  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set("Cookie", user)
    .send()
    .expect(204);

  // expectation to make sure the thing is cancelled
  const updatedOrder = await Order.findById(order.id);

  expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled);
});

it("emits a order cancelled event", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  const user = global.signin();
  // make a request to create an order
  const { body: order } = await request(app)
    .post("/api/orders")
    .set("Cookie", user)
    .send(buildReservationPayload(ticket.id))
    .expect(201);

  // make a request to cancel the order
  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set("Cookie", user)
    .send()
    .expect(204);

  expect(rabbitWrapper.client.publish).toHaveBeenCalled();
});

it("rejects another non-admin account cancelling someone else's order", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  const ownerId = new mongoose.Types.ObjectId().toHexString();

  const { body: order } = await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin(ownerId, "user"))
    .send(buildReservationPayload(ticket.id))
    .expect(201);

  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set("Cookie", global.signin(undefined, "admin", "otro@correo.com"))
    .send()
    .expect(401);
});

it("allows the configured admin email to cancel another user's order", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  const ownerId = new mongoose.Types.ObjectId().toHexString();

  const { body: order } = await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin(ownerId, "user"))
    .send(buildReservationPayload(ticket.id))
    .expect(201);

  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send()
    .expect(204);
});
