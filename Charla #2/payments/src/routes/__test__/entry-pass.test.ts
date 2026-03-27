/// <reference types="jest" />

import mongoose from "mongoose";
import request from "supertest";
import { OrderStatus } from "@eftickets/common";
import { app } from "../../app";
import { Order } from "../../models/order";
import { Payment } from "../../models/payment";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "fl2on@proton.me";

const createOrder = async (
  userId: string,
  status: OrderStatus = OrderStatus.Created
) => {
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId,
    version: 0,
    price: 42,
    status,
  });

  await order.save();
  return order;
};

const attachPayment = async (orderId: string) => {
  const payment = Payment.build({
    orderId,
    stripeId: `sess_${new mongoose.Types.ObjectId().toHexString()}`,
  });

  await payment.save();
};

it("issues a QR token for the owner when payment exists", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const response = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  expect(typeof response.body.qrToken).toBe("string");
  expect(response.body.orderId).toBe(order.id);
  expect(typeof response.body.expiresAt).toBe("string");
});

it("issues a QR token for a guest owner using the guest id header", async () => {
  const guestId = "guest_checkout_owner";
  const order = await createOrder(guestId);
  await attachPayment(order.id);

  const response = await request(app)
    .post("/api/payments/entry-pass")
    .set("X-Guest-Id", guestId)
    .send({ orderId: order.id })
    .expect(201);

  expect(response.body.orderId).toBe(order.id);
  expect(typeof response.body.qrToken).toBe("string");
});

it("issues a QR token for a guest owner when the guest id header matches", async () => {
  const guestId = "guest_preview_owner";
  const order = await createOrder(guestId);
  await attachPayment(order.id);

  const response = await request(app)
    .post("/api/payments/entry-pass")
    .set("X-Guest-Id", guestId)
    .send({ orderId: order.id })
    .expect(201);

  expect(typeof response.body.qrToken).toBe("string");
  expect(response.body.orderId).toBe(order.id);
});

it("returns 401 when issuing QR for a different user without elevated role", async () => {
  const ownerId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(ownerId);
  await attachPayment(order.id);

  await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin())
    .send({ orderId: order.id })
    .expect(401);
});

it("returns 400 when trying to issue QR without payment", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);

  await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(400);
});

it("allows admin check-in and blocks QR replay", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const issueResponse = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  const token = issueResponse.body.qrToken as string;

  const firstValidation = await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ token })
    .expect(200);

  expect(firstValidation.body.valid).toBe(true);
  expect(firstValidation.body.orderId).toBe(order.id);

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ token })
    .expect(400);
});

it("does not let another account validate QR even if its token says admin", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const issueResponse = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", "otro@correo.com"))
    .send({ token: issueResponse.body.qrToken })
    .expect(401);
});

it("returns 401 when non-elevated user attempts check-in validation", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const issueResponse = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin())
    .send({ token: issueResponse.body.qrToken })
    .expect(401);
});

it("rejects forged QR tokens", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const issueResponse = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  const originalToken = issueResponse.body.qrToken as string;
  const forgedToken = `${originalToken}tampered`;

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ token: forgedToken })
    .expect(400);
});

it("rejects malformed tokens with extra segments", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const issueResponse = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ token: `${issueResponse.body.qrToken}.extra` })
    .expect(400);
});

it("allows the configured admin email to revoke a pass and blocks further validation", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const issueResponse = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  await request(app)
    .post("/api/payments/entry-pass/revoke")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ orderId: order.id, reason: "Sospecha de duplicado" })
    .expect(200);

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ token: issueResponse.body.qrToken })
    .expect(400);
});

it("reissues a pass from taquilla and invalidates old token", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const issueResponse = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  const reissueResponse = await request(app)
    .post("/api/payments/entry-pass/reissue")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ orderId: order.id })
    .expect(201);

  expect(reissueResponse.body.qrToken).not.toEqual(issueResponse.body.qrToken);

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ token: issueResponse.body.qrToken })
    .expect(400);

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ token: reissueResponse.body.qrToken })
    .expect(200);
});

it("returns history for the configured admin email", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  await request(app)
    .post("/api/payments/entry-pass/revoke")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ orderId: order.id, reason: "Duplicado" })
    .expect(200);

  const historyResponse = await request(app)
    .get(`/api/payments/entry-pass/history/${order.id}`)
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .expect(200);

  expect(historyResponse.body.orderId).toBe(order.id);
  expect(Array.isArray(historyResponse.body.history)).toBe(true);
  expect(historyResponse.body.history.length).toBeGreaterThan(0);
  expect(historyResponse.body.currentStatus).toBe("revoked");
});

it("blocks non-elevated access to history endpoint", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  await request(app)
    .get(`/api/payments/entry-pass/history/${order.id}`)
    .set("Cookie", global.signin())
    .expect(401);
});

it("blocks reissuing an access QR after it was already used", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  const issueResponse = await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  await request(app)
    .post("/api/payments/entry-pass/validate")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ token: issueResponse.body.qrToken })
    .expect(200);

  await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(400);
});

it("blocks owner-side reissue when taquilla already revoked the QR", async () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const order = await createOrder(userId);
  await attachPayment(order.id);

  await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(201);

  await request(app)
    .post("/api/payments/entry-pass/revoke")
    .set("Cookie", global.signin(undefined, "admin", ADMIN_EMAIL))
    .send({ orderId: order.id, reason: "Sospecha de duplicado" })
    .expect(200);

  await request(app)
    .post("/api/payments/entry-pass")
    .set("Cookie", global.signin(userId))
    .send({ orderId: order.id })
    .expect(400);
});
