import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("email role createdAt")
      .sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    return next(err);
  }
};

export const listSecurityEvents = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
    return res.json(logs);
  } catch (err) {
    return next(err);
  }
};
