import mongoose from "mongoose";

type EntryPassEventAction = "ISSUE" | "REISSUE" | "REVOKE" | "CHECK_IN";

interface EntryPassEvent {
  action: EntryPassEventAction;
  at: Date;
  by?: string | null;
  note?: string | null;
}

interface EntryPassAttrs {
  orderId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  issuedAt: Date;
  usedAt?: Date | null;
  revokedAt?: Date | null;
  revokedBy?: string | null;
  revokedReason?: string | null;
  events?: EntryPassEvent[];
}

interface EntryPassDoc extends mongoose.Document {
  orderId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  issuedAt: Date;
  usedAt?: Date | null;
  revokedAt?: Date | null;
  revokedBy?: string | null;
  revokedReason?: string | null;
  events: EntryPassEvent[];
}

interface EntryPassModel extends mongoose.Model<EntryPassDoc> {
  build(attrs: EntryPassAttrs): EntryPassDoc;
}

const entryPassSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    issuedAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: String,
      default: null,
    },
    revokedReason: {
      type: String,
      default: null,
      maxlength: 200,
    },
    events: [
      {
        action: {
          type: String,
          enum: ["ISSUE", "REISSUE", "REVOKE", "CHECK_IN"],
          required: true,
        },
        at: {
          type: Date,
          required: true,
        },
        by: {
          type: String,
          default: null,
        },
        note: {
          type: String,
          default: null,
          maxlength: 200,
        },
      },
    ],
  },
  {
    toJSON: {
      transform(_doc, ret) {
        const serialized = ret as Record<string, unknown>;
        serialized["id"] = serialized["_id"];
        delete serialized["_id"];
      },
    },
  }
);

entryPassSchema.statics.build = (attrs: EntryPassAttrs) => {
  return new EntryPass(attrs);
};

const EntryPass = mongoose.model<EntryPassDoc, EntryPassModel>(
  "EntryPass",
  entryPassSchema
);

export { EntryPass, EntryPassDoc };
