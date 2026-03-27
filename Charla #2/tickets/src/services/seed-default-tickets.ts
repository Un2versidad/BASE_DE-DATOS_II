import { Ticket } from "../models/ticket";
import { TicketCreatedPublisher } from "../events/publishers/ticket-created-publisher";
import { rabbitWrapper } from "../rabbit-wrapper";
import { normalizeTicketShowtimes } from "./showtime-utils";

const CINEMAS = [
  { id: "centro", name: "CineMax Centro", defaultFormats: ["2D", "3D"] },
  { id: "norte", name: "CineMax Norte", defaultFormats: ["2D", "3D"] },
  { id: "sur", name: "CineMax Sur", defaultFormats: ["2D", "IMAX"] },
  { id: "imax", name: "CineMax IMAX", defaultFormats: ["IMAX"] },
];

const buildShowtimes = (options: {
  startDayOffset?: number;
  primaryFormat: string;
  secondaryFormat?: string;
}) => {
  const dayOffsets = [
    options.startDayOffset ?? 0,
    (options.startDayOffset ?? 0) + 1,
  ];
  const times = ["13:20", "16:05", "19:10", "21:45"];

  return normalizeTicketShowtimes(
    dayOffsets.flatMap((dayOffset, dayIndex) =>
      CINEMAS.flatMap((cinema, cinemaIndex) => {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        const isoDate = date.toISOString().slice(0, 10);
        const firstFormat =
          cinema.defaultFormats.includes(options.primaryFormat)
            ? options.primaryFormat
            : cinema.defaultFormats[0];
        const secondFormat =
          options.secondaryFormat && cinema.defaultFormats.includes(options.secondaryFormat)
            ? options.secondaryFormat
            : cinema.defaultFormats[Math.min(1, cinema.defaultFormats.length - 1)] ||
              firstFormat;

        return [
          {
            cinemaId: cinema.id,
            cinemaName: cinema.name,
            date: isoDate,
            time: times[(cinemaIndex + dayIndex) % times.length],
            format: firstFormat,
            soldSeats:
              cinema.id === "centro" && dayIndex === 0
                ? ["A1", "A2", "B4", "C6"]
                : [],
          },
          {
            cinemaId: cinema.id,
            cinemaName: cinema.name,
            date: isoDate,
            time: times[(cinemaIndex + dayIndex + 2) % times.length],
            format: secondFormat,
            soldSeats:
              cinema.id === "imax" && firstFormat === "IMAX"
                ? ["D7", "D8", "E7", "E8", "F7"]
                : [],
          },
        ];
      })
    )
  );
};

const DEFAULT_TICKETS = [
  {
    title: "Hoppers: Operación Castor",
    price: 8.5,
    showtimes: buildShowtimes({ primaryFormat: "2D", secondaryFormat: "3D" }),
  },
  {
    title: "Boda sangrienta 2",
    price: 8,
    showtimes: buildShowtimes({ startDayOffset: 0, primaryFormat: "IMAX", secondaryFormat: "2D" }),
  },
  {
    title: "Un toque de amor",
    price: 7.5,
    showtimes: buildShowtimes({ startDayOffset: 0, primaryFormat: "2D", secondaryFormat: "3D" }),
  },
  {
    title: "No te olvidaré",
    price: 8,
    showtimes: buildShowtimes({ startDayOffset: 0, primaryFormat: "3D", secondaryFormat: "2D" }),
  },
  {
    title: "Nuremberg: El juicio del siglo",
    price: 9.5,
    showtimes: buildShowtimes({ startDayOffset: 1, primaryFormat: "2D", secondaryFormat: "3D" }),
  },
  {
    title: "Scream 7",
    price: 8.5,
    showtimes: buildShowtimes({ startDayOffset: 1, primaryFormat: "2D", secondaryFormat: "IMAX" }),
  },
  {
    title: "Catástrofe en el mar: Kraken",
    price: 7,
    showtimes: buildShowtimes({ startDayOffset: 1, primaryFormat: "2D", secondaryFormat: "3D" }),
  },
  {
    title: "David",
    price: 7.5,
    showtimes: buildShowtimes({ startDayOffset: 1, primaryFormat: "2D", secondaryFormat: "3D" }),
  },
  {
    title: "El guardián: Último refugio",
    price: 8.5,
    showtimes: buildShowtimes({ startDayOffset: 2, primaryFormat: "2D", secondaryFormat: "IMAX" }),
  },
  {
    title: "La exorcista Esp",
    price: 8,
    showtimes: buildShowtimes({ startDayOffset: 2, primaryFormat: "2D", secondaryFormat: "3D" }),
  },
  {
    title: "BTS WORLD TOUR 'ARIRANG' IN GOYANG OV",
    price: 10,
    showtimes: buildShowtimes({ startDayOffset: 2, primaryFormat: "2D", secondaryFormat: "IMAX" }),
  },
  {
    title: "Super Mario Galaxy: La Película",
    price: 9.5,
    showtimes: buildShowtimes({ startDayOffset: 1, primaryFormat: "3D", secondaryFormat: "IMAX" }),
  },
];

const normalizeTitle = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const publishTicketCreated = async (ticket: {
  id?: string;
  _id?: unknown;
  title: string;
  price: number;
  userId: string;
  version: number;
}) => {
  const ticketId =
    typeof ticket.id === "string" && ticket.id
      ? ticket.id
      : typeof ticket._id === "string"
        ? ticket._id
        : String(ticket._id);

  await new TicketCreatedPublisher(rabbitWrapper.client).publish({
    id: ticketId,
    title: ticket.title,
    price: ticket.price,
    userId: ticket.userId,
    version: ticket.version,
  });
};

export const seedDefaultTicketsIfEmpty = async () => {
  if (process.env.NODE_ENV === "test" || process.env.SEED_DEFAULT_TICKETS === "false") {
    return;
  }

  const existingTickets = await Ticket.find();
  const existingTitles = new Set(
    existingTickets.map((ticket) => normalizeTitle(ticket.title))
  );

  const missingDefaults = DEFAULT_TICKETS.filter(
    (ticket) => !existingTitles.has(normalizeTitle(ticket.title))
  );

  const createdTickets = [];

  for (const ticket of missingDefaults) {
    const createdTicket = Ticket.build({
      ...ticket,
      userId: "cinemax-seed-system",
    });
    await createdTicket.save();
    createdTickets.push(createdTicket);
  }

  const allTickets = [...existingTickets, ...createdTickets];

  for (const ticket of allTickets) {
    await publishTicketCreated(ticket);
  }

  console.log(
    `[tickets] Default cinema titles ready: ${allTickets.length}. Added ${createdTickets.length} missing titles and synced projections.`
  );
};
