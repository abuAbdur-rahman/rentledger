import { model, models, Schema } from "mongoose";

const tenancySchema = new Schema(
  {
    tenantId: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "terminated"],
      default: "pending",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    nextDueDate: {
      type: Date,
      default: null,
    },
    rentCycle: {
      type: String,
      enum: ["annual", "monthly"],
      default: "annual",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "tenancies",
    versionKey: false,
  },
);

tenancySchema.index({ tenantId: 1, status: 1 });

export const TenancyModel = models.Tenancy || model("Tenancy", tenancySchema);
