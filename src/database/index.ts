import mongoose from "mongoose";
const dbConnectionURL = process.env.DB_HOST || "";

export const connect = () => mongoose.connect(dbConnectionURL, {});

const disconnect = () => {
  mongoose.disconnect();
};
