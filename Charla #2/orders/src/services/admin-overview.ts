import mongoose from "mongoose";
import { OrderStatus } from "../models/order";

const MAX_RANGE_DAYS = 180;
const DEFAULT_RANGE_DAYS = 30;
const UNKNOWN_CINEMA = "Sin sede asignada";
const UNKNOWN_FORMAT = "Formato pendiente";

type AdminOverviewQuery = {
  days?: unknown;
};

type OrderLike = {
  _id?: unknown;
  id?: string;
  userId?: string;
  status?: string;
  expiresAt?: Date | string;
  ticket?: {
    title?: string;
    price?: number;
  };
  cinemaName?: string;
  showtimeFormat?: string;
  seats?: string[];
  concessions?: Array<{
    title?: string;
    quantity?: number;
    total?: number;
  }>;
  concessionsTotal?: number;
  totalPrice?: number;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const roundPercentage = (value: number) => Math.round(value * 10) / 10;

const clampDays = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_RANGE_DAYS;
  }

  return Math.min(Math.floor(parsed), MAX_RANGE_DAYS);
};

const getRangeDays = (query: AdminOverviewQuery) => clampDays(query.days);

const getRangeWindow = (days: number) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat("es-PA", {
    month: "short",
    day: "2-digit",
  }).format(date);

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
};

const isFallbackCinema = (value: string) => value === UNKNOWN_CINEMA;
const isFallbackFormat = (value: string) => value === UNKNOWN_FORMAT;

const getObjectIdTimestamp = (value: unknown): Date | null => {
  if (
    value &&
    typeof value === "object" &&
    "getTimestamp" in value &&
    typeof (value as { getTimestamp?: unknown }).getTimestamp === "function"
  ) {
    const timestamp = (value as { getTimestamp: () => Date }).getTimestamp();
    if (timestamp instanceof Date && !Number.isNaN(timestamp.getTime())) {
      return timestamp;
    }
  }

  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value).getTimestamp();
  }

  return null;
};

const getOrderCreatedAt = (order: OrderLike): Date => {
  const timestamp =
    getObjectIdTimestamp((order as { _id?: unknown })._id) ||
    getObjectIdTimestamp((order as { id?: unknown }).id);

  if (timestamp) {
    return timestamp;
  }

  const expiresAt = order.expiresAt ? new Date(order.expiresAt) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
    return expiresAt;
  }

  return new Date();
};

const isGuestOrder = (userId: unknown) =>
  typeof userId === "string" && userId.trim().startsWith("guest_");

const getConfirmedRevenue = (order: OrderLike) =>
  order.status === OrderStatus.Complete ? Number(order.totalPrice || 0) : 0;

const getTicketRevenue = (order: OrderLike) =>
  order.status === OrderStatus.Complete
    ? roundMoney(Number(order.totalPrice || 0) - Number(order.concessionsTotal || 0))
    : 0;

const buildEmptyDailyBuckets = (days: number, start: Date) => {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date: formatDateKey(date),
      label: formatDateLabel(date),
      orders: 0,
      completed: 0,
      cancelled: 0,
      confirmedRevenue: 0,
      averageOrderValue: 0,
      _rawValue: 0,
    };
  });
};

const statusLabelMap: Record<string, string> = {
  [OrderStatus.Created]: "Creada",
  [OrderStatus.AwaitingPayment]: "Pendiente de pago",
  [OrderStatus.Complete]: "Completada",
  [OrderStatus.Cancelled]: "Cancelada",
};

