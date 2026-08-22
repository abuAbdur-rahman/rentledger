import { model, models, Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    tenancyId: {
      type: Schema.Types.ObjectId,
      ref: "Tenancy",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "failed", "rejected"],
      default: "pending",
      required: true,
      index: true,
    },
    proofUrl: {
      type: String,
      default: null,
      trim: true,
    },
    reference: {
      type: String,
      default: null,
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "payments",
    versionKey: false,
  },
);

paymentSchema.index({ tenancyId: 1, paymentDate: -1 });

export const PaymentModel = models.Payment || model("Payment", paymentSchema);
