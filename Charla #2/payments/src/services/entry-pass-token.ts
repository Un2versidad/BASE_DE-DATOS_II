import crypto from "crypto";

interface EntryPassTokenPayload {
  orderId: string;
  userId: string;
  exp: number;
  nonce: string;
}

const encodePayload = (payload: EntryPassTokenPayload): string => {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
};

const decodePayload = (encodedPayload: string): EntryPassTokenPayload | null => {
  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<EntryPassTokenPayload>;

    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.nonce !== "string"
    ) {
      return null;
    }

    return {
      orderId: parsed.orderId,
      userId: parsed.userId,
      exp: parsed.exp,
      nonce: parsed.nonce,
    };
  } catch {
    return null;
  }
};

const signPayload = (encodedPayload: string, secret: string): string => {
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
};

const getSecret = (): string => {
  const secret = process.env.ENTRY_PASS_SECRET;
  if (!secret) {
    throw new Error("ENTRY_PASS_SECRET must be defined");
  }

  return secret;
};

export const createEntryPassToken = (
  orderId: string,
  userId: string,
  expiresAt: Date
): string => {
  const payload: EntryPassTokenPayload = {
    orderId,
    userId,
    exp: expiresAt.getTime(),
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload, getSecret());
  return `${encodedPayload}.${signature}`;
};

export const verifyEntryPassToken = (
  token: string
): EntryPassTokenPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return null;
  }

  const tokenPartPattern = /^[A-Za-z0-9_-]+$/;
  if (!tokenPartPattern.test(encodedPayload) || !tokenPartPattern.test(signature)) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, getSecret());

  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  return decodePayload(encodedPayload);
};

export const hashEntryPassToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
