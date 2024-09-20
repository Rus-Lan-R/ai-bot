import { Schema, model } from "mongoose";

export interface IUser {
  _id: number;
  chatId: number;
  isBot: boolean;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
  username: string;
  languageCode: string;
}

const userSchema = new Schema<IUser>(
  {
    chatId: { type: Number, required: true, unique: true },
    isBot: { type: Boolean },
    isAdmin: { type: Boolean, default: false },
    firstName: { type: String },
    lastName: { type: String },
    username: { type: String },
    languageCode: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
