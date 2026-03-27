import mongoose from "mongoose";
import { app } from "./app";
import { rabbitWrapper } from "./rabbit-wrapper";
import { OrderCancelledListener } from "./events/listeners/order-cancelled-listener";
import { OrderCreatedListener } from "./events/listeners/order-created-listener";
import { isMockPaymentsEnabled } from "./stripe";

type RequiredEnv<TKeys extends readonly string[]> = {
  [K in TKeys[number]]: string;
};

const requireEnvVars = <TKeys extends readonly string[]>(
  keys: TKeys
): RequiredEnv<TKeys> => {
  const env = {} as RequiredEnv<TKeys>;

  for (const key of keys) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`${key} must be defined`);
    }

    (env as Record<string, string>)[key] = value;
  }

  return env;
};

const start = async () => {
  try {
    let isShuttingDown = false;
    const env = requireEnvVars(
      [
        "JWT_KEY",
        "MONGO_URI",
        "RABBITMQ_URL",
        "ENTRY_PASS_SECRET",
        "ADMIN_EMAIL",
      ] as const
    );

    if (!isMockPaymentsEnabled && !process.env.STRIPE_KEY) {
      throw new Error("STRIPE_KEY must be defined when mock payments are disabled");
    }

    if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
      throw new Error("CLIENT_URL must be defined in production");
    }

    await rabbitWrapper.connect(env.RABBITMQ_URL);

    rabbitWrapper.connection?.on("close", () => {
      console.error("[payments] RabbitMQ connection closed");

      if (!isShuttingDown) {
        process.exit(1);
      }
    });
    rabbitWrapper.connection?.on("error", (error) => {
      console.error("[payments] RabbitMQ connection error", error);
    });

    const gracefulShutdown = async () => {
      if (isShuttingDown) {
        return;
      }

      isShuttingDown = true;
      await rabbitWrapper.close();
      process.exit(0);
    };

    process.on("SIGINT", () => {
      void gracefulShutdown();
    });
    process.on("SIGTERM", () => {
      void gracefulShutdown();
    });

    await mongoose.connect(env.MONGO_URI);
    console.log("Connected to MongoDb");
    if (isMockPaymentsEnabled) {
      console.log("[payments] Mock checkout mode enabled");
    }

    await Promise.all([
      new OrderCreatedListener(rabbitWrapper.client).consumeMessage(),
      new OrderCancelledListener(rabbitWrapper.client).consumeMessage(),
    ]);

    app.listen(3000, () => {
      console.log("Listening on port 3000!");
    });
  } catch (error) {
    console.error("[payments] Failed to start service", error);
    process.exit(1);
  }
};

void start();
