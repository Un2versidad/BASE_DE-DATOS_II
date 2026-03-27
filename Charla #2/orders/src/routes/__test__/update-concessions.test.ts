import mongoose from "mongoose";
import request from "supertest";
import { OrderStatus } from "@eftickets/common";
import { app } from "../../app";
import { Order } from "../../models/order";
import { Ticket } from "../../models/ticket";

const buildTicket = async (price = 8.5) => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title: "movie",
    price,
  });
  await ticket.save();
  return ticket;
};

const buildOrder = async (options: {
  userId: string;
  ticketId: string;
  status?: OrderStatus;
  seats?: string[];
  showtimeFormat?: string;
}) => {
  const ticket = await Ticket.findById(options.ticketId);

  if (!ticket) {
    throw new Error("Ticket not found for test setup");
  }

  const order = Order.build({
    userId: options.userId,
    status: options.status || OrderStatus.Created,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ticket,
    cinemaId: "centro",
    cinemaName: "CineMax Centro",
    showtimeId: "showtime-1",
    showtimeDate: "2026-03-26",
    showtimeTime: "19:30",
    showtimeFormat: options.showtimeFormat || "2D",
    seats: options.seats || ["A1", "A2"],
    concessions: [],
    concessionsTotal: 0,
    totalPrice: 17,
  });

  await order.save();
  return order;
};

it("updates concessions and recalculates total for a pending order", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const ticket = await buildTicket(8.5);
  const order = await buildOrder({ userId, ticketId: ticket.id });

  const response = await request(app)
    .patch(`/api/orders/${order.id}/concessions`)
    .set("Cookie", global.signin(userId))
    .send({
      concessions: [
        {
          title: "Combo Duo",
          quantity: 2,
          unitPrice: 4.5,
          sizeLabel: "Grande",
        },
      ],
    })
    .expect(200);

  expect(response.body.concessionsTotal).toEqual(9);
  expect(response.body.totalPrice).toEqual(26);
  expect(response.body.concessions).toHaveLength(1);

  const updatedOrder = await Order.findById(order.id);
  expect(updatedOrder?.concessionsTotal).toEqual(9);
  expect(updatedOrder?.totalPrice).toEqual(26);
});

it("returns 401 when another user tries to update concessions", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const ticket = await buildTicket(8.5);
  const order = await buildOrder({ userId, ticketId: ticket.id });

  await request(app)
    .patch(`/api/orders/${order.id}/concessions`)
    .set("Cookie", global.signin())
    .send({
      concessions: [{ title: "Combo", quantity: 1, unitPrice: 4 }],
    })
    .expect(401);
});

it("returns 400 when trying to update concessions on a completed order", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const ticket = await buildTicket(8.5);
  const order = await buildOrder({
    userId,
    ticketId: ticket.id,
    status: OrderStatus.Complete,
  });

  await request(app)
    .patch(`/api/orders/${order.id}/concessions`)
    .set("Cookie", global.signin(userId))
    .send({
      concessions: [{ title: "Combo", quantity: 1, unitPrice: 4 }],
    })
    .expect(400);
});
