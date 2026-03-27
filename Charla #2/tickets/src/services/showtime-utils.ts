const DEFAULT_SHOWTIME_TIMES = ["13:20", "15:10", "17:45", "19:30", "22:10"];
const DEFAULT_SHOWTIME_FORMATS = ["2D", "3D", "IMAX"];

const CINEMA_DIRECTORY: Record<string, string> = {
  centro: "CineMax Centro",
  norte: "CineMax Norte",
  sur: "CineMax Sur",
  imax: "CineMax IMAX",
};

type ShowtimeInput = {
  id?: unknown;
  cinemaId?: unknown;
  cinemaName?: unknown;
  cinema?: unknown;
  date?: unknown;
  time?: unknown;
  format?: unknown;
  status?: unknown;
  soldSeats?: unknown;
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeSeat = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const inferShowtimeStatus = (inputStatus: string, soldSeatsCount: number) => {
  if (inputStatus) {
    return inputStatus;
  }

  if (soldSeatsCount >= 48) {
    return "agotado";
  }

  if (soldSeatsCount >= 36) {
    return "casi lleno";
  }

  return "disponible";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const buildShowtimeId = (
  showtime: {
    id?: string;
    cinemaId: string;
    date: string;
    time: string;
    format: string;
  },
  index: number
) => {
  if (showtime.id) {
    return showtime.id;
  }

  const base = [showtime.cinemaId, showtime.date, showtime.time, showtime.format]
    .map(slugify)
    .filter(Boolean)
    .join("-");

  return base || `showtime-${index + 1}`;
};

export const normalizeTicketShowtimes = (input: unknown) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((rawShowtime, index) => {
      const showtime = (rawShowtime || {}) as ShowtimeInput;
      const cinemaIdCandidate =
        normalizeString(showtime.cinemaId) || normalizeString(showtime.cinema);
      const cinemaId = cinemaIdCandidate ? cinemaIdCandidate.toLowerCase() : "centro";
      const cinemaName =
        normalizeString(showtime.cinemaName) ||
        CINEMA_DIRECTORY[cinemaId] ||
        "CineMax";
      const date =
        normalizeString(showtime.date) || new Date().toISOString().slice(0, 10);
      const time =
        normalizeString(showtime.time) ||
        DEFAULT_SHOWTIME_TIMES[index % DEFAULT_SHOWTIME_TIMES.length];
      const format =
        normalizeString(showtime.format).toUpperCase() ||
        DEFAULT_SHOWTIME_FORMATS[index % DEFAULT_SHOWTIME_FORMATS.length];
      const soldSeats = Array.isArray(showtime.soldSeats)
        ? [...new Set(showtime.soldSeats.map(normalizeSeat).filter(Boolean))]
        : [];
      const status = inferShowtimeStatus(normalizeString(showtime.status), soldSeats.length);
      const id = buildShowtimeId(
        {
          id: normalizeString(showtime.id),
          cinemaId,
          date,
          time,
          format,
        },
        index
      );

      return {
        id,
        cinemaId,
        cinemaName,
        date,
        time,
        format,
        status,
        soldSeats,
      };
    })
    .sort((left, right) =>
      `${left.date} ${left.time} ${left.cinemaId}`.localeCompare(
        `${right.date} ${right.time} ${right.cinemaId}`
      )
    );
};
