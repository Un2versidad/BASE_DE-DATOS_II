import {
  ExchangeNames,
  PaymentCreatedEvent,
} from "@eftickets/common";
import { Producer } from "../core/base-publisher";

export class PaymentCreatedPublisher extends Producer<PaymentCreatedEvent> {
  readonly exchangeName = ExchangeNames.PaymentCreated;
  routingKey = "paymentKeyCreate";
  exchangeType = "direct";
}
