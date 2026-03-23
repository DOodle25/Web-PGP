import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub);

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
