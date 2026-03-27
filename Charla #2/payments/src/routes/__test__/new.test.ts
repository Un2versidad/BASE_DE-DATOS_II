import mongoose from "mongoose";
import request from "supertest";
import { OrderStatus } from "@eftickets/common";
import { app } from "../../app";
import { Order } from "../../models/order";
import { stripe } from "../../stripe";
import { Payment } from "../../models/payment";
import { rabbitWrapper } from "../../rabbit-wrapper";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "fl2on@proton.me";

const buildCheckoutSession = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "cs_test_123",
    url: "https://checkout.stripe.test/session",
    payment_status: "unpaid",
    payment_intent: "pi_test_123",
    client_reference_id: null,
    metadata: {},
    ...overrides,
  }) as any;

it("returns a 404 when purchasing an order that does not exist", async () => {
  await request(app)
    .post("/api/payments")
    .set("Cookie", global.signin())
    .send({
      orderId: new mongoose.Types.ObjectId().toHexString(),
    })
    .expect(404);
});

it("returns a 401 when purchasing an order that doesnt belong to the user", async () => {
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    version: 0,
    price: 20,
    status: OrderStatus.Created,
  });
  await order.save();

  await request(app)
    .post("/api/payments")
    .set("Cookie", global.signin())
    .send({
      orderId: order.id,
    })
    .expect(401);
});

it("allows admin to purchase an order owned by another user", async () => {
  const createSessionSpy = jest
    .spyOn(stripe!.checkout.sessions, "create")
    .mockResolvedValue(buildCheckoutSession());

  const ownerUserId = new mongoose.Types.ObjectId().toHexString();
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: ownerUserId,
    version: 0,
    price: 20,
    status: OrderStatus.Created,
  });
  await order.save();

  const response = await request(app)
    .post("/api/payments")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({
      orderId: order.id,
    })
    .expect(201);

  expect(response.body.url).toEqual("https://checkout.stripe.test/session");
  expect(createSessionSpy).toHaveBeenCalled();
});

it("returns a 400 when purchasing a cancelled order", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 20,
    status: OrderStatus.Cancelled,
  });
  await order.save();

  await request(app)
    .post("/api/payments")
    .set("Cookie", global.signin(userId))
    .send({
      orderId: order.id,
    })
    .expect(400);
});

it("returns a 201 with checkout url and does not confirm the payment yet", async () => {
  jest
    .spyOn(stripe!.checkout.sessions, "create")
    .mockResolvedValue(buildCheckoutSession({ id: "cs_test_checkout_1" }));

  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 42,
    status: OrderStatus.Created,
  });
  await order.save();

  const response = await request(app)
    .post("/api/payments")
    .set("Cookie", global.signin(userId))
    .send({
      orderId: order.id,
    })
    .expect(201);

  expect(response.body.sessionId).toEqual("cs_test_checkout_1");
  expect(response.body.url).toEqual("https://checkout.stripe.test/session");
  expect(await Payment.findOne({ orderId: order.id })).toBeNull();
});

it("confirms a paid Stripe session, persists the payment and emits an event", async () => {
  const retrieveSessionSpy = jest.spyOn(stripe!.checkout.sessions, "retrieve");

  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 84,
    status: OrderStatus.Created,
  });
  await order.save();

  retrieveSessionSpy.mockResolvedValueOnce(
    buildCheckoutSession({
      id: "cs_test_paid_1",
      payment_intent: "pi_test_paid_1",
      payment_status: "paid",
      client_reference_id: order.id,
      metadata: { orderId: order.id },
    })
  );

  const response = await request(app)
    .post("/api/payments/confirm")
    .set("Cookie", global.signin(userId))
    .send({
      orderId: order.id,
      sessionId: "cs_test_paid_1",
    })
    .expect(201);

  expect(response.body.ok).toBe(true);
  expect(response.body.orderId).toEqual(order.id);
  expect(response.body.stripeId).toEqual("pi_test_paid_1");
  expect(response.body.checkoutSessionId).toEqual("cs_test_paid_1");

  const payment = await Payment.findOne({
    orderId: order.id,
    stripeId: "pi_test_paid_1",
  });

  expect(payment).not.toBeNull();
  expect(payment?.checkoutSessionId).toEqual("cs_test_paid_1");
  expect(rabbitWrapper.client.publish).toHaveBeenCalled();
});

it("returns a 400 when the Stripe session is not paid yet", async () => {
  const retrieveSessionSpy = jest.spyOn(stripe!.checkout.sessions, "retrieve");

  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 20,
    status: OrderStatus.Created,
  });
  await order.save();

  retrieveSessionSpy.mockResolvedValueOnce(
    buildCheckoutSession({
      id: "cs_test_unpaid_1",
      payment_status: "unpaid",
      client_reference_id: order.id,
      metadata: { orderId: order.id },
    })
  );

  await request(app)
    .post("/api/payments/confirm")
    .set("Cookie", global.signin(userId))
    .send({
      orderId: order.id,
      sessionId: "cs_test_unpaid_1",
    })
    .expect(400);

  expect(await Payment.findOne({ orderId: order.id })).toBeNull();
});
