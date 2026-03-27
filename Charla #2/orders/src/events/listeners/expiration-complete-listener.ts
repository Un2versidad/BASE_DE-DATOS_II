import {
  ExchangeNames,
  ExpirationCompleteEvent,
  OrderCancelledEvent,
  OrderStatus,
} from "@eftickets/common";

import { Order } from "../../models/order";
import { OrderCancelledPublisher } from "../publishers/order-cancelled-publisher";
import { Consumer } from "../core/base-consumer";

export class ExpirationCompleteListener extends Consumer<ExpirationCompleteEvent> {
  readonly exchangeName = ExchangeNames.ExpirationComplete;
  routingKey = "expirationKeyComplete";
  exchangeType = "direct";
  queueName = "expirationQueueComplete";

  async onMessage(data: ExpirationCompleteEvent["data"]) {
    const order = await Order.findById(data.orderId).populate("ticket");

    if (!order) {
      throw new Error(`[orders] ExpirationComplete projection missing orderId=${data.orderId}`);
    }

    if (order.status === OrderStatus.Complete || order.status === OrderStatus.Cancelled) {
      return;
    }

    order.set({
      status: OrderStatus.Cancelled,
    });
    await order.save();
    const eventPayload: OrderCancelledEvent["data"] & {
      showtimeId?: string;
      seats?: string[];
    } = {
      id: order.id,
      version: order.version,
      ticket: {
        id: order.ticket.id,
      },
      showtimeId: order.showtimeId,
      seats: order.seats,
    };

    await new OrderCancelledPublisher(this.channel).publish(eventPayload);
  }
}
