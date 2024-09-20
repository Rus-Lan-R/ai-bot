import { Schema, model } from "mongoose";

interface ILog {
  userId: typeof Schema.Types.ObjectId;
  messageId: number;
  date: number;
  text: string;
}

const LogsShema = new Schema<ILog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    messageId: { type: Number },
    date: { type: Number },
    text: { type: String },
  },
  { timestamps: true }
);

export const Logs = model<ILog>("Log", LogsShema);
