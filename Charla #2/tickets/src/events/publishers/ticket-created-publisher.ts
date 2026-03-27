import { TicketCreatedEvent, ExchangeNames } from "@eftickets/common";
import { Producer } from "../core/base-publisher";

export class TicketCreatedPublisher extends Producer<TicketCreatedEvent> {
  readonly exchangeName = ExchangeNames.TicketCreated;
  routingKey = "ticketsKeyCreate";
  exchangeType = "direct";
}
