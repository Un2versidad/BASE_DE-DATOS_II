import { ExchangeNames, OrderCreatedEvent } from "@eftickets/common";
import { Ticket } from "../../models/ticket";
import { TicketUpdatedPublisher } from "../publishers/ticket-updated-publisher";
import { Consumer } from "../core/base-consumer";

type OrderCreatedReservationPayload = OrderCreatedEvent["data"] & {
  showtimeId?: string;
  showtimeDate?: string;
  showtimeTime?: string;
  showtimeFormat?: string;
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

export class OrderCreatedListener extends Consumer<OrderCreatedEvent> {
  readonly exchangeName = ExchangeNames.OrderCreated;
  routingKey = "ordersKeyCreate";
  exchangeType = "direct";
  queueName = "ticketsOrdersQueueCreate";

  async onMessage(data: OrderCreatedEvent["data"]) {
    const payload = data as OrderCreatedReservationPayload;
    const ticket = await Ticket.findById(data.ticket.id);

    if (!ticket) {
      throw new Error(
        `[tickets] OrderCreated projection missing ticketId=${data.ticket.id} orderId=${data.id}`
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
        const soldSeats = [
          ...new Set([...(currentShowtime.soldSeats || []), ...seats].map(normalizeSeat)),
        ];
        const previousSeats = [...(currentShowtime.soldSeats || [])]
          .map(normalizeSeat)
          .sort()
          .join(",");
        const nextSeats = [...soldSeats].sort().join(",");

        existingShowtimes[showtimeIndex] = {
          ...currentShowtime,
          soldSeats,
          status: resolveShowtimeStatus(soldSeats),
        };
        changed = previousSeats !== nextSeats;
      } else if (payload.showtimeDate && payload.showtimeTime && payload.showtimeFormat) {
        existingShowtimes.push({
          id: payload.showtimeId,
          date: payload.showtimeDate,
          time: payload.showtimeTime,
          format: payload.showtimeFormat,
          soldSeats: seats,
          status: resolveShowtimeStatus(seats),
        });
        changed = true;
      }

      ticket.set({ showtimes: existingShowtimes });
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
