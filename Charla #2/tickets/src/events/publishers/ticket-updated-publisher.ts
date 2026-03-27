import { ExchangeNames, TicketUpdatedEvent } from "@eftickets/common";
import { Producer } from "../core/base-publisher";

export class TicketUpdatedPublisher extends Producer<TicketUpdatedEvent> {
  readonly exchangeName = ExchangeNames.TicketUpdated;
  routingKey = "ticketsKeyUpdate";
  exchangeType = "direct";
}
