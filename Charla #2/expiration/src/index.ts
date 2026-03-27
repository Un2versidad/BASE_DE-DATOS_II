import { rabbitWrapper } from "./rabbit-wrapper";
import { OrderCreatedListener } from "./events/listeners/order-created-listener";

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
    const env = requireEnvVars(["RABBITMQ_URL"] as const);

    await rabbitWrapper.connect(env.RABBITMQ_URL);

    rabbitWrapper.connection?.on("close", () => {
      console.error("[expiration] RabbitMQ connection closed");

      if (!isShuttingDown) {
        process.exit(1);
      }
    });
    rabbitWrapper.connection?.on("error", (error) => {
      console.error("[expiration] RabbitMQ connection error", error);
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

    await new OrderCreatedListener(rabbitWrapper.client).consumeMessage();
  } catch (error) {
    console.error("[expiration] Failed to start service", error);
    process.exit(1);
  }
};

void start();
