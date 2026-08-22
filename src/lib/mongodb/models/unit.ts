import { model, models, Schema } from "mongoose";

const unitSchema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: "units",
    versionKey: false,
  },
);

unitSchema.index({ propertyId: 1, name: 1 }, { unique: true });

export const UnitModel = models.Unit || model("Unit", unitSchema);
