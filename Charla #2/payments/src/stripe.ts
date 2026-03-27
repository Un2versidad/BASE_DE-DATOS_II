import Stripe from "stripe";

const stripeKey = (process.env.STRIPE_KEY || "").trim();

export const isMockPaymentsEnabled =
  process.env.MOCK_PAYMENTS === "true" ||
  !stripeKey ||
  stripeKey === "sk_test_change_me";

export const buildMockSessionId = (orderId: string) => `mock_session_${orderId}`;

export const isMockSessionForOrder = (orderId: string, sessionId: string) =>
  sessionId === buildMockSessionId(orderId);

export const stripe = isMockPaymentsEnabled
  ? null
  : new Stripe(stripeKey, {
      // apiVersion: "2024-09-30.acacia",
      //apiVersion: "2025-01-27.acacia",
      //apiVersion: "2025-02-24.acacia",
    });
