import Key from "../models/Key.js";

export const listKeys = async (req, res, next) => {
  try {
    const keys = await Key.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    return res.json(keys);
  } catch (err) {
    return next(err);
  }
};

export const createKey = async (req, res, next) => {
  try {
    const {
      publicKey,
      encryptedPrivateKey,
      fingerprint,
      algorithm,
      expiresAt,
      trustLevel,
      label,
    } = req.validated.body;

    const key = await Key.create({
      userId: req.user._id,
      publicKey,
      encryptedPrivateKey,
      fingerprint,
      algorithm,
      expiresAt,
      trustLevel,
      label,
    });

    return res.status(201).json(key);
  } catch (err) {
    return next(err);
  }
};

export const updateKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { expiresAt, trustLevel, label } = req.validated.body;

    const key = await Key.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { expiresAt, trustLevel, label },
      { new: true },
    );

    if (!key) {
      return res.status(404).json({ message: "Key not found" });
    }

    return res.json(key);
  } catch (err) {
    return next(err);
  }
};

export const deleteKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const key = await Key.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!key) {
      return res.status(404).json({ message: "Key not found" });
    }

    return res.json({ message: "Key deleted" });
  } catch (err) {
    return next(err);
  }
};

export const getKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const key = await Key.findOne({ _id: id, userId: req.user._id });

    if (!key) {
      return res.status(404).json({ message: "Key not found" });
    }

    return res.json(key);
  } catch (err) {
    return next(err);
  }
};
