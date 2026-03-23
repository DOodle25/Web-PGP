export const validate = (schema) => (req, res, next) => {
  try {
    const payload = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    req.validated = payload;
    return next();
  } catch (err) {
    return res
      .status(400)
      .json({ message: "Validation failed", errors: err.errors });
  }
};
