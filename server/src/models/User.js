import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    twoFactorEnabled: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

const User = mongoose.model("User", userSchema);

export default User;
