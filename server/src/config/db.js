import mongoose from "mongoose";

export const connectDb = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });
};
