import mongoose from "mongoose";

const keySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String },
    fingerprint: { type: String, required: true },
    algorithm: { type: String, required: true },
    expiresAt: { type: Date },
    trustLevel: { type: String, default: "unknown" },
    label: { type: String, default: "" },
  },
  { timestamps: true },
);

const Key = mongoose.model("Key", keySchema);

export default Key;
