import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Ticket } from "../../models/ticket";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "fl2on@proton.me";

const buildReservationPayload = (ticketId: string) => ({
  ticketId,
  showtimeId: "showtime-1",
  showtimeDate: "2026-03-25",
  showtimeTime: "19:30",
  showtimeFormat: "2D",
  seats: ["A1", "A2"],
});

it("fetches the order", async () => {
  // Create a ticket
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  const user = global.signin();
  // make a request to build an order with this ticket
  const { body: order } = await request(app)
    .post("/api/orders")
    .set("Cookie", user)
    .send(buildReservationPayload(ticket.id))
    .expect(201);

  // make request to fetch the order
  const { body: fetchedOrder } = await request(app)
    .get(`/api/orders/${order.id}`)
    .set("Cookie", user)
    .send()
    .expect(200);

  expect(fetchedOrder.id).toEqual(order.id);
  expect(fetchedOrder.seats).toEqual(["A1", "A2"]);
  expect(fetchedOrder.showtimeId).toEqual("showtime-1");
});

it("returns an error if one user tries to fetch another users order", async () => {
  // Create a ticket
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  const user = global.signin();
  // make a request to build an order with this ticket
  const { body: order } = await request(app)
    .post("/api/orders")
    .set("Cookie", user)
    .send(buildReservationPayload(ticket.id))
    .expect(201);

  // make request to fetch the order
  await request(app)
    .get(`/api/orders/${order.id}`)
    .set("Cookie", global.signin())
    .send()
    .expect(401);
});

it("allows admin to fetch another user's order", async () => {
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
    .get(`/api/orders/${order.id}`)
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send()
    .expect(200);
});
