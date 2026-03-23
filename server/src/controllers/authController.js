import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { signAccessToken, signRefreshToken } from "../utils/token.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const setRefreshCookie = (res, token, expiresAt) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isProd,
    path: "/api/auth",
    maxAge: expiresAt - Date.now(),
  });
};

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;
    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ email, passwordHash });
    const access = signAccessToken(user);
    const refresh = signRefreshToken(user);

    user.refreshTokenHash = hashToken(refresh.token);
    user.refreshTokenExpiresAt = new Date(refresh.expiresAt);
    user.lastLoginAt = new Date();
    await user.save();

    setRefreshCookie(res, refresh.token, refresh.expiresAt);

    return res.status(201).json({
      token: access.token,
      expiresAt: access.expiresAt,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    return next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validated.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const access = signAccessToken(user);
    const refresh = signRefreshToken(user);

    user.refreshTokenHash = hashToken(refresh.token);
    user.refreshTokenExpiresAt = new Date(refresh.expiresAt);
    user.lastLoginAt = new Date();
    await user.save();

    setRefreshCookie(res, refresh.token, refresh.expiresAt);

    return res.json({
      token: access.token,
      expiresAt: access.expiresAt,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    return next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.sub);

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isExpired = user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date();
    const matchesHash = user.refreshTokenHash === hashToken(token);

    if (isExpired || !matchesHash) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const access = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshTokenHash = hashToken(refreshToken.token);
    user.refreshTokenExpiresAt = new Date(refreshToken.expiresAt);
    await user.save();

    setRefreshCookie(res, refreshToken.token, refreshToken.expiresAt);

    return res.json({
      token: access.token,
      expiresAt: access.expiresAt,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  return res.json({ message: "Logged out" });
};

export const logoutAll = async (req, res, next) => {
  try {
    req.user.tokenVersion += 1;
    req.user.refreshTokenHash = null;
    req.user.refreshTokenExpiresAt = null;
    await req.user.save();
    res.clearCookie("refreshToken", { path: "/api/auth" });
    return res.json({ message: "Logged out from all devices" });
  } catch (err) {
    return next(err);
  }
};

export const me = async (req, res) => {
  return res.json({
    id: req.user._id,
    email: req.user.email,
    role: req.user.role,
  });
};
