import jwt from "jsonwebtoken";

export const signAccessToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    tokenVersion: user.tokenVersion,
    role: user.role,
    type: "access",
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });
  const decoded = jwt.decode(token);

  return { token, expiresAt: decoded.exp * 1000 };
};

export const signRefreshToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    tokenVersion: user.tokenVersion,
    type: "refresh",
  };

  const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  });
  const decoded = jwt.decode(token);

  return { token, expiresAt: decoded.exp * 1000 };
};
