import { Message } from "node-telegram-bot-api";
import { User } from "../database/users";
import { Logs } from "../database/loggs";

export function logFunction(cb: (msg: Message) => any) {
  return async function (data: Message) {
    try {
      const chatId = data.chat?.id;
      let user = await User.findOneAndUpdate({ chatId: chatId }, {});
      console.log(user);
      if (!user) {
        user = await User.create({
          chatId: chatId,
          firstName: data.chat.first_name,
          lastName: data.chat.last_name,
          username: data.sender_chat?.active_usernames,
          languageCode: data.from?.language_code,
        });
      }

      await Logs.create({
        userId: user._id,
        messageId: data.message_id,
        text: data.text || "",
      });
    } catch (error) {
      console.log(error);
    }

    const result = await cb(data);
    return result;
  };
}
