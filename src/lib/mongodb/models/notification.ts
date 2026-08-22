import { model, models, Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: null,
      trim: true,
    },
    type: {
      type: String,
      enum: ["payment", "system", "message", "tenancy"],
      default: "system",
      required: true,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "notifications",
    versionKey: false,
  },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const NotificationModel =
  models.Notification || model("Notification", notificationSchema);
