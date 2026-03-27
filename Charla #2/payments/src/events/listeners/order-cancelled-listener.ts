import {
  OrderCancelledEvent,
  ExchangeNames,
  OrderStatus,
} from "@eftickets/common";

import { Order } from "../../models/order";
import { Consumer } from "../core/base-consumer";

export class OrderCancelledListener extends Consumer<OrderCancelledEvent> {
  readonly exchangeName = ExchangeNames.OrderCancelled;
  routingKey = "ordersKeyCancel";
  exchangeType = "direct";
  queueName = "paymentsOrdersQueueCancel";

  async onMessage(data: OrderCancelledEvent["data"]) {
    const order = await Order.findOne({
      _id: data.id,
      version: data.version - 1,
    });

    if (!order) {
      const existingOrder = await Order.findById(data.id);

      if (existingOrder?.status === OrderStatus.Cancelled) {
        return;
      }

      throw new Error(
        `[payments] OrderCancelled projection missing orderId=${data.id} version=${data.version}`
      );
    }

    order.set({ status: OrderStatus.Cancelled });
    await order.save();
  }
}