export const buildAdminOrderOverview = (
  orders: OrderLike[],
  query: AdminOverviewQuery = {}
) => {
  const days = getRangeDays(query);
  const { start, end } = getRangeWindow(days);

  const inRangeOrders = orders.filter((order) => {
    const createdAt = getOrderCreatedAt(order);
    return createdAt >= start && createdAt <= end;
  });

  const dailyBuckets = buildEmptyDailyBuckets(days, start);
  const dailyIndex = new Map(dailyBuckets.map((bucket) => [bucket.date, bucket]));

  const statusMap = new Map<
    string,
    { status: string; label: string; count: number; totalValue: number }
  >();
  const movieMap = new Map<
    string,
    {
      title: string;
      orders: number;
      completed: number;
      confirmedRevenue: number;
      seats: number;
      concessionsAttached: number;
    }
  >();
  const cinemaMap = new Map<
    string,
    {
      name: string;
      orders: number;
      completed: number;
      confirmedRevenue: number;
      concessionsAttached: number;
      totalValue: number;
    }
  >();
  const formatMap = new Map<
    string,
    { format: string; orders: number; completed: number; confirmedRevenue: number; seats: number }
  >();
  const concessionMap = new Map<
    string,
    { title: string; orders: number; quantity: number; revenue: number }
  >();

  let totalSeats = 0;
  let guestOrders = 0;
  let registeredOrders = 0;
  let completedOrders = 0;
  let activeOrders = 0;
  let cancelledOrders = 0;
  let awaitingPaymentOrders = 0;
  let concessionsAttached = 0;
  let grossRevenue = 0;
  let ticketRevenue = 0;
  let concessionsRevenue = 0;
  let totalOrderValue = 0;

  for (const order of inRangeOrders) {
    const createdAt = getOrderCreatedAt(order);
    const bucketKey = formatDateKey(createdAt);
    const bucket = dailyIndex.get(bucketKey);
    const seatsCount = Array.isArray(order.seats) ? order.seats.length : 0;
    const orderTotal = Number(order.totalPrice || 0);
    const orderConcessionsTotal = Number(order.concessionsTotal || 0);
    const confirmedRevenue = getConfirmedRevenue(order);
    const confirmedTicketRevenue = getTicketRevenue(order);
    const movieTitle = normalizeText(order.ticket?.title, "Película sin título");
    const cinemaName = normalizeText(order.cinemaName, UNKNOWN_CINEMA);
    const showtimeFormat = normalizeText(order.showtimeFormat, UNKNOWN_FORMAT);
    const concessions = Array.isArray(order.concessions) ? order.concessions : [];
    const hasConcessions = concessions.length > 0;
    const status = normalizeText(order.status, "unknown");

    totalSeats += seatsCount;
    totalOrderValue += orderTotal;

    if (isGuestOrder(order.userId)) {
      guestOrders += 1;
    } else {
      registeredOrders += 1;
    }

    if (status === OrderStatus.Complete) {
      completedOrders += 1;
      grossRevenue += confirmedRevenue;
      ticketRevenue += confirmedTicketRevenue;
      concessionsRevenue += orderConcessionsTotal;
    } else if (status === OrderStatus.Cancelled) {
      cancelledOrders += 1;
    } else if (status === OrderStatus.AwaitingPayment) {
      awaitingPaymentOrders += 1;
      activeOrders += 1;
    } else {
      activeOrders += 1;
    }

    if (hasConcessions) {
      concessionsAttached += 1;
    }

    if (bucket) {
      bucket.orders += 1;
      bucket._rawValue += orderTotal;
      bucket.confirmedRevenue = roundMoney(bucket.confirmedRevenue + confirmedRevenue);
      if (status === OrderStatus.Complete) {
        bucket.completed += 1;
      }
      if (status === OrderStatus.Cancelled) {
        bucket.cancelled += 1;
      }
    }

    const statusEntry = statusMap.get(status) || {
      status,
      label: statusLabelMap[status] || status,
      count: 0,
      totalValue: 0,
    };
    statusEntry.count += 1;
    statusEntry.totalValue = roundMoney(statusEntry.totalValue + orderTotal);
    statusMap.set(status, statusEntry);

    const movieEntry = movieMap.get(movieTitle) || {
      title: movieTitle,
      orders: 0,
      completed: 0,
      confirmedRevenue: 0,
      seats: 0,
      concessionsAttached: 0,
    };
    movieEntry.orders += 1;
    movieEntry.completed += status === OrderStatus.Complete ? 1 : 0;
    movieEntry.confirmedRevenue = roundMoney(movieEntry.confirmedRevenue + confirmedRevenue);
    movieEntry.seats += seatsCount;
    movieEntry.concessionsAttached += hasConcessions ? 1 : 0;
    movieMap.set(movieTitle, movieEntry);

    const cinemaEntry = cinemaMap.get(cinemaName) || {
      name: cinemaName,
      orders: 0,
      completed: 0,
      confirmedRevenue: 0,
      concessionsAttached: 0,
      totalValue: 0,
    };
    cinemaEntry.orders += 1;
    cinemaEntry.completed += status === OrderStatus.Complete ? 1 : 0;
    cinemaEntry.confirmedRevenue = roundMoney(cinemaEntry.confirmedRevenue + confirmedRevenue);
    cinemaEntry.concessionsAttached += hasConcessions ? 1 : 0;
    cinemaEntry.totalValue = roundMoney(cinemaEntry.totalValue + orderTotal);
    cinemaMap.set(cinemaName, cinemaEntry);

    const formatEntry = formatMap.get(showtimeFormat) || {
      format: showtimeFormat,
      orders: 0,
      completed: 0,
      confirmedRevenue: 0,
      seats: 0,
    };
    formatEntry.orders += 1;
    formatEntry.completed += status === OrderStatus.Complete ? 1 : 0;
    formatEntry.confirmedRevenue = roundMoney(formatEntry.confirmedRevenue + confirmedRevenue);
    formatEntry.seats += seatsCount;
    formatMap.set(showtimeFormat, formatEntry);

    if (hasConcessions) {
      for (const concession of concessions) {
        const title = normalizeText(concession?.title, "Producto sin nombre");
        const concessionEntry = concessionMap.get(title) || {
          title,
          orders: 0,
          quantity: 0,
          revenue: 0,
        };
        concessionEntry.orders += 1;
        concessionEntry.quantity += Number(concession?.quantity || 0);
        concessionEntry.revenue = roundMoney(
          concessionEntry.revenue + Number(concession?.total || 0)
        );
        concessionMap.set(title, concessionEntry);
      }
    }
  }

  const totalOrders = inRangeOrders.length;
  const safeTotalOrders = totalOrders || 1;

  const overview = {
    totalOrders,
    activeOrders,
    completedOrders,
    cancelledOrders,
    awaitingPaymentOrders,
    concessionsAttached,
    guestOrders,
    registeredOrders,
    grossRevenue: roundMoney(grossRevenue),
    ticketRevenue: roundMoney(ticketRevenue),
    concessionsRevenue: roundMoney(concessionsRevenue),
    averageOrderValue: roundMoney(totalOrders > 0 ? totalOrderValue / totalOrders : 0),
    averageSeatsPerOrder: roundPercentage(totalOrders > 0 ? totalSeats / totalOrders : 0),
    completionRate: roundPercentage((completedOrders / safeTotalOrders) * 100),
    concessionsAttachRate: roundPercentage((concessionsAttached / safeTotalOrders) * 100),
    cancellationRate: roundPercentage((cancelledOrders / safeTotalOrders) * 100),
  };

  const ordersByDay = dailyBuckets.map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    orders: bucket.orders,
    completed: bucket.completed,
    cancelled: bucket.cancelled,
    confirmedRevenue: bucket.confirmedRevenue,
    averageOrderValue:
      bucket.orders > 0 ? roundMoney(bucket._rawValue / bucket.orders) : 0,
  }));

  const statusBreakdown = Array.from(statusMap.values())
    .sort((left, right) => right.count - left.count)
    .map((entry) => ({
      ...entry,
      share: roundPercentage((entry.count / safeTotalOrders) * 100),
    }));

  const topMovies = Array.from(movieMap.values())
    .sort((left, right) =>
      right.confirmedRevenue === left.confirmedRevenue
        ? right.orders - left.orders
        : right.confirmedRevenue - left.confirmedRevenue
    )
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      concessionsAttachRate: roundPercentage(
        (entry.concessionsAttached / Math.max(1, entry.orders)) * 100
      ),
    }));

  const cinemaBreakdown = Array.from(cinemaMap.values())
    .map((entry) => ({
      ...entry,
      averageOrderValue: roundMoney(entry.orders > 0 ? entry.totalValue / entry.orders : 0),
      concessionsAttachRate: roundPercentage(
        (entry.concessionsAttached / Math.max(1, entry.orders)) * 100
      ),
    }))
    .sort((left, right) => {
      const leftFallback = isFallbackCinema(left.name);
      const rightFallback = isFallbackCinema(right.name);

      if (leftFallback !== rightFallback) {
        return leftFallback ? 1 : -1;
      }

      if (right.orders !== left.orders) {
        return right.orders - left.orders;
      }

      return right.confirmedRevenue - left.confirmedRevenue;
    });

  const formatBreakdown = Array.from(formatMap.values())
    .map((entry) => ({
      ...entry,
      averageSeats: roundPercentage(entry.orders > 0 ? entry.seats / entry.orders : 0),
    }))
    .sort((left, right) => {
      const leftFallback = isFallbackFormat(left.format);
      const rightFallback = isFallbackFormat(right.format);

      if (leftFallback !== rightFallback) {
        return leftFallback ? 1 : -1;
      }

      if (right.orders !== left.orders) {
        return right.orders - left.orders;
      }

      return right.confirmedRevenue - left.confirmedRevenue;
    });

  const topConcessions = Array.from(concessionMap.values())
    .sort((left, right) =>
      right.revenue === left.revenue
        ? right.quantity - left.quantity
        : right.revenue - left.revenue
    )
    .slice(0, 8);

  const ticketMix = [
    {
      segment: "Registrado",
      orders: registeredOrders,
      confirmedRevenue: roundMoney(
        inRangeOrders
          .filter((order) => !isGuestOrder(order.userId) && order.status === OrderStatus.Complete)
          .reduce((total, order) => total + Number(order.totalPrice || 0), 0)
      ),
    },
    {
      segment: "Invitado",
      orders: guestOrders,
      confirmedRevenue: roundMoney(
        inRangeOrders
          .filter((order) => isGuestOrder(order.userId) && order.status === OrderStatus.Complete)
          .reduce((total, order) => total + Number(order.totalPrice || 0), 0)
      ),
    },
  ];

  const bestMovie = topMovies[0];
  const busiestCinema =
    cinemaBreakdown.find((entry) => !isFallbackCinema(entry.name)) || cinemaBreakdown[0];
  const strongestConcession = topConcessions[0];
  const missingCinemaOrders =
    cinemaMap.get(UNKNOWN_CINEMA)?.orders || 0;

  const insights = [
    {
      id: "completion-rate",
      label: "Conversión a pago",
      value: `${overview.completionRate}%`,
      detail:
        overview.completedOrders > 0
          ? `${overview.completedOrders} orden(es) se concretaron dentro del rango analizado.`
          : "Aún no hay órdenes completadas en el rango analizado.",
    },
    {
      id: "concessions-attach",
      label: "Attach rate de dulcería",
      value: `${overview.concessionsAttachRate}%`,
      detail:
        overview.concessionsAttached > 0
          ? `${overview.concessionsAttached} orden(es) añadieron productos de dulcería.`
          : "La dulcería todavía no se ha anexado a órdenes en este rango.",
    },
    {
      id: "top-movie",
      label: "Película más fuerte",
      value: bestMovie?.title || "Sin datos",
      detail: bestMovie
        ? `${bestMovie.orders} orden(es) y ${bestMovie.seats} asiento(s) reservados.`
        : "No hay suficiente actividad para rankear cartelera todavía.",
    },
    {
      id: "top-cinema",
      label: "Sede más activa",
      value: busiestCinema?.name || "Sin datos",
      detail: busiestCinema
        ? `${busiestCinema.orders} orden(es) y USD ${busiestCinema.confirmedRevenue.toFixed(2)} confirmados.${
            missingCinemaOrders > 0
              ? ` ${missingCinemaOrders} orden(es) aún no traen sede normalizada.`
              : ""
          }`
        : "Aún no hay actividad suficiente para comparar sedes.",
    },
    {
      id: "top-concession",
      label: "Producto más vendido",
      value: strongestConcession?.title || "Sin datos",
      detail: strongestConcession
        ? `${strongestConcession.quantity} unidad(es) y USD ${strongestConcession.revenue.toFixed(
            2
          )} en ingresos de dulcería.`
        : "Todavía no hay productos de dulcería vendidos en este rango.",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    range: {
      days,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      label: `Últimos ${days} día(s)`,
    },
    overview,
    ordersByDay,
    statusBreakdown,
    topMovies,
    cinemaBreakdown,
    formatBreakdown,
    topConcessions,
    ticketMix,
    insights,
  };
};
