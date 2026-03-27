import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Order, OrderStatus } from "../../models/order";
import { Ticket } from "../../models/ticket";
import { rabbitWrapper } from "../../rabbit-wrapper";

const buildReservationPayload = (ticketId: string, overrides: Record<string, unknown> = {}) => ({
  ticketId,
  showtimeId: "showtime-1",
  showtimeDate: "2026-03-25",
  showtimeTime: "19:30",
  showtimeFormat: "2D",
  seats: ["A1", "A2"],
  ...overrides,
});

it("returns an error if the ticket does not exist", async () => {
  const ticketId = new mongoose.Types.ObjectId();

  await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send(buildReservationPayload(ticketId.toHexString()))
    .expect(404);
});

it("returns an error if one of the selected seats is already reserved for the same showtime", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();
  const order = Order.build({
    ticket,
    userId: "laskdflkajsdf",
    status: OrderStatus.Created,
    expiresAt: new Date(),
    showtimeId: "showtime-1",
    showtimeDate: "2026-03-25",
    showtimeTime: "19:30",
    showtimeFormat: "2D",
    seats: ["A1"],
    totalPrice: 20,
  });
  await order.save();

  await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send(buildReservationPayload(ticket.id, { seats: ["A1", "B1"] }))
    .expect(400);
});

it("allows another reservation for the same ticket when seats do not overlap", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send(buildReservationPayload(ticket.id, { seats: ["C4"] }))
    .expect(201);
});

it("emits an order created event", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send(buildReservationPayload(ticket.id))
    .expect(201);

  expect(rabbitWrapper.client.publish).toHaveBeenCalled();
});

it("creates reservations with a seven minute expiration window", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  const beforeRequest = Date.now();
  const { body: order } = await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send(buildReservationPayload(ticket.id))
    .expect(201);

  const expiresInMs = new Date(order.expiresAt).getTime() - beforeRequest;
  expect(expiresInMs).toBeGreaterThanOrEqual(6.5 * 60 * 1000);
  expect(expiresInMs).toBeLessThanOrEqual(7.1 * 60 * 1000);
});

it("persists the selected showtime and seats on the order", async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  const { body: order } = await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send(
      buildReservationPayload(ticket.id, {
        showtimeId: "showtime-vip",
        showtimeDate: "2026-03-28",
        showtimeTime: "21:45",
        showtimeFormat: "IMAX",
        seats: ["d4", "d5"],
      })
    )
    .expect(201);

  expect(order.showtimeId).toEqual("showtime-vip");
  expect(order.showtimeDate).toEqual("2026-03-28");
  expect(order.showtimeTime).toEqual("21:45");
  expect(order.showtimeFormat).toEqual("IMAX");
  expect(order.seats).toEqual(["D4", "D5"]);
  expect(order.totalPrice).toEqual(45);
});
