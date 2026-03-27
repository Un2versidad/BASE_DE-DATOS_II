import { OrderCreatedEvent, ExchangeNames } from "@eftickets/common";
import { Order } from "../../models/order";
import { Consumer } from "../core/base-consumer";

export class OrderCreatedListener extends Consumer<OrderCreatedEvent> {
  readonly exchangeName = ExchangeNames.OrderCreated;
  routingKey = "ordersKeyCreate";
  exchangeType = "direct";
  queueName = "paymentsOrdersQueueCreate";

  async onMessage(data: OrderCreatedEvent["data"]) {
    const existingOrder = await Order.findById(data.id);

    if (existingOrder) {
      if (
        existingOrder.price === data.ticket.price &&
        existingOrder.status === data.status &&
        existingOrder.userId === data.userId &&
        existingOrder.version >= data.version
      ) {
        return;
      }

      existingOrder.set({
        price: data.ticket.price,
        status: data.status,
        userId: data.userId,
      });
      await existingOrder.save();
      return;
    }

    const order = Order.build({
      id: data.id,
      price: data.ticket.price,
      status: data.status,
      userId: data.userId,
      version: data.version,
    });
    await order.save();
  }
}
