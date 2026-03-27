import mongoose from "mongoose";

interface RefreshTokenAttrs {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdByIp?: string;
  userAgent?: string;
  revokedAt?: Date | null;
  replacedByTokenHash?: string | null;
}

export interface RefreshTokenDoc extends mongoose.Document {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdByIp?: string;
  userAgent?: string;
  revokedAt?: Date | null;
  replacedByTokenHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RefreshTokenModel extends mongoose.Model<RefreshTokenDoc> {
  build(attrs: RefreshTokenAttrs): RefreshTokenDoc;
}

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    createdByIp: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const serialized = ret as Record<string, unknown>;
        serialized["id"] = serialized["_id"];
        delete serialized["_id"];
        delete serialized["__v"];
      },
    },
  }
);

refreshTokenSchema.statics.build = (attrs: RefreshTokenAttrs) => {
  return new RefreshToken(attrs);
};

const RefreshToken = mongoose.model<RefreshTokenDoc, RefreshTokenModel>(
  "RefreshToken",
  refreshTokenSchema
);

export { RefreshToken };
