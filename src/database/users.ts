import { Schema, model } from "mongoose";

export interface IUser {
  _id: number;
  chat_id: number;
  is_bot: boolean;
  is_admin: boolean;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
  count_requests: number;
}

const userSchema = new Schema<IUser>(
  {
    chat_id: { type: Number, required: true, unique: true },
    is_bot: { type: Boolean },
    is_admin: { type: Boolean, default: false },
    first_name: { type: String },
    last_name: { type: String },
    username: { type: String },
    language_code: { type: String },
    count_requests: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
