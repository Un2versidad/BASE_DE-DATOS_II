import { OrderCreatedEvent, ExchangeNames } from "@eftickets/common";
import { Producer } from "../core/base-publisher";

export class OrderCreatedPublisher extends Producer<OrderCreatedEvent> {
  readonly exchangeName = ExchangeNames.OrderCreated;
  routingKey = "ordersKeyCreate";
  exchangeType = "direct";
}
