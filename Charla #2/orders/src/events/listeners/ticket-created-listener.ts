import { TicketCreatedEvent, ExchangeNames } from "@eftickets/common";
import { Ticket } from "../../models/ticket";
import { Consumer } from "../core/base-consumer";

export class TicketCreatedListener extends Consumer<TicketCreatedEvent> {
  readonly exchangeName = ExchangeNames.TicketCreated;
  routingKey = "ticketsKeyCreate";
  exchangeType = "direct";
  queueName = "ticketsCreateQueue";

  async onMessage(data: TicketCreatedEvent["data"]) {
    const { id, title, price } = data;

    const existingTicket = await Ticket.findById(id);
    if (existingTicket) {
      if (existingTicket.title === title && existingTicket.price === price) {
        return;
      }

      existingTicket.set({
        title,
        price,
      });
      await existingTicket.save();
      return;
    }

    const ticket = Ticket.build({
      id,
      title,
      price,
    });
    await ticket.save();
  }
}
