import {
  ExchangeNames,
  ExpirationCompleteEvent,
} from "@eftickets/common";
import { Producer } from "../core/base-publisher";

export class ExpirationCompletePublisher extends Producer<ExpirationCompleteEvent> {
  readonly exchangeName = ExchangeNames.ExpirationComplete;
  routingKey = "expirationKeyComplete";
  exchangeType = "direct";
}
