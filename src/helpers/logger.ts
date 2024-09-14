import { Message } from "node-telegram-bot-api";
import { User } from "../database/users";
import { Logs } from "../database/loggs";

export function logFunction(cb: (msg: Message) => any) {
  return async function (data: Message) {
    try {
      const chatId = data.chat?.id;
      let user = await User.findOne({ chat_id: chatId });
      if (!user) {
        user = await User.create({
          chat_id: chatId,
          first_name: data.chat.first_name,
          last_name: data.chat.last_name,
          username: data.sender_chat?.active_usernames,
          language_code: data.from?.language_code,
        });
      }

      await Logs.create({
        user_id: user._id,
        message_id: data.message_id,
        text: data.text || "",
      });
    } catch (error) {
      console.log(error);
    }

    const result = await cb(data);
    return result;
  };
}
