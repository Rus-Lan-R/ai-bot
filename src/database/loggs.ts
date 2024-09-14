import { Schema, model, ObjectId } from "mongoose";

interface ILog {
  user_id: typeof Schema.Types.ObjectId;
  message_id: number;
  date: number;
  text: string;
}

const LogsShema = new Schema<ILog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User" },
    message_id: { type: Number },
    date: { type: Number },
    text: { type: String },
  },
  { timestamps: true }
);

export const Logs = model<ILog>("Log", LogsShema);
