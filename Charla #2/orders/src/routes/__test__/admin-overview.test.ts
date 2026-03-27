import mongoose from "mongoose";
import request from "supertest";
import { Order, OrderStatus } from "../../models/order";
import { Ticket } from "../../models/ticket";
import { app } from "../../app";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "fl2on@proton.me";

const buildTicket = async (title: string, price: number) => {
  const ticket = Ticket.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    title,
    price,
  });
  await ticket.save();

  return ticket;
};

const buildOrder = async ({
  ticket,
  userId,
  status,
  cinemaName,
  showtimeFormat,
  seats,
  totalPrice,
  concessions = [],
  concessionsTotal = 0,
}: {
  ticket: Awaited<ReturnType<typeof buildTicket>>;
  userId: string;
  status: OrderStatus;
  cinemaName: string;
  showtimeFormat: string;
  seats: string[];
  totalPrice: number;
  concessions?: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  concessionsTotal?: number;
}) => {
  const order = Order.build({
    userId,
    status,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    ticket,
    cinemaName,
    showtimeId: `${cinemaName}-${showtimeFormat}`,
    showtimeDate: "2026-03-26",
    showtimeTime: "19:30",
    showtimeFormat,
    seats,
    concessions,
    concessionsTotal,
    totalPrice,
  });

  await order.save();
  return order;
};

it("rejects non-admin users from reading admin overview", async () => {
  await request(app)
    .get("/api/v1/orders/admin/overview")
    .set("Cookie", global.signin())
    .expect(401);
});

it("returns admin overview metrics and breakdowns for the real admin", async () => {
  const movieOne = await buildTicket("Hoppers: Operación Castor", 8.5);
  const movieTwo = await buildTicket("Nuremberg: El juicio del siglo", 9.5);

  await buildOrder({
    ticket: movieOne,
    userId: "guest_demo_001",
    status: OrderStatus.Complete,
    cinemaName: "CineMax Centro",
    showtimeFormat: "2D",
    seats: ["A1", "A2"],
    concessions: [
      {
        title: "Combo Amigos",
        quantity: 1,
        unitPrice: 7.1,
        total: 7.1,
      },
    ],
    concessionsTotal: 7.1,
    totalPrice: 24.1,
  });

  await buildOrder({
    ticket: movieTwo,
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
    cinemaName: "CineMax Norte",
    showtimeFormat: "IMAX",
    seats: ["C3", "C4", "C5"],
    totalPrice: 31.5,
  });

  await buildOrder({
    ticket: movieOne,
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Cancelled,
    cinemaName: "CineMax Centro",
    showtimeFormat: "3D",
    seats: ["B1"],
    totalPrice: 9.5,
  });

  const response = await request(app)
    .get("/api/v1/orders/admin/overview?days=30")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .expect(200);

  expect(response.body.range.days).toEqual(30);
  expect(response.body.overview.totalOrders).toEqual(3);
  expect(response.body.overview.completedOrders).toEqual(1);
  expect(response.body.overview.activeOrders).toEqual(1);
  expect(response.body.overview.cancelledOrders).toEqual(1);
  expect(response.body.overview.guestOrders).toEqual(1);
  expect(response.body.overview.registeredOrders).toEqual(2);
  expect(response.body.overview.grossRevenue).toEqual(24.1);
  expect(response.body.overview.ticketRevenue).toEqual(17);
  expect(response.body.overview.concessionsRevenue).toEqual(7.1);
  expect(response.body.overview.concessionsAttached).toEqual(1);
  expect(Array.isArray(response.body.ordersByDay)).toEqual(true);
  expect(response.body.statusBreakdown[0].count).toBeGreaterThan(0);
  expect(response.body.topMovies[0].title).toBeTruthy();
  expect(response.body.cinemaBreakdown[0].name).toBeTruthy();
  expect(response.body.formatBreakdown[0].format).toBeTruthy();
  expect(response.body.ticketMix).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ segment: "Registrado" }),
      expect.objectContaining({ segment: "Invitado" }),
    ])
  );
  expect(response.body.insights.length).toBeGreaterThanOrEqual(4);
});
