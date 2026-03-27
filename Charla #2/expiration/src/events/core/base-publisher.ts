import { randomUUID } from "crypto";
import { ConfirmChannel, Options } from "amqplib";
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

export abstract class Producer<T extends Event> {
  protected channel: ConfirmChannel;
  abstract exchangeName: T["exchange"];
  abstract routingKey: string;
  abstract exchangeType: string;

  constructor(channel: ConfirmChannel) {
    this.channel = channel;
  }

  protected buildPublishOptions(data: T["data"]): Options.Publish {
    const eventData =
      typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    const eventId =
      typeof eventData.id === "string" && eventData.id
        ? eventData.id
        : typeof eventData.orderId === "string" && eventData.orderId
          ? eventData.orderId
          : randomUUID();

    const eventVersion =
      typeof eventData.version === "number" ? String(eventData.version) : undefined;

    return {
      persistent: true,
      deliveryMode: 2,
      mandatory: true,
      contentType: "application/json",
      contentEncoding: "utf-8",
      timestamp: Date.now(),
      correlationId: eventId,
      messageId: `${this.exchangeName}:${this.routingKey}:${eventId}:${eventVersion ?? "na"}`,
      headers: cleanHeaders({
        "x-event-exchange": String(this.exchangeName),
        "x-event-routing-key": this.routingKey,
        "x-event-version": eventVersion,
        "x-published-at": new Date().toISOString(),
      }),
    };
  }

  async publish(data: T["data"]): Promise<void> {
    await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
      durable: true,
      autoDelete: false,
    });

    await publishWithConfirm(
      this.channel,
      this.exchangeName,
      this.routingKey,
      Buffer.from(JSON.stringify(data)),
      this.buildPublishOptions(data)
    );

    console.log(
      `[rabbitmq] published exchange=${this.exchangeName} routingKey=${this.routingKey}`
    );
  }
}
