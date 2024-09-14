import { Message } from "node-telegram-bot-api";

export const withMessageLogger = async (msg: Message) => {
  return msg;
};
