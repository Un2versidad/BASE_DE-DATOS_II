const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const getFormatExtra = (format: string) => {
  const normalizedFormat = format.trim().toUpperCase();

  if (normalizedFormat.includes("IMAX")) {
    return 2.5;
  }

  if (normalizedFormat.includes("3D")) {
    return 1;
  }

  return 0;
};

const normalizeText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export const normalizeConcessions = (input: unknown) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const rawQuantity = Number((item as { quantity?: unknown })?.quantity);
      const rawUnitPrice = Number((item as { unitPrice?: unknown })?.unitPrice);

      if (!Number.isFinite(rawQuantity) || rawQuantity < 1) {
        return null;
      }

      if (!Number.isFinite(rawUnitPrice) || rawUnitPrice < 0) {
        return null;
      }

      const quantity = Math.max(1, Math.floor(rawQuantity));
      const unitPrice = roundMoney(rawUnitPrice);
      const title = normalizeText((item as { title?: unknown })?.title, 120);

      if (!title) {
        return null;
      }

      return {
        title,
        quantity,
        unitPrice,
        total: roundMoney(unitPrice * quantity),
        sizeLabel: normalizeText((item as { sizeLabel?: unknown })?.sizeLabel, 80),
        flavorLabel: normalizeText((item as { flavorLabel?: unknown })?.flavorLabel, 120),
        drinkLabel: normalizeText((item as { drinkLabel?: unknown })?.drinkLabel, 120),
        note: normalizeText((item as { note?: unknown })?.note, 240),
        locationId: normalizeText((item as { locationId?: unknown })?.locationId, 32),
        locationName: normalizeText((item as { locationName?: unknown })?.locationName, 120),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const calculateOrderTotals = (options: {
  ticketPrice: number;
  showtimeFormat: string;
  seatsCount: number;
  concessions: Array<{ total: number }>;
}) => {
  const seatQuantity = Math.max(1, options.seatsCount);
  const seatsTotal = roundMoney(
    (options.ticketPrice + getFormatExtra(options.showtimeFormat)) * seatQuantity
  );
  const concessionsTotal = roundMoney(
    options.concessions.reduce((total, item) => total + Number(item.total || 0), 0)
  );

  return {
    seatsTotal,
    concessionsTotal,
    totalPrice: roundMoney(seatsTotal + concessionsTotal),
  };
};
