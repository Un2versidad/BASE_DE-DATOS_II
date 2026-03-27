import { OrderCreatedEvent, ExchangeNames } from "@eftickets/common";
import { expirationQueue } from "../../queues/expiration-queue";
import { Consumer } from "../core/base-consumer";

export class OrderCreatedListener extends Consumer<OrderCreatedEvent> {
  readonly exchangeName = ExchangeNames.OrderCreated;
  routingKey = "ordersKeyCreate";
  exchangeType = "direct";
  queueName = "expirationOrdersQueueCreate";

  async onMessage(data: OrderCreatedEvent["data"]) {
    const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
    console.log("Waiting this many milliseconds to process the job:", delay);

    await expirationQueue.add(
      {
        orderId: data.id,
      },
      {
        delay: Math.max(delay, 0),
        jobId: `expire:${data.id}`,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
  }
}
