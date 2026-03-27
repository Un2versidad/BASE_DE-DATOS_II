import mongoose from "mongoose";
import { app } from "./app";
import { rabbitWrapper } from "./rabbit-wrapper";
import { TicketCreatedListener } from "./events/listeners/ticket-created-listener";
import { TicketUpdatedListener } from "./events/listeners/ticket-updated-listener";
import { ExpirationCompleteListener } from "./events/listeners/expiration-complete-listener";
import { PaymentCreatedListener } from "./events/listeners/payment-created-listener";

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
      ["JWT_KEY", "MONGO_URI", "RABBITMQ_URL", "ADMIN_EMAIL"] as const
    );

    await rabbitWrapper.connect(env.RABBITMQ_URL);

    rabbitWrapper.connection?.on("close", () => {
      console.error("[orders] RabbitMQ connection closed");

      if (!isShuttingDown) {
        process.exit(1);
      }
    });
    rabbitWrapper.connection?.on("error", (error) => {
      console.error("[orders] RabbitMQ connection error", error);
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

    await Promise.all([
      new TicketCreatedListener(rabbitWrapper.client).consumeMessage(),
      new TicketUpdatedListener(rabbitWrapper.client).consumeMessage(),
      new ExpirationCompleteListener(rabbitWrapper.client).consumeMessage(),
      new PaymentCreatedListener(rabbitWrapper.client).consumeMessage(),
    ]);

    app.listen(3000, () => {
      console.log("Listening on port 3000!!!");
    });
  } catch (error) {
    console.error("[orders] Failed to start service", error);
    process.exit(1);
  }
};

void start();
