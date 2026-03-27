import { ConfirmChannel, ConsumeMessage, Options } from "amqplib";
import { ExchangeNames } from "@eftickets/common";

interface Event {
  exchange: ExchangeNames;
  data: any;
}

const cleanHeaders = (headers: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(headers).filter(([, value]) => value !== undefined && value !== null)
  );

const publishWithConfirm = (
  channel: ConfirmChannel,
  exchange: string,
  routingKey: string,
  content: Buffer,
  options: Options.Publish
) =>
  new Promise<void>((resolve, reject) => {
    channel.publish(exchange, routingKey, content, options, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, 500);
  }

  return String(error).slice(0, 500);
};

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export abstract class Consumer<T extends Event> {
  protected channel: ConfirmChannel;
  abstract exchangeName: T["exchange"];
  abstract routingKey: string;
  abstract exchangeType: string;
  abstract queueName: string;
  abstract onMessage(data: T["data"]): Promise<void> | void;

  constructor(channel: ConfirmChannel) {
    this.channel = channel;
  }

  private get retryExchangeName() {
    return `${this.queueName}.retry.exchange`;
  }

  private get retryRoutingKey() {
    return `${this.queueName}.retry`;
  }

  private get retryQueueName() {
    return `${this.queueName}.retry.queue`;
  }

  private get deadLetterExchangeName() {
    return `${this.queueName}.dlx`;
  }

  private get deadLetterRoutingKey() {
    return `${this.queueName}.dead`;
  }

  private get deadLetterQueueName() {
    return `${this.queueName}.dlq`;
  }

  private get prefetchCount() {
    return toPositiveInt(process.env.RABBITMQ_PREFETCH, 10);
  }

  private get retryDelayMs() {
    return toPositiveInt(process.env.RABBITMQ_RETRY_DELAY_MS, 5000);
  }

  private get maxRetries() {
    const parsed = Number(process.env.RABBITMQ_MAX_RETRIES);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 3;
  }

  private async setupTopology() {
    await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
      durable: true,
      autoDelete: false,
    });
    await this.channel.assertExchange(this.retryExchangeName, "direct", {
      durable: true,
      autoDelete: false,
    });
    await this.channel.assertExchange(this.deadLetterExchangeName, "direct", {
      durable: true,
      autoDelete: false,
    });

    await this.channel.assertQueue(this.deadLetterQueueName, {
      durable: true,
    });
    await this.channel.bindQueue(
      this.deadLetterQueueName,
      this.deadLetterExchangeName,
      this.deadLetterRoutingKey
    );

    await this.channel.assertQueue(this.retryQueueName, {
      durable: true,
      deadLetterExchange: this.exchangeName,
      deadLetterRoutingKey: this.routingKey,
      messageTtl: this.retryDelayMs,
    });
    await this.channel.bindQueue(
      this.retryQueueName,
      this.retryExchangeName,
      this.retryRoutingKey
    );

    await this.channel.assertQueue(this.queueName, {
      durable: true,
      deadLetterExchange: this.deadLetterExchangeName,
      deadLetterRoutingKey: this.deadLetterRoutingKey,
    });
    await this.channel.bindQueue(this.queueName, this.exchangeName, this.routingKey);
    await this.channel.prefetch(this.prefetchCount);
  }

  private getRetryCount(message: ConsumeMessage) {
    const retryCount = Number(message.properties.headers?.["x-retry-count"] ?? 0);
    return Number.isFinite(retryCount) && retryCount >= 0 ? retryCount : 0;
  }

  private async publishForRecovery(
    exchange: string,
    routingKey: string,
    message: ConsumeMessage,
    headers: Record<string, unknown>
  ) {
    await publishWithConfirm(this.channel, exchange, routingKey, message.content, {
      persistent: true,
      deliveryMode: 2,
      mandatory: true,
      contentType: message.properties.contentType || "application/json",
      contentEncoding: message.properties.contentEncoding || "utf-8",
      timestamp: Date.now(),
      correlationId:
        message.properties.correlationId ||
        (typeof message.properties.messageId === "string"
          ? message.properties.messageId
          : undefined),
      messageId:
        typeof message.properties.messageId === "string"
          ? message.properties.messageId
          : undefined,
      headers: cleanHeaders({
        ...message.properties.headers,
        ...headers,
      }),
    });
  }

  private async handleProcessingError(message: ConsumeMessage, error: unknown) {
    const retryCount = this.getRetryCount(message);
    const baseHeaders = {
      "x-last-error": toErrorMessage(error),
      "x-last-failed-at": new Date().toISOString(),
      "x-original-exchange": String(this.exchangeName),
      "x-original-routing-key": this.routingKey,
      "x-original-queue": this.queueName,
    };

    try {
      if (retryCount < this.maxRetries) {
        await this.publishForRecovery(this.retryExchangeName, this.retryRoutingKey, message, {
          ...baseHeaders,
          "x-retry-count": retryCount + 1,
        });

        this.channel.ack(message);
        console.warn(
          `[rabbitmq] retry queued queue=${this.queueName} attempt=${retryCount + 1}/${this.maxRetries}`
        );
        return;
      }

      await this.publishForRecovery(
        this.deadLetterExchangeName,
        this.deadLetterRoutingKey,
        message,
        {
          ...baseHeaders,
          "x-retry-count": retryCount,
          "x-dead-lettered-at": new Date().toISOString(),
        }
      );

      this.channel.ack(message);
      console.error(`[rabbitmq] message dead-lettered queue=${this.queueName}`, error);
    } catch (recoveryError) {
      console.error(
        `[rabbitmq] failed to route retry/dlq queue=${this.queueName}, requeueing original message`,
        recoveryError
      );
      this.channel.nack(message, false, true);
    }
  }

  private async processMessage(message: ConsumeMessage) {
    try {
      const data = JSON.parse(message.content.toString()) as T["data"];
      await this.onMessage(data);
      this.channel.ack(message);
    } catch (error) {
      await this.handleProcessingError(message, error);
    }
  }

  async consumeMessage(): Promise<void> {
    await this.setupTopology();

    await this.channel.consume(
      this.queueName,
      (message) => {
        if (!message) {
          return;
        }

        void this.processMessage(message);
      },
      {
        noAck: false,
      }
    );
  }
}
