import AuditLog from "../models/AuditLog.js";

export const addAudit = async (req, res, next) => {
  try {
    const { action, metadata } = req.validated.body;
    const entry = await AuditLog.create({
      userId: req.user._id,
      action,
      metadata,
      ip: req.ip,
    });

    return res.status(201).json(entry);
  } catch (err) {
    return next(err);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const history = await AuditLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json(history);
  } catch (err) {
    return next(err);
  }
};
