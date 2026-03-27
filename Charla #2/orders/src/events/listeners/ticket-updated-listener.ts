import { ExchangeNames, TicketUpdatedEvent } from "@eftickets/common";
import { Ticket } from "../../models/ticket";
import { Consumer } from "../core/base-consumer";

export class TicketUpdatedListener extends Consumer<TicketUpdatedEvent> {
  readonly exchangeName = ExchangeNames.TicketUpdated;
  routingKey = "ticketsKeyUpdate";
  exchangeType = "direct";
  queueName = "ticketsUpdateQueue";

  async onMessage(data: TicketUpdatedEvent["data"]) {
    const ticket = await Ticket.findByEvent(data);

    if (!ticket) {
      throw new Error(
        `[orders] TicketUpdated projection missing ticket/version ticketId=${data.id} version=${data.version}`
      );
    }

    const { title, price } = data;
    if (ticket.title === title && ticket.price === price) {
      return;
    }

    ticket.set({ title, price });
    await ticket.save();
  }
}
