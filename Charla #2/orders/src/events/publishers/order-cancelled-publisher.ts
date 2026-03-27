import {
  ExchangeNames,
  OrderCancelledEvent,
} from "@eftickets/common";
import { Producer } from "../core/base-publisher";

export class OrderCancelledPublisher extends Producer<OrderCancelledEvent> {
  readonly exchangeName = ExchangeNames.OrderCancelled;
  routingKey = "ordersKeyCancel";
  exchangeType = "direct";
}
