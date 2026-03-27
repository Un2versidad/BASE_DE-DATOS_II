import {
  ExchangeNames,
  OrderCancelledEvent,
} from "@eftickets/common";
import { Ticket } from "../../models/ticket";
import { TicketUpdatedPublisher } from "../publishers/ticket-updated-publisher";
import { Consumer } from "../core/base-consumer";

type OrderCancelledReservationPayload = OrderCancelledEvent["data"] & {
  showtimeId?: string;
  seats?: string[];
};

const normalizeSeat = (seat: string) => seat.trim().toUpperCase();

const resolveShowtimeStatus = (soldSeats: string[]) => {
  if (soldSeats.length >= 48) {
    return "agotado";
  }

  if (soldSeats.length >= 36) {
    return "casi lleno";
  }

  return "disponible";
};

export class OrderCancelledListener extends Consumer<OrderCancelledEvent> {
  readonly exchangeName = ExchangeNames.OrderCancelled;
  routingKey = "ordersKeyCancel";
  exchangeType = "direct";
  queueName = "ticketsOrdersQueueCancel";

  async onMessage(data: OrderCancelledEvent["data"]) {
    const payload = data as OrderCancelledReservationPayload;
    const ticket = await Ticket.findById(data.ticket.id);

    if (!ticket) {
      throw new Error(
        `[tickets] OrderCancelled projection missing ticketId=${data.ticket.id} orderId=${data.id}`
      );
    }

    const seats = Array.isArray(payload.seats)
      ? [...new Set(payload.seats.filter((seat) => typeof seat === "string").map(normalizeSeat))]
      : [];
    let changed = false;

    if (payload.showtimeId && seats.length > 0) {
      const existingShowtimes = Array.isArray(ticket.showtimes) ? [...ticket.showtimes] : [];
      const showtimeIndex = existingShowtimes.findIndex(
        (showtime) => showtime?.id === payload.showtimeId
      );

      if (showtimeIndex >= 0) {
        const currentShowtime = existingShowtimes[showtimeIndex];
        const previousSeats = [...(currentShowtime.soldSeats || [])]
          .map(normalizeSeat)
          .sort()
          .join(",");
        const soldSeats = (currentShowtime.soldSeats || [])
          .map(normalizeSeat)
          .filter((seat) => !seats.includes(seat));
        const nextSeats = [...soldSeats].sort().join(",");

        existingShowtimes[showtimeIndex] = {
          ...currentShowtime,
          soldSeats,
          status: resolveShowtimeStatus(soldSeats),
        };

        ticket.set({ showtimes: existingShowtimes });
        changed = previousSeats !== nextSeats;
      }
    }

    if (!changed) {
      return;
    }

    await ticket.save();
    await new TicketUpdatedPublisher(this.channel).publish({
      id: ticket.id,
      price: ticket.price,
      title: ticket.title,
      userId: ticket.userId,
      version: ticket.version,
    });
  }
}
