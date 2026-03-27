import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { Order } from "../../models/order";
import { Ticket } from "../../models/ticket";

const buildTicket = async () => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "concert",
    price: 20,
  });
  await ticket.save();

  return ticket;
};

const buildReservationPayload = (ticketId: string, overrides: Record<string, unknown> = {}) => ({
  ticketId,
  showtimeId: "showtime-1",
  showtimeDate: "2026-03-25",
  showtimeTime: "19:30",
  showtimeFormat: "2D",
  seats: ["A1", "A2"],
  ...overrides,
});

it("fetches orders for an particular user", async () => {
  // Create three tickets
  const ticketOne = await buildTicket();
  const ticketTwo = await buildTicket();
  const ticketThree = await buildTicket();

  const userOne = global.signin();
  const userTwo = global.signin();
  // Create one order as User #1
  await request(app)
    .post("/api/orders")
    .set("Cookie", userOne)
    .send(buildReservationPayload(ticketOne.id))
    .expect(201);

  // Create two orders as User #2
  const { body: orderOne } = await request(app)
    .post("/api/orders")
    .set("Cookie", userTwo)
    .send(buildReservationPayload(ticketTwo.id, { seats: ["B1"] }))
    .expect(201);
  const { body: orderTwo } = await request(app)
    .post("/api/orders")
    .set("Cookie", userTwo)
    .send(buildReservationPayload(ticketThree.id, { seats: ["C1"] }))
    .expect(201);

  // Make request to get orders for User #2
  const response = await request(app)
    .get("/api/orders")
    .set("Cookie", userTwo)
    .expect(200);

  // Make sure we only got the orders for User #2
  expect(response.body.length).toEqual(2);
  expect(response.body[0].id).toEqual(orderOne.id);
  expect(response.body[1].id).toEqual(orderTwo.id);
  expect(response.body[0].ticket.id).toEqual(ticketTwo.id);
  expect(response.body[1].ticket.id).toEqual(ticketThree.id);
});

it("returns paginated envelope on /api/v1/orders", async () => {
  const ticketOne = await buildTicket();
  const ticketTwo = await buildTicket();

  const user = global.signin();
  await request(app)
    .post("/api/orders")
    .set("Cookie", user)
    .send(buildReservationPayload(ticketOne.id, { seats: ["A1"] }))
    .expect(201);
  await request(app)
    .post("/api/orders")
    .set("Cookie", user)
    .send(buildReservationPayload(ticketTwo.id, { seats: ["B2"] }))
    .expect(201);

  const response = await request(app)
    .get("/api/v1/orders?page=1&limit=1")
    .set("Cookie", user)
    .expect(200);

  expect(Array.isArray(response.body.data)).toEqual(true);
  expect(response.body.data.length).toEqual(1);
  expect(response.body.pagination.page).toEqual(1);
  expect(response.body.pagination.limit).toEqual(1);
  expect(response.body.pagination.total).toEqual(2);
  expect(response.body.links.self).toContain("/api/v1/orders?page=1&limit=1");
});

it("fetches orders for a guest shopper using the guest id header", async () => {
  const ticketOne = await buildTicket();
  const ticketTwo = await buildTicket();
  const guestId = "guest_demo_header";

  await request(app)
    .post("/api/orders")
    .set("X-Guest-Id", guestId)
    .send(buildReservationPayload(ticketOne.id, { seats: ["A3"] }))
    .expect(201);

  await request(app)
    .post("/api/orders")
    .set("X-Guest-Id", "guest_other_header")
    .send(buildReservationPayload(ticketTwo.id, { seats: ["B4"] }))
    .expect(201);

  const response = await request(app)
    .get("/api/orders")
    .set("X-Guest-Id", guestId)
    .expect(200);

  expect(response.body.length).toEqual(1);
  expect(response.body[0].userId).toEqual(guestId);
});
