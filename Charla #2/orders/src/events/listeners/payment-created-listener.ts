import {
  ExchangeNames,
  PaymentCreatedEvent,
  OrderStatus,
} from "@eftickets/common";

import { Order } from "../../models/order";
import { Consumer } from "../core/base-consumer";

export class PaymentCreatedListener extends Consumer<PaymentCreatedEvent> {
  readonly exchangeName = ExchangeNames.PaymentCreated;
  routingKey = "paymentKeyCreate";
  exchangeType = "direct";
  queueName = "paymentQueueCreate";

  async onMessage(data: PaymentCreatedEvent["data"]) {
    const order = await Order.findById(data.orderId);

    if (!order) {
      throw new Error(`[orders] PaymentCreated projection missing orderId=${data.orderId}`);
    }

    if (order.status === OrderStatus.Complete) {
      return;
    }

    if (order.status === OrderStatus.Cancelled) {
      console.warn("[orders] PaymentCreated ignored for cancelled order", {
        orderId: data.orderId,
      });
      return;
    }

    order.set({
      status: OrderStatus.Complete,
    });
    await order.save();

    // msg.ack();
  }
}
