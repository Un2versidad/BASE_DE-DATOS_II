import mongoose from "mongoose";
import { updateIfCurrentPlugin } from "mongoose-update-if-current";
import { OrderStatus } from "@eftickets/common";
import { TicketDoc } from "./ticket";
export { OrderStatus };

interface OrderAttrs {
  userId: string;
  status: OrderStatus;
  expiresAt: Date;
  ticket: TicketDoc;
  cinemaId?: string;
  cinemaName?: string;
  showtimeId: string;
  showtimeDate: string;
  showtimeTime: string;
  showtimeFormat: string;
  seats: string[];
  concessions?: OrderConcessionAttrs[];
  concessionsTotal?: number;
  totalPrice: number;
}

interface OrderConcessionAttrs {
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sizeLabel?: string;
  flavorLabel?: string;
  drinkLabel?: string;
  note?: string;
  locationId?: string;
  locationName?: string;
}

interface OrderDoc extends mongoose.Document {
  userId: string;
  status: OrderStatus;
  expiresAt: Date;
  ticket: TicketDoc;
  cinemaId?: string;
  cinemaName?: string;
  showtimeId?: string;
  showtimeDate?: string;
  showtimeTime?: string;
  showtimeFormat?: string;
  seats: string[];
  concessions: OrderConcessionAttrs[];
  concessionsTotal: number;
  totalPrice: number;
  version: number;
}

interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc;
}

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Created,
    },
    expiresAt: {
      type: mongoose.Schema.Types.Date,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
    },
    cinemaId: {
      type: String,
    },
    cinemaName: {
      type: String,
    },
    showtimeId: {
      type: String,
    },
    showtimeDate: {
      type: String,
    },
    showtimeTime: {
      type: String,
    },
    showtimeFormat: {
      type: String,
    },
    seats: [
      {
        type: String,
      },
    ],
    concessions: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        total: {
          type: Number,
          required: true,
          min: 0,
        },
        sizeLabel: {
          type: String,
          default: "",
        },
        flavorLabel: {
          type: String,
          default: "",
        },
        drinkLabel: {
          type: String,
          default: "",
        },
        note: {
          type: String,
          default: "",
        },
        locationId: {
          type: String,
          default: "",
        },
        locationName: {
          type: String,
          default: "",
        },
      },
    ],
    concessionsTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
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

orderSchema.set("versionKey", "version");
orderSchema.plugin(updateIfCurrentPlugin);

orderSchema.statics.build = (attrs: OrderAttrs) => {
  return new Order(attrs);
};

const Order = mongoose.model<OrderDoc, OrderModel>("Order", orderSchema);

export { Order };
