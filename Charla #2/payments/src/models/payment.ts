import mongoose from 'mongoose';

interface PaymentAttrs {
  orderId: string;
  stripeId: string;
  checkoutSessionId?: string;
}

interface PaymentDoc extends mongoose.Document {
  orderId: string;
  stripeId: string;
  checkoutSessionId?: string;
}

interface PaymentModel extends mongoose.Model<PaymentDoc> {
  build(attrs: PaymentAttrs): PaymentDoc;
}

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      required: true,
      type: String,
      unique: true,
    },
    stripeId: {
      required: true,
      type: String,
    },
    checkoutSessionId: {
      type: String,
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

paymentSchema.statics.build = (attrs: PaymentAttrs) => {
  return new Payment(attrs);
};

const Payment = mongoose.model<PaymentDoc, PaymentModel>(
  'Payment',
  paymentSchema
);

export { Payment };
