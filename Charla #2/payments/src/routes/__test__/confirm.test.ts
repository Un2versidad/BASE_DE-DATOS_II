import mongoose from "mongoose";
import request from "supertest";
import { OrderStatus } from "@eftickets/common";
import { app } from "../../app";
import { Order } from "../../models/order";
import { Payment } from "../../models/payment";
import { rabbitWrapper } from "../../rabbit-wrapper";
import { stripe } from "../../stripe";

const mockRetrieveCheckoutSession = (overrides: Record<string, unknown> = {}) => {
  return jest
    .spyOn(stripe!.checkout.sessions, "retrieve")
    .mockResolvedValue({
      id: "cs_test_confirmed",
      metadata: {},
      payment_status: "paid",
      payment_intent: "pi_test_confirmed",
      ...overrides,
    } as never);
};

afterEach(() => {
  jest.restoreAllMocks();
});

it("confirms a paid Stripe session and creates a payment", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 42,
    status: OrderStatus.Created,
  });
  await order.save();

  mockRetrieveCheckoutSession({
    id: "cs_paid_order",
    metadata: { orderId: order.id },
    payment_status: "paid",
    payment_intent: "pi_paid_order",
  });

  const response = await request(app)
    .post("/api/payments/confirm")
    .set("Cookie", global.signin(userId))
    .send({
      orderId: order.id,
      sessionId: "cs_paid_order",
    })
    .expect(201);

  expect(response.body.orderId).toEqual(order.id);
  expect(response.body.stripeId).toEqual("pi_paid_order");
  expect(rabbitWrapper.client.publish).toHaveBeenCalled();

  const payment = await Payment.findOne({ orderId: order.id });
  expect(payment).not.toBeNull();
  expect(payment?.checkoutSessionId).toEqual("cs_paid_order");
});

it("returns 400 when Stripe has not confirmed the payment", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 42,
    status: OrderStatus.Created,
  });
  await order.save();

  mockRetrieveCheckoutSession({
    id: "cs_pending_order",
    metadata: { orderId: order.id },
    payment_status: "unpaid",
    payment_intent: "pi_pending_order",
  });

  await request(app)
    .post("/api/payments/confirm")
    .set("Cookie", global.signin(userId))
    .send({
      orderId: order.id,
      sessionId: "cs_pending_order",
    })
    .expect(400);

  const payment = await Payment.findOne({ orderId: order.id });
  expect(payment).toBeNull();
});
