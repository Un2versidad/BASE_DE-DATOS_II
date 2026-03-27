import fs from "fs";
import client, { ChannelModel, ConfirmChannel } from "amqplib";

const resolveTlsMaterial = (
  inlineValue?: string,
  filePath?: string
): string | Buffer | undefined => {
  if (inlineValue) {
    return inlineValue;
  }

  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  return undefined;
};

const normalizeRabbitUrl = (url: string) => {
  const parsedUrl = new URL(url);

  if (!parsedUrl.searchParams.has("heartbeat")) {
    parsedUrl.searchParams.set("heartbeat", "40");
  }

  return parsedUrl.toString();
};

const isTlsRequired = () => {
  if (process.env.RABBITMQ_REQUIRE_TLS === "true") {
    return true;
  }

  if (process.env.RABBITMQ_REQUIRE_TLS === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
};

const buildSocketOptions = (url: string) => {
  const parsedUrl = new URL(url);
  const isTlsUrl = parsedUrl.protocol === "amqps:";

  if (isTlsRequired() && !isTlsUrl) {
    throw new Error("RABBITMQ_REQUIRE_TLS is enabled but RABBITMQ_URL is not amqps://");
  }

  if (!isTlsUrl) {
    return undefined;
  }

  const socketOptions: Record<string, unknown> = {
    rejectUnauthorized: process.env.RABBITMQ_TLS_REJECT_UNAUTHORIZED !== "false",
    servername: process.env.RABBITMQ_TLS_SERVERNAME || parsedUrl.hostname,
  };

  const ca = resolveTlsMaterial(
    process.env.RABBITMQ_TLS_CA_CERT,
    process.env.RABBITMQ_TLS_CA_CERT_PATH
  );
  const cert = resolveTlsMaterial(
    process.env.RABBITMQ_TLS_CLIENT_CERT,
    process.env.RABBITMQ_TLS_CLIENT_CERT_PATH
  );
  const key = resolveTlsMaterial(
    process.env.RABBITMQ_TLS_CLIENT_KEY,
    process.env.RABBITMQ_TLS_CLIENT_KEY_PATH
  );

  if (ca) {
    socketOptions.ca = [ca];
  }

  if (cert) {
    socketOptions.cert = cert;
  }

  if (key) {
    socketOptions.key = key;
  }

  return socketOptions;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getConnectRetryConfig = () => {
  const maxAttempts = Number(process.env.RABBITMQ_CONNECT_MAX_ATTEMPTS ?? 15);
  const delayMs = Number(process.env.RABBITMQ_CONNECT_RETRY_DELAY_MS ?? 2000);

  return {
    maxAttempts: Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 15,
    delayMs: Number.isInteger(delayMs) && delayMs > 0 ? delayMs : 2000,
  };
};

class RabbitWrapper {
  private _channel?: ConfirmChannel;
  connection?: ChannelModel;

  get client() {
    if (!this._channel) {
      throw new Error("RABBIT connection needs to be initialized first!");
    }
    return this._channel;
  }

  async connect(url: string) {
    if (this.connection && this._channel) {
      return;
    }

    const normalizedUrl = normalizeRabbitUrl(url);
    const socketOptions = buildSocketOptions(url);
    const { maxAttempts, delayMs } = getConnectRetryConfig();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        this.connection = await client.connect(normalizedUrl, socketOptions);
        break;
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        console.warn(
          `[rabbitmq] connect attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms`
        );
        await wait(delayMs);
      }
    }

    if (!this.connection) {
      throw lastError instanceof Error
        ? lastError
        : new Error("RabbitMQ connection could not be established");
    }

    this._channel = await this.connection.createConfirmChannel();
    this._channel.on("return", (message) => {
      console.error("[rabbitmq] unroutable message returned", {
        exchange: message.fields.exchange,
        routingKey: message.fields.routingKey,
        messageId: message.properties.messageId,
      });
    });
  }

  async close() {
    try {
      await this._channel?.close();
    } catch {}

    try {
      await this.connection?.close();
    } catch {}

    this._channel = undefined;
    this.connection = undefined;
  }
}

export const rabbitWrapper = new RabbitWrapper();
