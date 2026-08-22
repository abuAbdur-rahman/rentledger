import { model, models, Schema } from "mongoose";

const profileSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
      index: true,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    phoneNumber: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["landlord", "tenant"],
      default: "tenant",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "profiles",
    versionKey: false,
  },
);

const existingProfileModel = models.Profile;

// In dev HMR, an older compiled schema can stay cached and drop new auth fields.
if (existingProfileModel) {
  const hasEmailField = !!existingProfileModel.schema.path("email");
  const hasPasswordHashField = !!existingProfileModel.schema.path("passwordHash");

  if (!hasEmailField || !hasPasswordHashField) {
    delete models.Profile;
  }
}

export const ProfileModel = models.Profile || model("Profile", profileSchema);
