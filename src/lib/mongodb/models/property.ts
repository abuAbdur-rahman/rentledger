import { model, models, Schema } from "mongoose";

const propertySchema = new Schema(
  {
    landlordId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "properties",
    versionKey: false,
  },
);

propertySchema.index({ landlordId: 1, createdAt: -1 });

export const PropertyModel = models.Property || model("Property", propertySchema);
